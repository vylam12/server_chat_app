import axios from "axios";
import Vocabulary from "../models/vocabulary.js";
import UserVocabulary from "../models/userVocabulary.js";
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime.js';
dayjs.extend(relativeTime);
function selectWordsForQuiz(vocabList, count) {
    // Sắp xếp từ ít thành thạo đến nhiều thành thạo
    const sortedList = vocabList.sort((a, b) => {
        const accuracyA = a.quizAttempts > 0 ? a.correctAnswers / a.quizAttempts : 0;
        const accuracyB = b.quizAttempts > 0 ? b.correctAnswers / b.quizAttempts : 0;
        return accuracyA - accuracyB; // Từ ít thành thạo hơn sẽ được ưu tiên
    });

    // Chọn numWords từ đầu danh sách (ưu tiên từ chưa thành thạo)
    return sortedList.slice(0, count);
}

const handleSaveVocabulary = async (req, res) => {
    try {
        let { userId, vocabulary } = req.body;

        if (!userId || !vocabulary) {
            return res.status(400).json({ error: "Missing userId or vocabulary" })
        }
        let { word, phonetics, meanings } = vocabulary
        let existingVocabulary = await Vocabulary.findOne({ word: word });
        if (!existingVocabulary) {
            // Nếu từ vựng chưa tồn tại, thì thêm vào bảng Vocabulary
            existingVocabulary = new Vocabulary({
                word,
                phonetics,
                meanings
            });
            await existingVocabulary.save();
        }

        const isSaved = await UserVocabulary.findOne({
            _idUser: userId,
            _idVocabulary: existingVocabulary._id
        });
        if (isSaved) {
            return res.status(400).json({ error: "User has already saved this vocabulary" });
        }
        const newUserVocabulary = new UserVocabulary({
            _idUser: userId,
            _idVocabulary: existingVocabulary._id
        });
        await newUserVocabulary.save();

        res.json({
            message: "Save vocabulary successfully",
            vocabulary: existingVocabulary,
            userVocabulary: newUserVocabulary
        });
    } catch (error) {
        res.status(500).json({ error: "SaveVocabulary failed", details: error.message });
    }

}

const handleFindVocabulary = async (req, res) => {
    let { word, userId } = req.body;

    if (!word) {
        return res.status(400).json({ error: "Missing 'word' language" })
    }
    try {
        let existingVocabulary = await Vocabulary.findOne({ word });
        let userSaved = false;
        if (existingVocabulary && userId) {
            userSaved = await UserVocabulary.exists({ userId, word });
        }
        if (existingVocabulary) {
            console.log("Từ đã tồn tại trong database:", existingVocabulary);
            console.log("userSaved", userSaved);
            if (userSaved) {
                return res.json({ newWord: existingVocabulary, userSaved: userSaved._id.toString() });
            } else {
                return res.json({ newWord: existingVocabulary, userSaved: null });
            }
        }


        const response = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        const data = response.data[0];
        const phoneticsList = data.phonetics
            .filter(p => p.license?.name.includes("BY-SA") || p.license?.name.includes("US"))
            .map(p => ({
                text: p.text || "Không có",
                audio: p.audio || "Không có",
                type: p.license?.name.includes("BY-SA") ? "SA" : "US",  // Phân loại type
                license: {
                    name: p.license?.name || "Không có",
                    url: p.license?.url || "Không có"
                }
            }));

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
            phonetics: phoneticsList.length > 0 ? phoneticsList : ["Không có"],
            meanings: meanings
        })
        console.log("newWord", newWord);

        return res.json({ newWord: newWord });
    } catch (error) {
        res.status(500).json({ error: "Translate failed", details: error.message });
    }
}
const handleDeleteVocabulary = async (req, res) => {
    try {
        const { idUserVocabulary } = req.body;
        if (!idUserVocabulary) {
            return res.status(400).json({ error: "Missing idUserVocabulary" });
        }
        const deletedVocabulary = await UserVocabulary.findByIdAndDelete(idUserVocabulary);

        if (!deletedVocabulary) {
            return res.status(404).json({ error: "User vocabulary not found" });
        }
        return res.json({ message: "Delete vocabulary success" });
    } catch (error) {
        return res.status(500).json({ error: "Delete vocabulary failed", details: error.message });
    }
};
const handleGetListSaveVocab = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ error: "Missing userId" });
        }

        const listVocab = await UserVocabulary.find({ _idUser: userId })
            .populate('_idVocabulary', 'word meanings');

        const result = [];

        for (const item of listVocab) {
            const vocab = item._idVocabulary;
            if (!vocab) continue;


            const questions = await Question.find({ "vocabulary._id": vocab._id }).select("_id");
            const questionIds = questions.map(q => q._id.toString());

            let lastReviewTime = null;

            if (questionIds.length > 0) {
                const lastQuiz = await Quiz.findOne({
                    _idUser: userId,
                    _idQuestion: { $in: questionIds }
                }).sort({ createdAt: -1 });

                if (lastQuiz) {
                    lastReviewTime = lastQuiz.createdAt;
                    lastReviewedDaysAgo = dayjs().diff(dayjs(lastQuiz.createdAt), 'day');
                    lastReviewedText = dayjs(lastQuiz.createdAt).fromNow();
                }
            }

            result.push({
                word: vocab.word,
                meanings: vocab.meanings,
                timepractice: lastReviewedText,
            });
        }

        return res.json({ data: result });
    } catch (error) {
        return res.status(500).json({ error: "Get saved vocab failed", details: error.message });
    }
};

export default {
    handleFindVocabulary, handleSaveVocabulary, selectWordsForQuiz,
    handleDeleteVocabulary, handleGetListSaveVocab
};
