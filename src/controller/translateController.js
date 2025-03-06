import axios from "axios";
import Vocabulary from "../models/vocabulary.js";

const translate = async (text, target, goal) => {
    try {
        const response = await axios.get("https://api.mymemory.translated.net/get", {
            params: {
                q: text,
                langpair: `${goal}|${target}`, // Dịch từ tiếng Anh sang Việt
            },
        });
        return response.data.responseData.translatedText;
    } catch (error) {
        return (`error translation: ${error.message}`)
    }
}
const handleTranslate = async (req, res) => {
    let text = req.body.text;
    const target = "vi";
    const goal = "en";
    try {
        const translation = await translate(text, target, goal);
        res.json({ translation });
    } catch (error) {
        res.status(500).json({ error: "Translate failed", details: error.message });
    }
};
// const handleTranslate = async (req, res) => {
//     let text = req.body.text;
//     const target = "vi";
//     try {
//         const response = await axios.get("https://api.mymemory.translated.net/get", {
//             params: {
//                 q: text,
//                 langpair: `en|${target}`, // Dịch từ tiếng Anh sang Việt
//             },
//         });

//         const translation = response.data.responseData.translatedText;

//         res.json({ translation });
//     } catch (error) {
//         res.status(500).json({ error: "Translate failed", details: error.message });
//     }
// };

const handleSaveVocabulary = async (req, res) => {
    const { word, phonetic, meanings } = req.body;
    if (!word || !meanings) {
        return res.status(400).json({ error: "Missing required fields" });
    }
    let existingWord = await Vocabulary.findOne({ word });
    if (existingWord) {
        return res.json({ message: "Word already exists", data: existingWord });
    }
    const newVocabulart = new Vocabulary({
        word: word,
        phonetic: phonetic,
        meanings: meanings,
    })
    await newVocabulart.save();
    console.log("Saved word:", newVocabulart);
    return res.json({ message: "Word saved successfully", data: newVocabulart });
}

const handleFindVocabulary = async (req, res) => {
    let word = req.body.word;
    if (!word) {
        return res.status(400).json({ error: "Missing 'word' language" })
    }
    try {
        const response = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        const data = response.data[0];
        console.log("từ vựng", response.data);
        const phonetic = data.phonetics?.[0]?.text || "Không có";
        const meanings = data.meanings.map(meaning => ({
            type: meaning.partOfSpeech || "Không có",
            definitions: meaning.definitions.map(defi => ({
                definition: defi.definition || "Không có",
                example: defi.example || "Không có",
            })),
            synonyms: meaning.synonyms.length > 0 ? meaning.synonyms : ["Không có"],
            antonyms: meaning.antonyms.length > 0 ? meaning.antonyms : ["Không có"]
        }))

        const newWord = new Vocabulary({
            word: word,
            phonetic: phonetic,
            meanings: meanings
        })

        return res.json(newWord);
    } catch (error) {
        res.status(500).json({ error: "Translate failed", details: error.message });
    }
}
const he = async (req, res) => {
    res.send("hello");
};


export default {
    handleTranslate,
    he, handleFindVocabulary, handleSaveVocabulary
};
