import mongoose from "mongoose";
const VocabularySchema = new mongoose.Schema({
    word: {
        type: String, required: true,
        unique: true
    },
    phonetics: [
        {
            text: { type: String, default: "Không có" },
            audio: { type: String, default: "Không có" },
            type: { type: String },
            license: {
                name: { type: String, default: "Không có" },
                url: { type: String, default: "Không có" }
            }
        }
    ],
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

},
    { timestamps: true }
)

const Vocabulary = mongoose.model("vocabulary", VocabularySchema);
export default Vocabulary;