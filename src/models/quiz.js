import mongoose from "mongoose";

const quizSchema = new mongoose.Schema({
    _idQuiz: { type: String, required: true, unique: true }
},
    { timestamps: true }
)

const Quiz = mongoose.model("quiz", quizSchema);
export default Quiz;