import express from "express";
import translateController from "../controller/translateController.js";
import quizController from "../controller/quizController.js";
import authController from "../controller/authController.js";
import friendInvitationController from "../controller/friendInvitationController.js";
import messageController from "../controller/messagesController.js";
import userController from "../controller/userController.js";
import vocabularyController from "../controller/vocabularyController.js";

const router = express.Router();

const initWebRoutes = (app) => {
    router.post("/translate", translateController.handleTranslate)

    router.post("/findVocabulary", vocabularyController.handleFindVocabulary)
    router.post("/saveVocabulary", vocabularyController.handleSaveVocabulary)
    router.post("/deleteVocabulary", vocabularyController.handleDeleteVocabulary)

    router.post("/generate-quiz", quizController.handleQuizCreation)
    router.get("/get-quiz/:quizId", quizController.handleGetQuiz)
    router.post("/update-result-quiz", quizController.handleUpdateResultQuiz)

    router.post("/register", authController.handleRegister)
    router.post("/login", authController.handleLogin)
    router.post("/forgot-password-otp", authController.handleForgotPassword)
    router.post("/verify-otp", authController.verifyOTP)
    router.post("/reset-password", authController.hanleResetPasswordWithOTP)

    //gửi lời mời kết bạn
    router.post("/friend-invited", friendInvitationController.handleInvited)
    router.post("/accept-friend-invited", friendInvitationController.handleAcceptInvited)
    //lấy list bạn bè
    router.get("/get-friend/:userId", friendInvitationController.handleGetFriend)
    //lấy list lời mời kết bạn
    router.get("/get-friend-invited/:userId", friendInvitationController.handleGetFriendInvited)




    router.post("/create-chat", messageController.handleCreateChat)
    router.post("/send-message", messageController.handleSendMessage)
    router.get("/get-message/:chatId", messageController.handleGetMessages)
    router.get("/messages/:chatId", messageController.getMessages)
    router.get("/get-list-chat/:userId", messageController.getListChat)
    router.post("/delete-chat", messageController.handleDeleteChat)
    router.post("/check-exist-chat", messageController.checkExistingChat)
    router.post("/save-fcm-token", messageController.saveFCMToken)


    router.get("/users/:userId", userController.handleGetUser)
    router.get("/get-idUser/:userId", userController.handleGetIDUser)
    router.get("/find-friend", userController.handleFindFriend)

    router.get("/find-user/:userId", userController.handleFriendUser)

    return app.use("/", router);
}


export default initWebRoutes;