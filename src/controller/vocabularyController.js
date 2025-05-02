import axios from "axios";
import Vocabulary from "../models/vocabulary.js";
import UserVocabulary from "../models/userVocabulary.js";
import Quiz from "../models/quiz.js";
import Question from "../models/question.js";
import quizController from "./quizController.js";
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime.js';
import moment from "moment";

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

// const handleSaveVocabulary = async (req, res) => {
//     try {
//         let { userId, vocabulary } = req.body;

//         if (!userId || !vocabulary) {
//             return res.status(400).json({ error: "Missing userId or vocabulary" })
//         }
//         let { word, phonetics, meanings } = vocabulary
//         let existingVocabulary = await Vocabulary.findOne({ word: word });
//         if (!existingVocabulary) {
//             existingVocabulary = new Vocabulary({
//                 word,
//                 phonetics,
//                 meanings
//             });
//             await existingVocabulary.save();
//         }

//         const isSaved = await UserVocabulary.findOne({
//             _idUser: userId,
//             _idVocabulary: existingVocabulary._id
//         });
//         if (isSaved) {
//             return res.status(400).json({ error: "User has already saved this vocabulary" });
//         }
//         const newUserVocabulary = new UserVocabulary({
//             _idUser: userId,
//             _idVocabulary: existingVocabulary._id
//         });
//         await newUserVocabulary.save();

//         const existingQuestions = await Question.find({ "vocabulary._id": existingVocabulary._id });

//         if (existingQuestions.length === 0) {
//             const quizQuestions = await quizController.generateQuizQuestions(existingVocabulary);
//             const savedQuestions = [];

//             for (const q of quizQuestions) {
//                 const newQuestion = new Question({
//                     content: q.content,
//                     options: q.options,
//                     correctAnswer: q.correctAnswer,
//                     vocabulary: {
//                         _id: q.vocabulary._id,
//                         meaning: q.vocabulary.meaning
//                     }
//                 });

//                 await newQuestion.save();
//                 savedQuestions.push(newQuestion);
//             }
//         }
//         res.json({
//             message: "Save vocabulary successfully",
//             vocabulary: existingVocabulary,
//             userVocabulary: newUserVocabulary
//         });
//     } catch (error) {
//         res.status(500).json({ error: "SaveVocabulary failed", details: error.message });
//     }

// }

const handleFindVocabulary = async (req, res) => {
    let { word, userId } = req.body;

    if (!word) {
        return res.status(400).json({ error: "Missing 'word' language" })
    }
    word = word.toLowerCase();
    try {
        const existingVocabulary = await Vocabulary.findOne({ word });

        let userSaved = null;

        if (existingVocabulary && userId) {
            const savedDoc = await UserVocabulary.findOne({
                _idUser: userId,
                _idVocabulary: existingVocabulary._id
            }).select('_id');

            userSaved = savedDoc ? savedDoc._id.toString() : null;
        }
        if (existingVocabulary) {
            return res.json({
                newWord: existingVocabulary,
                userSaved: userSaved
            });
        }

        const response = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        const data = response.data[0];
        // Kiểm tra xem API có trả về dữ liệu hợp lệ không
        if (!data || !data.meanings || data.meanings.length === 0) {
            return res.status(400).json({ error: "No valid data found for the word" });
        }
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
        await newWord.save();
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
            .populate('_idVocabulary', 'word meanings');

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
            return {
                id: vocab._id,
                word: vocab.word,
                meanings: firstMeaning,
                timepractice: lastReviewedText || "Never studied",
            };
        }));

        return res.json({ data: result.filter(item => item !== null) });
    } catch (error) {
        return res.status(500).json({ error: "Get saved vocab failed", details: error.message });
    }
};

