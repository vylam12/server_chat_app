import Question from "../models/question.js"

const handleQuizCreation = async (req, res) => {
    try {
        const allQuestions = await Question.find();
        const questionCount = allQuestions.length;

        if (questionCount >= 4) {
            const selectedQuestions = questionCount > 4
                ? allQuestions.sort(() => 0.5 - Math.random()).slice(0, 4)
                : allQuestions;

            const newQuiz = new Quiz({ _idQuiz: new mongoose.Types.ObjectId().toString() });
            await newQuiz.save();
            console.log("Quiz mới đã được tạo:", newQuiz);

            const newDetailQuiz = new DetailQuiz({
                _idQuiz: newQuiz._idQuiz,
                _idQuestion: selectedQuestions.map(q => q._id.toString()),
                tongCauHoi: selectedQuestions.length

            });
            await newDetailQuiz.save();
            console.log("Detail Quiz đã được tạo:", newDetailQuiz);

            return res.status(201).json({ newQuiz, newDetailQuiz });
        } else {
            console.log("Chưa đủ 4 câu hỏi để tạo quiz.");
            return null;
        }
    } catch (error) {
        console.error("Lỗi khi tạo quiz:", error);
        throw error;
    }
}

export default {
    handleQuizCreation
};
