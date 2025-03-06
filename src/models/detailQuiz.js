import mongoose from "mongoose";

const detailQuizSchema = new mongoose.Schema({
    _idQuiz: {
        type: String, required: true, ref: "quiz"
    },
    _idQuestion: [
        { type: String, required: true }
    ],
    tongCauHoi: {
        type: Number, required: true
    },
    soCauDung: {
        type: Number, default: 0
    },
    diem: {
        type: Number, default: 0
    }

},
    { timestamps: true }
)

const detailQuiz = mongoose.model("detailQuiz", detailQuizSchema);
export default detailQuiz;