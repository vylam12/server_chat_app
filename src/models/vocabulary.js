import mongoose from "mongoose";
import questionModel from "./question.js"
import Question from "./question.js";
const VocabularySchema = new mongoose.Schema({
    word: {
        type: String, required: true,
        unique: true
    },
    phonetic: {
        type: String, default: null
    },
    meanings: [
        {
            type: {
                type: String, required: true
            },
            definitions: [
                {
                    definition: { type: String, required: true },
                    example: { type: String, default: null }
                }
            ],
            synonyms: { type: [String], default: null },
            antonyms: { type: [String], default: null },
        }
    ],
    quizAttempts: {
        type: Number, default: 0
    },
    correctAnswers: {
        type: Number, default: 0
    },
    wrongAnswers: {
        type: Number, default: 0
    },
},
    { timestamps: true }
)
let lastQuestionType = 'en_to_vi'

const defaultWrongAnswersVI = ["Lựa chọn khác", "Không phải đáp án đúng", "Đáp án khác", "Từ không liên quan"];
const defaultWrongAnswersEN = ["Another choice", "Not the correct answer", "Different word", "Unrelated word"];

VocabularySchema.post('save', async function (doc) {
    try {
        const Vocabulary = mongoose.model("vocabulary");
        const allWorrd = await Vocabulary.find({}, '_id word meaning');

        lastQuestionType = lastQuestionType === 'en_to_vi' ? 'vi_to_en' : 'en_to_vi'

        // Khai báo biến trước khi dùng
        let content = "";
        let correctAnswer = {};
        let answer = [];
        if (lastQuestionType === 'en_to_vi') {
            content = `Từ "${doc.word}" có nghĩa là gì?`;
            correctAnswer = { _idVocabulary: doc._id, meanVocabulary: doc.meaning };
            answer = allWorrd
                .map(word => word.meaning)
                .filter(meaning => meaning != doc.meaning)
                .sort(() => 0.5 - Math.random())
                .slice(0, 3)
        } else {
            content = `${doc.meaning}?`;
            correctAnswer = { _idVocabulary: doc._id, meanVocabulary: doc.word };
            answer = allWorrd
                .map(word => word.word)
                .filter(word => word != doc.word)
                .sort(() => 0.5 - Math.random())
                .slice(0, 3)
        }

        while (answer.length < 3) {
            const defaultList = (lastQuestionType === 'en_to_vi') ? defaultWrongAnswersVI : defaultWrongAnswersEN;
            const randomIndex = Math.floor(Math.random() * defaultList.length);
            answer.push(defaultList[randomIndex]);
        }
        const newQuestion = new Question({
            content: content,
            type: lastQuestionType,
            correctAnswer: correctAnswer,
            answer: answer
        })
        await newQuestion.save();
        console.log("Tạo câu hỏi thành công")
    } catch (error) {
        console.error('Tạo câu hỏi thất bại :', error);
    }

})

const Vocabulary = mongoose.model("vocabulary", VocabularySchema);
export default Vocabulary;