import User from "../models/user.js";
import friendInvitationController from "../controller/friendInvitationController.js"
import FriendInvitation from "../models/friendInvitation.js"
const handleGetUser = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ error: "Thiếu userId" });
        }
        const user = await User.find({ userId }).sort({ createdAt: 1 });
        res.status(200).json({
            user: user
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Lỗi server" });
    }
}


const handleGetIDUser = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ error: "Thiếu userId" });
        }
        const user = await User.findOne({ id: userId });
        if (!user) {
            return res.status(404).json({ error: "Không tìm thấy user" });
        }

        res.status(200).json({
            userID: user._id
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Lỗi server" });
    }
}


const handleFindFriend = async (req, res) => {
    try {
        const { nameFriend, userId } = req.query;

        console.log("name friend", nameFriend, userId);
        if (!nameFriend || !userId) {
            return res.status(400).json({ error: "Thiếu data" });
        }
        const potentialFriends = await User.find({
            fullname: { $regex: new RegExp(nameFriend, "i") }
        }).limit(10);  // Giới hạn số lượng kết quả
        console.log("potentialFriends", potentialFriends);
        if (!potentialFriends.length) {
            return res.status(404).json({ error: "Không tìm thấy người dùng" });
        }

        const friendInvitations = await FriendInvitation.find({
            $or: [
                { id_sender: userId, status: "accepted" },
                { id_receiver: userId, status: "accepted" }
            ]
        });
        console.log("friendInvitations", friendInvitations);
        const friendIds = friendInvitations.map(invite =>
            invite.id_sender.toString() === userId ? invite.id_receiver.toString() : invite.id_sender.toString()
        );

        // Lọc ra những người là bạn bè trong danh sách tìm kiếm
        const friends = potentialFriends.filter(friend => friendIds.includes(friend._id.toString()));
        if (!friends.length) {
            return res.status(403).json({ error: "Không có ai trong danh sách là bạn bè của bạn" });
        }

        console.log("keết quả find friend", friends.map(friend => ({
            id: friend._id.toString(),
            fullname: friend.fullname
        })));
        return res.status(200).json(friends.map(friend => ({
            id: friend._id.toString(),
            fullname: friend.fullname
        })));
    } catch (error) {

    }

}
export default {
    handleGetUser, handleFindFriend,
    handleGetIDUser
};
