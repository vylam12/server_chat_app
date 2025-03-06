import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
    content: {
        type: String, required: true
    },
    type: {
        type: String, required: true,
        enum: ['en_to_vi', 'vi_to_en']
    },
    correctAnswer: {
        _idVocabulary: { type: String, required: true },
        meanVocabulary: { type: String, required: true }
    },
    answer: {
        type: [String], required: true
    },

},
    { timestamps: true }
)

const Question = mongoose.model("question", questionSchema);
export default Question;