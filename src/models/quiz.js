import mongoose from "mongoose";

const QuizSchema = new mongoose.Schema({
    _idUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', required: true
    },
    _idQuestion: [
        { type: String, required: true }
    ],
    totalQuestion: {
        type: Number, required: true
    },
    countCorrect: {
        type: Number, default: 0
    },
    timeTaken: {
        type: Number, default: 0
    },
    isCompleted: {
        type: Boolean, default: false
    }

},
    { timestamps: true }
)

const Quiz = mongoose.model("quiz", QuizSchema);
export default Quiz;