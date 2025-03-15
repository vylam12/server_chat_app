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
    point: {
        type: Number, default: 0
    },
    timeTaken: {
        type: Number, default: 0
    }

},
    { timestamps: true }
)

const Quiz = mongoose.model("quiz", QuizSchema);
export default Quiz;