import mongoose from "mongoose";

const friendInvitationSchema = new mongoose.Schema({
    id_receiver: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "user"
    },
    id_sender: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "user"
    },
    status: {
        type: String, required: true,
        enum: ["pending", "accepted", "declined"],
    }

},
    { timestamps: true }
)
friendInvitationSchema.index({ id_sender: 1, id_receiver: 1 }, { unique: true });

const FriendInvitation = mongoose.model("friendInvitation", friendInvitationSchema);
export default FriendInvitation;