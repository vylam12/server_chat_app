import vocabularyController from "./vocabularyController.js";
import Question from "../models/question.js";
import UserVocabulary from "../models/userVocabulary.js";
import Quiz from "../models/quiz.js";
import Vocabulary from "../models/vocabulary.js";
const generateQuizQuestions = async (newWord) => {
    const questions = [];

    // Helper lấy đáp án nhiễu từ các từ khác
    const getExtraItems = async (type = "definition") => {
        const others = await Vocabulary.find({ _id: { $ne: newWord._id } }).limit(20);
        if (type === "definition") {
            return others.flatMap(v => v.meanings.flatMap(m => m.definitions.map(d => d.definition)));
        } else if (type === "synonym") {
            return others.flatMap(v => v.meanings.flatMap(m => m.synonyms)).filter(s => s !== "Không có");
        } else if (type === "antonym") {
            return others.flatMap(v => v.meanings.flatMap(m => m.antonyms)).filter(a => a !== "Không có");
        }
        return [];
    };

    // Câu hỏi về nghĩa
    const definitions = newWord.meanings.flatMap(m => m.definitions.map(d => d.definition));
    if (definitions.length > 0) {
        const correct = definitions[Math.floor(Math.random() * definitions.length)];
        let distractors = definitions.filter(d => d !== correct);

        if (distractors.length < 3) {
            const extra = await getExtraItems("definition");
            distractors = [...distractors, ...extra.filter(e => e !== correct)];
        }

        if (distractors.length >= 3) {
            const options = [...distractors.slice(0, 3), correct].sort(() => Math.random() - 0.5);
            questions.push({
                content: `What does '${newWord.word}' mean?`,
                vocabulary: {
                    _id: newWord._id,
                    meaning: newWord.word
                },
                options,
                correctAnswer: correct
            });
        }
    }

    // Câu hỏi đồng nghĩa
    const synonyms = newWord.meanings.flatMap(m => m.synonyms).filter(s => s !== "Không có");
    if (synonyms.length > 0) {
        const correct = synonyms[Math.floor(Math.random() * synonyms.length)];
        let distractors = synonyms.filter(s => s !== correct);

        if (distractors.length < 3) {
            const extra = await getExtraItems("synonym");
            distractors = [...distractors, ...extra.filter(e => e !== correct)];
        }

        if (distractors.length >= 3) {
            const options = [...distractors.slice(0, 3), correct].sort(() => Math.random() - 0.5);
            questions.push({
                content: `Which word is a synonym of '${newWord.word}'?`,
                vocabulary: {
                    _id: newWord._id,
                    meaning: newWord.word
                },
                options,
                correctAnswer: correct
            });
        }
    }

    // Câu hỏi trái nghĩa
    const antonyms = newWord.meanings.flatMap(m => m.antonyms).filter(a => a !== "Không có");
    if (antonyms.length > 0) {
        const correct = antonyms[Math.floor(Math.random() * antonyms.length)];
        let distractors = antonyms.filter(a => a !== correct);

        if (distractors.length < 3) {
            const extra = await getExtraItems("antonym");
            distractors = [...distractors, ...extra.filter(e => e !== correct)];
        }

        if (distractors.length >= 3) {
            const options = [...distractors.slice(0, 3), correct].sort(() => Math.random() - 0.5);
            questions.push({
                content: `Which word is an antonym of '${newWord.word}'?`,
                vocabulary: {
                    _id: newWord._id,
                    meaning: newWord.word
                },
                options,
                correctAnswer: correct
            });
        }
    }

    return questions.slice(0, 3); // Trả về tối đa 3 câu hỏi
};


