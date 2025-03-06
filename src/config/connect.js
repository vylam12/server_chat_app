import mongoose from "mongoose";

const connect = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI)
        console.log(" Connect database success");
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
    }
}

export default connect;