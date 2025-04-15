import User from "../models/user.js";
import FriendInvitation from "../models/friendInvitation.js"
import { cloudinary } from "../config/cloudinary.js";
import fs from 'fs';
import { auth } from "../config/firebase.js"
const handleGetUser = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ error: "Thiếu userId" });
        }
        const user = await User.findOne({ id: userId })
            .select("id email avatar fullname")
            .sort({ createdAt: 1 });
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
            $or: [
                { fullname: { $regex: new RegExp(nameFriend, "i") } },
                { email: { $regex: new RegExp(nameFriend, "i") } }
            ]
        }).limit(10);
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
            id: friend.id.toString(),
            fullname: friend.fullname,
            avatar: friend.avatar
        })));
        return res.status(200).json(friends.map(friend => ({
            id: friend.id.toString(),
            fullname: friend.fullname,
            avatar: friend.avatar
        })));
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Lỗi server" });
    }

}

const handleFriendUser = async (req, res) => {
    try {
        const { nameFriend, userId } = req.query;
        console.log("nameFriend", nameFriend, "userId", userId)
        if (!nameFriend || !userId) {
            return res.status(400).json({ error: "Thiếu data" });
        }

        const potentialFriends = await User.find({
            fullname: { $regex: new RegExp(nameFriend, "i") },
            _id: { $ne: userId }
        }).limit(10);

        console.log("potentialFriends", potentialFriends)
        if (!potentialFriends.length) {
            return res.status(404).json({ error: "Không tìm thấy người dùng" });
        }

        const friendInvitations = await FriendInvitation.find({
            $or: [
                { id_sender: userId, status: "accepted" },
                { id_receiver: userId, status: "accepted" }
            ]
        });

        const friendIds = new Set();
        friendInvitations.forEach(invite => {
            if (invite.id_sender.toString() === userId) {
                friendIds.add(invite.id_receiver.toString());
            } else {
                friendIds.add(invite.id_sender.toString());
            }
        });

        const friends = [];
        const notFriends = [];

        potentialFriends.forEach(user => {
            const userData = {
                id: user._id.toString(),
                fullname: user.fullname
            };
            if (friendIds.has(user._id.toString())) {
                friends.push(userData);
            } else {
                notFriends.push(userData);
            }
        });
        console.log("friends", friends, "notFriends", notFriends)
        return res.status(200).json({ friends: friends, notFriends: notFriends });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Lỗi server" });
    }
};


const handleChangePassword = async (req, res) => {
    try {
        const { idToken, newPassword } = req.body;

        if (!idToken || !newPassword) {
            return res.status(400).json({ error: "Thiếu token hoặc mật khẩu mới" });
        }

        const decodedToken = await auth.verifyIdToken(idToken);
        const uid = decodedToken.uid;

        const user = await User.findOne({ id: uid });
        if (!user) {
            return res.status(404).json({ error: "Người dùng không tồn tại" });
        }

        if (user.provider !== 'password') {
            return res.status(400).json({ error: "Tài khoản Google không thể đổi mật khẩu" });
        }

        await auth.updateUser(uid, { password: newPassword });

        res.json({ message: "Đổi mật khẩu thành công" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Lỗi server" });
    }
};
const hanldeUpdateUser = async (req, res) => {
    try {
        const { userId, gender, birthDay } = req.body;
        const updateData = {};
        if (gender) updateData.gender = gender;
        if (birthDay) updateData.birthDay = new Date(birthDay);
        // Xử lý upload avatar nếu có
        let avatarUrl = null;
        if (req.file) {
            avatarUrl = await uploadAvatarToCloudinary(req.file.path);
            // Xoá file tạm sau khi upload
            fs.unlinkSync(req.file.path);
        }

        // Thêm avatar vào updateData nếu có
        if (avatarUrl) updateData.avatar = avatarUrl;

        // Cập nhật thông tin người dùng
        const updatedUser = await User.findOneAndUpdate(
            { id: userId },
            { $set: updateData },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (avatarUrl) {
            await auth.updateUser(userId, {
                photoURL: avatarUrl,
            });
        }

        res.json({
            message: 'User profile updated successfully',
            user: updatedUser,
        });

    } catch (error) {
        console.error('Update user profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
};
const uploadAvatarToCloudinary = async (filePath) => {
    const uploadResult = await cloudinary.uploader.upload(filePath, {
        folder: 'avatars',
    });
    return uploadResult.secure_url;
};
export default {
    handleGetUser, handleFindFriend, handleFriendUser,
    handleGetIDUser, handleChangePassword, hanldeUpdateUser

};
