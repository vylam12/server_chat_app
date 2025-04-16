import mongoose from "mongoose";

const userVocabularySchema = new mongoose.Schema({
    _idUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user', required: true
    },
    _idVocabulary: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'vocabulary', required: true
    },
    flashcardViews: {
        type: Number, default: 0
    },
    quizAttempts: {
        type: Number, default: 0
    },
    correctAnswers: {
        type: Number, default: 0
    },
    wrongAnswers: {
        type: Number, default: 0
    },
    isKnown: {
        type: Boolean,
        default: false
    },
    level: {
        type: Number,
        default: 0
    },
    lastReviewedAt: {
        type: Date,
        default: Date.now
    }
},
    { timestamps: true }
);
const UserVocabulary = mongoose.model("userVocabulary", userVocabularySchema);
export default UserVocabulary;