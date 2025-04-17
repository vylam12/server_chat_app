import vocabularyController from "./vocabularyController.js";
import Question from "../models/question.js";
import UserVocabulary from "../models/userVocabulary.js";
import Quiz from "../models/quiz.js";

//Tạo câu hỏi
const generateQuizQuestions = async (newWord) => {
    const questions = [];

    const allDefinitions = newWord.meanings.flatMap(m => m.definitions.map(d => d.definition));
    const allSynonyms = newWord.meanings.flatMap(m => m.synonyms).filter(s => s !== "Không có");
    const allAntonyms = newWord.meanings.flatMap(m => m.antonyms).filter(a => a !== "Không có");

    if (allDefinitions.length > 0) {
        const correctDefinition = allDefinitions[Math.floor(Math.random() * allDefinitions.length)];
        const options = [...allDefinitions.filter(d => d !== correctDefinition).slice(0, 3), correctDefinition];

        if (options.length === 4) {
            questions.push({
                content: `What does '${newWord.word}' mean?`,
                vocabulary: {
                    _id: newWord._id,
                    meaning: newWord.word
                },
                options: options.sort(() => Math.random() - 0.5),
                correctAnswer: correctDefinition
            });
        }
    }

    if (allSynonyms.length > 0) {
        const correctSynonym = allSynonyms[Math.floor(Math.random() * allSynonyms.length)];
        const options = [...allSynonyms.filter(s => s !== correctSynonym).slice(0, 3), correctSynonym];

        if (options.length === 4) {
            questions.push({
                content: `Which word is a synonym of '${newWord.word}'?`,
                vocabulary: {
                    _id: newWord._id,
                    meaning: newWord.word
                },
                options: options.sort(() => Math.random() - 0.5),
                correctAnswer: correctSynonym
            });
        }
    }

    if (allAntonyms.length > 0) {
        const correctAntonym = allAntonyms[Math.floor(Math.random() * allAntonyms.length)];
        const options = [...allAntonyms.filter(a => a !== correctAntonym).slice(0, 3), correctAntonym];

        if (options.length === 4) {
            questions.push({
                content: `Which word is an antonym of '${newWord.word}'?`,
                vocabulary: {
                    _id: newWord._id,
                    meaning: newWord.word
                },
                options: options.sort(() => Math.random() - 0.5),
                correctAnswer: correctAntonym
            });
        }
    }

    const finalQuestions = questions.slice(0, 3);
    return finalQuestions;
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
                canStartQuiz: true,
                quizId: existingQuiz._id,
                totalQuestion: existingQuiz.totalQuestion
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
