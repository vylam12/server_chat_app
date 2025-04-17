import axios from "axios";
import Vocabulary from "../models/vocabulary.js";
import UserVocabulary from "../models/userVocabulary.js";
import Quiz from "../models/quiz.js";
import Question from "../models/question.js";
import quizController from "./quizController.js";
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime.js';
import mongoose from 'mongoose';

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
        const quizQuestions = await quizController.generateQuizQuestions(existingVocabulary);
        const savedQuestions = [];
        for (const q of quizQuestions) {
            const newQuestion = new Question({
                content: q.content,
                options: q.options,
                correctAnswer: q.correctAnswer,
                vocabulary: {
                    _id: q.vocabulary._id,
                    meaning: q.vocabulary.meaning
                }
            });

            await newQuestion.save();
            savedQuestions.push(newQuestion);
        }
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
    word = word.toLowerCase();
    try {


        const [existingVocabulary, userSaved] = await Promise.all([
            Vocabulary.findOne({ word }),
            userId ? UserVocabulary.exists({ userId, word }) : null
        ]);

        if (existingVocabulary) {
            console.log("Từ đã tồn tại trong database:", existingVocabulary);
            console.log("userSaved", userSaved);
            return res.json({
                newWord: existingVocabulary,
                userSaved: userSaved ? userSaved._id.toString() : null
            });
        }

        const response = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        const data = response.data[0];

        const seenTypes = new Set();
        const phoneticsList = data.phonetics
            .filter(p => (p.license?.name?.includes("BY-SA") || p.license?.name?.includes("US")) && !seenTypes.has(p.license?.name))
            .map(p => {
                seenTypes.add(p.license?.name);
                return {
                    text: p.text || "Không có",
                    audio: p.audio || "Không có",
                    type: p.license?.name?.includes("BY-SA") ? "SA" : "US",
                    license: {
                        name: p.license?.name || "Không có",
                        url: p.license?.url || "Không có"
                    }
                };
            });

        const meanings = data.meanings.map(meaning => ({
            type: meaning.partOfSpeech || "Không có",
            definitions: meaning.definitions.map(defi => ({
                definition: defi.definition || "Không có",
                example: defi.example || "Không có",
            })),
            synonyms: meaning.synonyms.length > 0 ? meaning.synonyms : ["Không có"],
            antonyms: meaning.antonyms.length > 0 ? meaning.antonyms : ["Không có"]
        }));

        const newWord = new Vocabulary({
            word: word,
            phonetics: phoneticsList.length > 0 ? phoneticsList : ["Không có"],
            meanings: meanings
        });

        console.log("newWord", newWord);

        return res.json({ newWord: newWord, userSaved: null });

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
            .populate('_idVocabulary', 'word meanings quizAttempts');

        const vocabIds = listVocab.map(item => item._idVocabulary._id);
        const questions = await Question.find({ "vocabulary._id": { $in: vocabIds } })
            .select("_id vocabulary._id");

        const questionMap = questions.reduce((acc, q) => {
            if (!acc[q.vocabulary._id]) acc[q.vocabulary._id] = [];
            acc[q.vocabulary._id].push(q._id.toString());
            return acc;
        }, {});

        const result = await Promise.all(listVocab.map(async (item) => {
            const vocab = item._idVocabulary;
            if (!vocab) return null;

            const questionIds = questionMap[vocab._id] || [];

            let lastReviewedText = null;
            if (questionIds.length > 0) {
                const lastQuiz = await Quiz.findOne({
                    _idUser: userId,
                    _idQuestion: { $in: questionIds }
                }).sort({ createdAt: -1 });

                if (lastQuiz) {
                    lastReviewedText = dayjs(lastQuiz.createdAt).fromNow();
                }
            }

            let firstMeaning = "";
            if (vocab.meanings?.length > 0 && vocab.meanings[0].definitions?.length > 0) {
                firstMeaning = vocab.meanings[0].definitions[0].definition;
            }

            const { quizAttempts, correctAnswers, wrongAnswers } = item;
            const totalAnswers = correctAnswers + wrongAnswers;
            let proficiency = 0;
            if (quizAttempts > 0) {
                const weight = Math.min(totalAnswers / 10, 1);
                proficiency = Math.round(correctAnswers / totalAnswers * weight * 100);
            }

            return {
                id: vocab._id,
                word: vocab.word,
                meanings: firstMeaning,
                timepractice: lastReviewedText || "Never studied",
                proficiency: proficiency,
                totalpractice: quizAttempts
            };
        }));

        // Lọc null (nếu có) và trả về kết quả
        return res.json({ data: result.filter(item => item !== null) });
    } catch (error) {
        return res.status(500).json({ error: "Get saved vocab failed", details: error.message });
    }
};

