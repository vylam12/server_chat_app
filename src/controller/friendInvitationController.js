import FriendInvitation from "../models/friendInvitation.js";
import User from "../models/user.js";


//gửi lời mời
const handleInvited = async (req, res) => {
    try {
        const { idSender, idReciver } = req.body;

        const newInvited = new FriendInvitation({
            id_receiver: idReciver,
            id_sender: idSender,
            status: "pending"
        })
        await newInvited.save();

        res.json({ message: "Invited friend created!", newInvited })
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
const handleAcceptInvited = async (req, res) => {
    try {
        const { idSender, idReciver, status } = req.body;

        const invitedUpdate = await FriendInvitation.findOneAndUpdate(
            { id_receiver: idReciver, id_sender: idSender },
            { status: status },
            { new: true }
        );

        if (!invitedUpdate) {
            return res.status(400).json({ error: "Invitaion not found!" })
        }
        res.json({ message: "Invited friend updated!", invited: invitedUpdate })
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
const handleGetFriend = async (req, res) => {
    try {
        const { userId } = req.params;
        const status = "accepted";
        if (!userId) {
            return res.status(400).json({ error: "Thiếu userId" });
        }

        const friends = await FriendInvitation.find({
            $or: [{ id_sender: userId }, { id_receiver: userId }],
            status: status
        }).sort({ createdAt: 1 });

        const friendIds = friends.map(friend =>
            friend.id_sender.toString() === userId ? friend.id_receiver : friend.id_sender
        );

        const friendDetails = await User.find({ _id: { $in: friendIds } }).select("email fullname avatar");
        console.log("danh sách bạn bè", friendDetails);
        res.status(200).json({
            friend: friendDetails
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const handleGetFriendInvited = async (req, res) => {
    try {
        const { userId } = req.params;

        const status = "pending";
        if (!userId) {
            return res.status(400).json({ error: "Thiếu userId" });
        }

        const invitations = await FriendInvitation.find({
            id_receiver: userId,
            status: status
        }).sort({ createdAt: 1 });

        const senderIds = invitations.map(invite => invite.id_sender);

        const senders = await User.find({ _id: { $in: senderIds } }).select("fullname email")

        const friendInvitations = invitations.map(invite => {
            const senderInfo = senders.find(user => user._id.toString() === invite.id_sender.toString())

            return {
                _id: invite._id,
                senderId: invite.id_sender,
                receiverId: invite.id_receiver,
                status: invite.status,
                createdAt: invite.createdAt,
                senderInfo: senderInfo
            }
        })
        console.log(friendInvitations);



        res.status(200).json({
            friend: friendInvitations
        });


    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const isFriend = async (userId, friendId) => {
    if (!userId || !friendId) return false;

    const friendship = await FriendInvitation.findOne({
        $or: [
            { id_sender: userId, id_receiver: friendId, status: "accepted" },
            { id_sender: friendId, id_receiver: userId, status: "accepted" }
        ]
    });

    return !!friendship;
};

export default {
    handleInvited, handleAcceptInvited, handleGetFriend, handleGetFriendInvited,
    isFriend
};
