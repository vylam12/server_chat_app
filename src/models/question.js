import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
    content: {
        type: String, required: true
    },
    vocabulary: {
        _id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "vocabulary",
            required: true
        },
        meaning: {
            type: String, required: true
        }
    },
    correctAnswer: {
        type: String, required: true
    },
    options: {
        type: [String], required: true
    },

},
    { timestamps: true }
)

const Question = mongoose.model("question", questionSchema);
export default Question;