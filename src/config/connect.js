import mongoose from "mongoose";
import Vocabulary from "../models/vocabulary.js";
import fs from "fs";


const vocabList = JSON.parse(fs.readFileSync("vocab.json", "utf8"));
const connect = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI)
        console.log(" Connect database success");

        const bulkOps = vocabList.map(vocab => ({
            updateOne: {
                filter: { word: vocab.word },
                update: { $set: vocab },
                upsert: true
            }
        }));

        if (bulkOps.length > 0) {
            await Vocabulary.bulkWrite(bulkOps);
            console.log("Đã xử lý danh sách từ vựng!");
        }

    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
    }
}

export default connect;