//làm flash card
const getUserVocabulary = async (req, res) => {
    try {
        const userId = req.params.userId;

        const vocabList = await UserVocabulary.aggregate([
            {
                $match: {
                    _idUser: userId,
                    flashcardViews: 0,
                    isKnown: false
                }
            },
            {
                $sample: { size: 7 }
            },
            {
                $lookup: {
                    from: "vocabularies",
                    localField: "_idVocabulary",
                    foreignField: "_id",
                    as: "vocabInfo"
                }
            },
            {
                $unwind: "$vocabInfo"
            },
            {
                $project: {
                    word: "$vocabInfo.word",
                    phonetic: { $arrayElemAt: ["$vocabInfo.phonetics.text", 0] },
                    audio: { $arrayElemAt: ["$vocabInfo.phonetics.audio", 0] },
                    meanings: { $arrayElemAt: ["$vocabInfo.meanings.definitions.definition", 0] }
                }
            }
        ]);

        if (vocabList.length < 5) {
            return res.json({ canMakeFlashcard: false, data: [] });
        }

        return res.json({ canMakeFlashcard: true, data: vocabList });

    } catch (err) {
        console.error("Error get flashcards:", err);
        res.status(500).json({ message: "Lỗi khi lấy từ vựng", error: err });
    }
};

const updateAfterFlashcard = async (req, res) => {
    const { userId, vocabList } = req.body;

    if (!userId || !Array.isArray(vocabList)) {
        return res.status(400).json({ message: "Invalid data format." });
    }

    try {
        const updatePromises = vocabList.map(async (item) => {
            const { vocabularyId, isKnown } = item;

            const userVocab = await UserVocabulary.findOneAndUpdate(
                { _idUser: userId, _idVocabulary: vocabularyId },
                {
                    $inc: { flashcardViews: 1 },
                    $set: {
                        lastReviewedAt: now,
                        ...(isKnown ? { isKnown: true, level: 4 } : {})
                    }
                },
                { upsert: true, new: true }
            );

            return userVocab;
        });

        const updatedVocabularies = await Promise.all(updatePromises);

        res.status(200).json({
            message: "Cập nhật từ vựng sau khi học flashcard thành công.",
            data: updatedVocabularies
        });
    } catch (error) {
        console.error("Lỗi cập nhật flashcard:", error);
        res.status(500).json({ message: "Lỗi server khi cập nhật flashcard." });
    }
};

const getFlashcardReviewQuestions = async (req, res) => {
    const { userId } = req.params;

    try {
        const learnedVocabularies = await UserVocabulary.find({
            _idUser: userId,
            flashcardViews: { $gte: 1 },
            isKnown: false
        });

        const vocabularyIds = learnedVocabularies.map(item => item._idVocabulary);

        if (vocabularyIds.length === 0) {
            return res.status(200).json({ message: "Không có từ nào cần ôn tập.", data: [] });
        }

        const questions = await Question.find({
            "vocabulary._id": { $in: vocabularyIds }
        });

        res.status(200).json({
            message: "Lấy câu hỏi ôn tập thành công.",
            data: questions
        });
    } catch (error) {
        console.error("Lỗi khi lấy câu hỏi ôn tập:", error);
        res.status(500).json({ message: "Lỗi server khi lấy câu hỏi ôn tập." });
    }
};
export default {
    handleFindVocabulary, handleSaveVocabulary, selectWordsForQuiz,
    handleDeleteVocabulary, handleGetListSaveVocab, getUserVocabulary, updateAfterFlashcard,
    getFlashcardReviewQuestions
};
