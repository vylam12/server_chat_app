import User from "../models/user.js";
import friendInvitationController from "../controller/friendInvitationController.js"
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
            fullname: { $regex: nameFriend, $options: "i" }
        });
        if (!potentialFriends.length) {
            return res.status(404).json({ error: "Không tìm thấy người dùng" });
        }

        const friends = [];
        for (const friend of potentialFriends) {
            if (await friendInvitationController.isFriend(userId, friend._id)) {
                friends.push({ id: friend._id.toString(), fullname: friend.fullname });
            }
        }
        console.log(friends);
        if (!friends.length) {
            return res.status(403).json({ error: "Không có ai trong danh sách là bạn bè của bạn" });
        }

        return res.status(200).json(friends);
    } catch (error) {

    }

}
export default {
    handleGetUser, handleFindFriend,
    handleGetIDUser
};
