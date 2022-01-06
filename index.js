/*const Dictionary = require("oxford-dictionary");

var dict = new Dictionary({
    app_id: "",
    app_key: "",
    source_lang: "en-us"
})*/

const googleDictionaryApi = require("google-dictionary-api");
const fs = require("fs");
global.paths = {};

function manageData(fileName, defaultValue = {}) {
    const saveInterval = 5; // Save interval in SECONDS
    var autosaveNotification = false;
    if (!fs.existsSync("./data")) {
        fs.mkdir("./data/", (err) => {
            if (err) console.error
        })
    }
    try {
        global.paths[fileName] = JSON.parse(fs.readFileSync(`./data/${fileName}.json`, "utf8"));
    }
    catch (e) {
        global.paths[fileName] = {};
        fs.writeFile(`./data/${fileName}.json`, JSON.stringify(global.paths[fileName]), err => {
            if (err) return console.log(err.stack)
        });
        console.log("[!] File created: ".green + `/data/${fileName}.json`.yellow);
        console.log("[!] Please do not modify this file unless you know what you're doing!");
    }

    for (var ID in global.paths[fileName]) {
        for (var data1 in defaultValue) {
            if (!global.paths[fileName][ID][data1]) global.paths[fileName][ID][data1] = defaultValue[data1];
        }
    }
}

manageData("dictionaryCache");


async function diagram(input) {
    var filtered = input.toLowerCase().split(" ");

    var words = [];
    var diagram = [];
    // diagram (array) -> sentence (array) -> word (object) -> modifiers

    for (var i = filtered.length - 1; i >= 0; i--) {
        var word = filtered[i];
        words.unshift({
            word: word,
            type: "unknown",
            modifiers: [],
            meaning: null,
            locked: false
        });
    }


    for (var i = 0; i < words.length; i++) {
        var word = words[i];

        if (!paths.dictionaryCache.hasOwnProperty(word.word)) {
            var dWord = await googleDictionaryApi.search(word.word, "en").catch(console.error);
            if (dWord)
                paths.dictionaryCache[word.word] = dWord[0].meaning;
            else
                paths.dictionaryCache[word.word] = null;
        }
        
        word.meaning = paths.dictionaryCache[word.word];
    }
    
    fs.writeFile(`./data/dictionaryCache.json`, JSON.stringify(global.paths["dictionaryCache"]), err => {
        if (err) return console.log(err.stack)
    });
    
    var patterns = [
        {
            modifier: "adjective",
            modified: "noun"
        },
        {
            modifier: "adverb",
            modified: "verb"
        },
        {
            modifier: "determiner",
            modified: "noun"
        }
    ]
    
    var changes = 1;
    while (changes > 0) {
        changes = 0;
        for (var i = words.length - 2; i >= 0; i--) {
            var word = words[i];
            var nextWord = words[i + 1];

            if (!word.meaning || !nextWord.meaning) continue;
            var pattern = patterns.find(pattern => word.meaning.hasOwnProperty(pattern.modifier) && nextWord.meaning.hasOwnProperty(pattern.modified));
            if (!pattern) continue;
            if (!["unknown", pattern.modifier].includes(word.type) || !["unknown", pattern.modified].includes(nextWord.type)) continue;
            word.type = pattern.modifier;
            nextWord.type = pattern.modified;
            nextWord.modifiers.push(word.word)
            words.splice(i, 1);
            changes++;
        }
    }
    
    patterns = [
        {
            modifier: "adverb",
            modified: "verb",
            blocker: "noun",
            locks: false,
            override: false
        },
        {
            modifier: "noun",
            modified: "preposition",
            blocker: null,
            locks: true,
            override: false
        },
        {
            modifier: "preposition",
            modified: "preposition",
            blocker: null,
            locks: false,
            override: true
        },
        {
            modifier: "preposition",
            modified: "verb",
            blocker: null,
            locks: false,
            override: true
        }
    ]
    
    changes = 1;
    while (changes > 0) {
        changes = 0;
        for (var x = 0; x < patterns.length; x++) {
            var pattern = patterns[x];
            for (var i = 1; i < words.length; i++) {
                var word = words[i];
                var lastWord = words[i - 1];

                if (!word.meaning || !lastWord.meaning) continue;
                if (!(word.meaning.hasOwnProperty(pattern.modifier) && lastWord.meaning.hasOwnProperty(pattern.modified)) || (pattern.blocker && words[i + 1] && words[i + 1].meaning && words[i + 1].meaning.hasOwnProperty(pattern.blocker))) continue;
                if (!["unknown", pattern.modifier].includes(word.type) || !["unknown", pattern.modified].includes(lastWord.type)) continue;
                if (lastWord.locked && !pattern.override) continue;
                if (pattern.locks)
                    lastWord.locked = true;
                word.type = pattern.modifier;
                lastWord.type = pattern.modified;
                lastWord.modifiers.push(word.word);
                words.splice(i, 1);
                changes++;
            }
        }
    }

    return words;
}

//diagram("the baby noisily slurped mashed bananas from a spoon");
/*diagram("Jacky ran across the slippery deck of the ship and Jaimy watched very anxiously").then(result => {
    console.log(result);
})*/
diagram("Forecasting technologies are more sophisticated and forecasters are better trained but weather predictions are still not very reliable").then(result => {
    console.log(result);
})