//Tạo quiz
const handleQuizCreation = async (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId) {
            return res.status(401).json({ error: "User ID is required" });
        }
        const existingQuiz = await Quiz.findOne({
            _idUser: userId,
            isCompleted: false
        });
        if (existingQuiz) {
            return res.status(200).json({
                canStartQuiz: true, quizId: existingQuiz._id, totalQuestion: existingQuiz.totalQuestion
            });
        }
        const learnedVocabularies = await UserVocabulary.find({
            _idUser: userId,
            flashcardViews: { $gte: 2 }
        });

        const vocabularyIds = learnedVocabularies.map(item => item._idVocabulary);

        if (vocabularyIds.length === 0) {
            return res.status(200).json({
                canStartQuiz: false,
                data: []
            });
        }

        const questions = await Question.aggregate([
            { $match: { "vocabulary._id": { $in: vocabularyIds } } },
            { $sample: { size: 5 } }
        ]);

        if (questions.length === 0) {
            return res.status(200).json({
                canStartQuiz: false,
                data: []
            });
        }


        const questionIds = questions.map(q => q._id);
        const newQuiz = new Quiz({
            _idQuestion: questionIds,
            _idUser: userId,
            totalQuestion: questionIds.length,
            isCompleted: false
        });

        await newQuiz.save();
        return res.status(200).json({
            canStartQuiz: true,
            quizId: newQuiz._id
        });
    } catch (error) {
        console.error("Error creating quiz:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
const handleGetQuiz = async (req, res) => {
    try {
        const { quizId } = req.params;
        if (!quizId) {
            return res.status(401).json({ error: "quizId available" });
        }

        const listIdQuestion = await Quiz.findOne({ _id: quizId }).select("_idQuestion");
        console.log("listIdQuestion", listIdQuestion)
        if (!listIdQuestion) {
            return res.status(404).json({ error: "Quiz not found" });
        }
        const listQuestion = await Question.find({ _id: { $in: listIdQuestion._idQuestion } });
        return res.status(200).json({ listQuestion: listQuestion });
    } catch (error) {
        console.error("Error fetching questions:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }

}
const handleUpdateResultQuiz = async (req, res) => {
    try {
        const { quizId, countCorrect, timeTaken, vocabularyResults, userId } = req.body;
        if (!quizId) {
            return res.status(401).json({ error: "quizId available" });
        }

        const updatedQuiz = await Quiz.findByIdAndUpdate(
            quizId,
            {
                $set: {
                    countCorrect,
                    timeTaken, isCompleted: true
                }
            },
            { new: true }
        );

        if (!updatedQuiz) {
            return res.status(404).json({ error: "Quiz not found" });
        }

        const now = new Date();
        if (vocabularyResults && vocabularyResults.length > 0) {
            for (const vocab of vocabularyResults) {
                const existing = await UserVocabulary.findOne({
                    _idVocabulary: vocab.vocabId,
                    _idUser: userId
                });

                const updatePayload = {
                    $inc: {
                        correctAnswers: vocab.correctCount || 0,
                        wrongAnswers: vocab.wrongCount || 0,
                        quizAttempts: 1
                    },
                    $set: {
                        lastReviewedAt: now
                    }
                };
                const totalCorrect = (existing?.correctAnswers || 0) + (vocab.correctCount || 0);
                const totalQuiz = (existing?.quizAttempts || 0) + 1;
                const flashcardViews = existing?.flashcardViews || 0;

                if (flashcardViews >= 2 && totalQuiz >= 1 && totalCorrect >= 2) {
                    updatePayload.$set.isKnown = true;
                }

                await UserVocabulary.findOneAndUpdate(
                    { _idVocabulary: vocab.vocabId, _idUser: userId },
                    updatePayload,
                    { upsert: true, new: true }
                );
            }
        }

        return res.status(200).json({ message: "Quiz & Vocabulary updated successfully" });
    } catch (error) {
        console.error("Error update quiz:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

const handleCheckUserVocabulary = async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ error: "Missing userId" });
        }

        const wordCount = await UserVocabulary.countDocuments({ _idUser: userId });

        if (wordCount < 3) {
            return res.json({ canStartQuiz: false, message: "User must have at least 3 words to start the quiz" });
        }

        return res.json({ canStartQuiz: true });
    } catch (error) {
        return res.status(500).json({ error: "Failed to check vocabulary count", details: error.message });
    }
};
const handleGetHistoryQuiz = async (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId) {
            return res.status(400).json({ error: "Missing userId" });
        }

        const listQuiz = await Quiz.find({ _idUser: userId }).sort({ createdAt: -1 });
        const formattedQuiz = listQuiz.map(quiz => ({
            _id: quiz._id,
            totalQuestion: quiz.totalQuestion,
            countCorrect: quiz.countCorrect,
            timeTaken: quiz.timeTaken,
            createdAt: new Date(quiz.createdAt).toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            })
        }));
        return res.json({ listQuiz: formattedQuiz });
    } catch (error) {
        return res.status(500).json({ error: "Failed to check vocabulary count", details: error.message });
    }
};
export default {
    handleQuizCreation, handleUpdateResultQuiz,
    handleGetQuiz, handleCheckUserVocabulary, handleGetHistoryQuiz, generateQuizQuestions
};
