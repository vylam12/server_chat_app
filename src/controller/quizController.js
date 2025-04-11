import vocabularyController from "./vocabularyController.js";
import Question from "../models/question.js";
import UserVocabulary from "../models/userVocabulary.js";
import Quiz from "../models/quiz.js";

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

const handleQuizCreation = async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(401).json({ error: "User available" });
        }

        const userWords = await UserVocabulary.find({ _idUser: userId }).populate('_idVocabulary');
        if (!userWords.length) {
            return res.status(400).json({ error: "User has no saved vocabulary" });
        }
        const vocabularyList = userWords.map(entry => entry._idVocabulary);
        if (vocabularyList.length === 0) return res.status(400).json({ error: "No words available" });

        const numberOfWords = Math.min(5, vocabularyList.length);
        const selectedWords = vocabularyController.selectWordsForQuiz(vocabularyList, numberOfWords);

        const existingQuestions = await Question.find({ "vocabulary._id": { $in: selectedWords.map(w => w._id) } });

        const existingQuestionsMap = existingQuestions.reduce((map, question) => {
            const wordId = question.vocabulary._id.toString();
            if (!map[wordId]) map[wordId] = [];
            map[wordId].push(question);
            return map;
        }, {});


        // Phân loại từ đã có câu hỏi và từ chưa có
        const existingWords = Object.keys(existingQuestionsMap);
        const newWords = selectedWords.filter(word => !existingWords.includes(word._id.toString()));


        // Tạo câu hỏi mới cho các từ chưa có
        const newQuizQuestions = (await Promise.all(newWords.map(generateQuizQuestions))).flat();

        // Kết hợp câu hỏi cũ và mới
        const allQuizQuestions = [
            ...existingWords.flatMap(wordId => existingQuestionsMap[wordId]),
            ...newQuizQuestions
        ];

        if (allQuizQuestions.length === 0) {
            return res.status(400).json({ error: "No questions generated" });
        }
        console.log("Generated Quiz Questions:", allQuizQuestions);

        // Lấy danh sách ID của các câu hỏi vừa lưu
        if (newQuizQuestions.length > 0) {
            const savedQuestions = await Question.insertMany(newQuizQuestions);
            allQuizQuestions.push(...savedQuestions);
        }
        const questionIds = allQuizQuestions
            .map(q => q._id?.toString())
            .filter(id => id);
        console.log("Question IDs:", questionIds);

        const newQuiz = new Quiz({
            _idQuestion: questionIds,
            _idUser: userId,
            totalQuestion: questionIds.length
        });

        await newQuiz.save();

        res.json({ message: "Quiz created successfully", quizId: newQuiz._id });
    } catch (error) {
        console.error("Error creating quiz:", error);
        res.status(500).json({ error: "Internal Server Error" });
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
        console.log("quizId", quizId, countCorrect, timeTaken, vocabularyResults, userId)
        const updatedQuiz = await Quiz.findByIdAndUpdate(
            quizId,
            {
                $set: {
                    countCorrect: countCorrect,
                    timeTaken: timeTaken
                }
            },
            { new: true }
        );
        if (!updatedQuiz) {
            return res.status(404).json({ error: "Quiz not found" });
        }
        if (vocabularyResults && vocabularyResults.length > 0) {
            for (const vocab of vocabularyResults) {
                await UserVocabulary.updateOne(
                    { _idVocabulary: vocab.vocabId, _idUser: userId },
                    {
                        $inc: {
                            correctAnswers: vocab.correctCount,
                            wrongAnswers: vocab.wrongCount,
                            quizAttempts: 1
                        }
                    },
                    { new: true } // Nếu không tìm thấy, tạo mới
                );
                console.log("vocab và vocab id", vocab);
            }
        }

        console.log("Quiz & Vocabulary updated successfully");
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

        const listQuiz = await Quiz.countDocuments({ _idUser: userId });

        return res.json({ listQuiz: listQuiz });
    } catch (error) {
        return res.status(500).json({ error: "Failed to check vocabulary count", details: error.message });
    }
};
export default {
    handleQuizCreation, handleUpdateResultQuiz,
    handleGetQuiz, handleCheckUserVocabulary, handleGetHistoryQuiz
};