//làm flash card
const getUserVocabulary = async (req, res) => {
    try {
        const userId = req.params.userId;
        const userVocabDocs = await UserVocabulary.find({
            _idUser: userId,
            flashcardViews: 0,
            isKnown: false
        }).limit(7)
            .populate({
                path: '_idVocabulary',
                select: 'word phonetics meanings',
            });

        const formatted = userVocabDocs.map(doc => {
            const vocab = doc._idVocabulary;
            return {
                id: vocab._id,
                word: vocab.word,
                phonetic: vocab.phonetics?.[0]?.text || "",
                audio: vocab.phonetics?.[0]?.audio || "",
                meaning: vocab.meanings?.[0].definitions?.[0].definition || null
            };
        });

        if (formatted.length < 5) {
            return res.json({ canMakeFlashcard: false, data: [] });
        }

        return res.json({ canMakeFlashcard: true, data: formatted });

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
        const now = new Date();

        const updatePromises = vocabList.map(async (item) => {
            const { vocabularyId, isKnown } = item;

            const updateData = {
                $inc: { flashcardViews: 1 },
                $set: {
                    lastReviewedAt: now
                }
            };

            if (typeof isKnown === 'boolean') {
                updateData.$set.isKnown = isKnown;
            }

            return await UserVocabulary.findOneAndUpdate(
                { _idUser: userId, _idVocabulary: vocabularyId },
                updateData,
                { upsert: true, new: true }
            );
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
            flashcardViews: { $gte: 1 }
        });

        const vocabularyIds = learnedVocabularies.map(item => item._idVocabulary);

        if (vocabularyIds.length === 0) {
            return res.status(200).json({ canMakeFlashcard: false, data: [] });
        }

        const questions = await Question.find({
            "vocabulary._id": { $in: vocabularyIds }
        });

        res.status(200).json({
            canMakeFlashcard: true,
            data: questions
        });
    } catch (error) {
        console.error("Lỗi khi lấy câu hỏi ôn tập:", error);
        res.status(500).json({ message: "Lỗi server khi lấy câu hỏi ôn tập." });
    }
};

const getProgress = async (req, res) => {
    const { userId } = req.params;

    try {
        // Chạy các truy vấn song song
        const [
            learnedCount,
            latestReview,
            allReviews,
            completedQuizzes,
            learnedEntries
        ] = await Promise.all([
            UserVocabulary.countDocuments({
                _idUser: userId,
                $or: [{ flashcardViews: { $gt: 0 } }, { isKnown: true }]
            }),

            UserVocabulary.findOne({ _idUser: userId })
                .sort({ lastReviewedAt: -1 })
                .select("lastReviewedAt")
                .lean(),

            UserVocabulary.find({ _idUser: userId }, "lastReviewedAt").lean(),

            Quiz.find({ _idUser: userId, isCompleted: true })
                .sort({ createdAt: -1 })
                .select("totalQuestion countCorrect timeTaken createdAt")
                .lean(),

            UserVocabulary.find({
                _idUser: userId,
                $or: [{ flashcardViews: { $gt: 0 } }, { isKnown: true }]
            })
                .select("_idVocabulary isKnown flashcardViews correctAnswers wrongAnswers lastReviewedAt")
                .populate({ path: "_idVocabulary", select: "word", options: { lean: true } })
                .lean()
        ]);

        // Tổng số ngày học
        const totalLearningDays = new Set(
            allReviews
                .filter(r => r.lastReviewedAt)
                .map(r => moment(r.lastReviewedAt).format("YYYY-MM-DD"))
        ).size;

        // Danh sách từ đã học
        const learnedWords = learnedEntries.map(entry => ({
            word: entry._idVocabulary?.word || "(đã xóa)",
            isKnown: entry.isKnown,
            flashcardViews: entry.flashcardViews,
            correctAnswers: entry.correctAnswers,
            wrongAnswers: entry.wrongAnswers,
            lastReviewedAt: entry.lastReviewedAt
        }));

        res.status(200).json({
            message: "Lấy tiến độ học tập thành công.",
            data: {
                summary: {
                    learnedWordsCount: learnedCount,
                    lastReviewedAt: latestReview?.lastReviewedAt || null,
                    totalLearningDays
                },
                completedQuizzes,
                learnedWords
            }
        });
    } catch (error) {
        console.error("Lỗi khi lấy dữ liệu học tập:", error);
        res.status(500).json({ message: "Lỗi server khi lấy dữ liệu học tập." });
    }
};

