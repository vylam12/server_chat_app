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

        // Tìm các từ đã có câu hỏi trong collection Question
        const existingQuestions = await Question.find({ "vocabulary._id": { $in: selectedWords.map(w => w._id) } });
        // Nhóm câu hỏi theo từ vựng
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
        const questionIds = allQuizQuestions.map(q => q._id);
        console.log("Question IDs:", questionIds);

        const newQuiz = new Quiz({
            _idQuestion: questionIds,
            _idUser: userId,
            totalQuestion: questionIds.length
        });

        await newQuiz.save();

        res.json({ message: "Quiz created successfully", quizId: newQuiz._id, quizQuestions: allQuizQuestions });
    } catch (error) {
        console.error("Error creating quiz:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export default {
    handleQuizCreation
};
