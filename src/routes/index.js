import express from "express";
import translateController from "../controller/translateController.js";
import quizController from "../controller/quizController.js";
import authController from "../controller/authController.js";
import friendInvitationController from "../controller/friendInvitationController.js";
import messageController from "../controller/messagesController.js";
import userController from "../controller/userController.js";
const router = express.Router();

const initWebRoutes = (app) => {

    router.get("/test_router", translateController.he)
    router.post("/translate", translateController.handleTranslate)

    router.post("/findVocabulary", translateController.handleFindVocabulary)
    router.post("/saveVocabulary", translateController.handleSaveVocabulary)

    router.get("/quiz", quizController.handleQuizCreation)

    router.post("/register", authController.handleRegister)
    router.post("/login", authController.handleLogin)
    router.post("/forgot-password-otp", authController.handleForgotPassword)
    router.post("/verify-otp", authController.verifyOTP)
    router.post("/reset-password", authController.hanleResetPasswordWithOTP)

    //gửi lời mời kết bạn
    router.post("/friend-invited", friendInvitationController.handleInvited)
    router.post("/accept-friend-invited", friendInvitationController.handleInvited)
    //lấy list bạn bè
    router.post("/get-friend/:userId", friendInvitationController.handleGetFriend)
    //lấy list lời mời kết bạn
    router.post("/get-friend-invited/:userId", friendInvitationController.handleGetFriendInvited)

    router.post("/create-chat", messageController.handleCreateChat)
    router.post("/send-message", messageController.handleSendMessage)
    router.get("/get-message/:chatId", messageController.handleGetMessages)
    router.get("/messages/:chatId", messageController.getMessages)

    router.get("/users/:userId", userController.handleGetUser)
    return app.use("/", router);
}


export default initWebRoutes;