const handleGetVocabToReview = async (req, res) => {
    try {
        const { userId } = req.params;

        const vocabToReview = await UserVocabulary.find({
            _idUser: userId,
            isKnown: false,
            lastReviewedAt: { $lt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }
        }).populate('_idVocabulary');

        const response = vocabToReview.map(item => ({

            id: vocab._id,
            word: vocab.word,
            phonetic: vocab.phonetics?.[0]?.text || "",
            audio: vocab.phonetics?.[0]?.audio || "",
            meaning: vocab.meanings?.[0].definitions?.[0].definition || null
        }));

        return res.status(200).json(response);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

const handleGetListVocab = async (req, res) => {
    try {
        const { userId } = req.params;

        const allVocab = await Vocabulary.find({});

        const savedVocabDocs = await UserVocabulary.find({ _idUser: userId }).select('_id _idVocabulary');

        const savedMap = {};
        savedVocabDocs.forEach(doc => {
            savedMap[doc._idVocabulary.toString()] = doc._id.toString();
        });
        allVocab.sort((a, b) => {
            if (!a.word) return 1;
            if (!b.word) return -1;
            return a.word.localeCompare(b.word);
        });
        const response = allVocab.map(vocab => {
            const vocabIdStr = vocab._id.toString();
            const isSaved = vocabIdStr in savedMap;

            return {
                id: vocab._id,
                word: vocab.word,
                phonetic: vocab.phonetics?.[0]?.text || "",
                audio: vocab.phonetics?.[0]?.audio || "",
                meaning: vocab.meanings?.[0]?.definitions?.[0]?.definition || null,
                isSaved,
                _idUserVocabulary: isSaved ? savedMap[vocabIdStr] : null
            };
        });

        return res.status(200).json({ data: response });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
// const handleUserSaveVocabulary = async (req, res) => {
//     try {
//         const { userId, idVocab } = req.body;
//         const isSaved = await UserVocabulary.findOne({
//             _idUser: userId,
//             _idVocabulary: idVocab
//         });
//         if (isSaved) {
//             return res.status(400).json({ error: "User has already saved this vocabulary" });
//         }
//         const newUserVocabulary = new UserVocabulary({
//             _idUser: userId,
//             _idVocabulary: idVocab
//         });
//         await newUserVocabulary.save();

//         return res.status(200).json({ message: "Save vocab success" });
//     } catch (err) {
//         console.error(err);
//         return res.status(500).json({ error: 'Internal Server Error' });
//     }
// };

const handleSaveVocabulary = async (req, res) => {
    try {
        const { userId, idVocab, vocabulary } = req.body;
        console.log("userId", userId ? userId : "", "idVocab", idVocab ? idVocab : "",
            "vocabulary", vocabulary ? vocabulary : "");
        if (!userId || (!idVocab && !vocabulary)) {
            return res.status(400).json({ error: "Missing userId and either idVocab or vocabulary" });
        }

        let vocabId;
        let vocabDoc;

        if (!idVocab && vocabulary) {
            const { word, phonetics, meanings } = vocabulary;
            vocabDoc = await Vocabulary.findOne({ word });

            if (!vocabDoc) {
                vocabDoc = new Vocabulary({ word, phonetics, meanings });
                await vocabDoc.save();
            }

            vocabId = vocabDoc._id;
        } else {
            vocabId = idVocab;
            vocabDoc = await Vocabulary.findById(vocabId);
            console.log("vocabDoc:", vocabDoc);
            if (vocabulary) {
                const { meanings, phonetics } = vocabulary;

                // Nếu meanings hoặc phonetics chưa có trong vocabDoc → cập nhật
                if ((!vocabDoc.meanings || vocabDoc.meanings.length === 0) && meanings) {
                    vocabDoc.meanings = meanings;
                }

                if ((!vocabDoc.phonetics || vocabDoc.phonetics.length === 0) && phonetics) {
                    vocabDoc.phonetics = phonetics;
                }
                ư
            }
            if (!vocabDoc) {
                return res.status(404).json({ error: "Vocabulary not found" });
            }
        }

        const existingQuestions = await Question.find({ "vocabulary._id": vocabId });
        if (existingQuestions.length === 0) {
            const quizQuestions = await quizController.generateQuizQuestions(vocabDoc);
            for (const q of quizQuestions) {
                console.log("Creating question for vocab:", q.vocabulary);
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

            }
            console.log("Generated quizQuestions:", quizQuestions);
        }

        // Kiểm tra nếu đã lưu vocab này chưa
        const isSaved = await UserVocabulary.findOne({
            _idUser: userId,
            _idVocabulary: vocabId
        });

        if (isSaved) {
            return res.status(400).json({ error: "User has already saved this vocabulary" });
        }

        // Lưu vào danh sách từ đã lưu
        const newUserVocabulary = new UserVocabulary({
            _idUser: userId,
            _idVocabulary: vocabId
        });

        await newUserVocabulary.save();

        return res.status(200).json({
            message: "Vocabulary saved successfully",
            userVocabulary: newUserVocabulary
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal Server Error", details: err.message });
    }
};


export default {
    handleFindVocabulary, selectWordsForQuiz,
    handleDeleteVocabulary, handleGetListSaveVocab, getUserVocabulary, updateAfterFlashcard,
    getFlashcardReviewQuestions, getProgress, handleGetVocabToReview, handleGetListVocab,
    handleSaveVocabulary
    // handleUserSaveVocabulary, handleSaveVocabulary
};
