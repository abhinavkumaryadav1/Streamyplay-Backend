import {Router} from "express"
import { changeCurrentPassword, getCurrentUser, getUserChanelprofile, getWatchHistory, loginUser, logoutUser, refreshAccessToken, registerUser, updateAccountDetails, updateUserAvatar, updateUsercoverImage } from "../controllers/user.controller.js"
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"

const router = Router()

//Postman Tested
router.route("/register").post( //inserted middlware b/w controller passing for img in cloudinary
    upload.fields([
        {
            name:"avatar",
            maxCount:1
        },
        {
            name:"coverImage",
            maxCount:1
        }
    ]),
    registerUser) //controller

//Postman Tested
router.route("/login").post(loginUser)


//secured rotes

//Postman Tested
router.route("/logout").post( verifyJWT , logoutUser ) //middleware lagaya hai bech me taki context mil jaye logout method ko ki koun se user ka refresh token hatana hai

//Postman Tested
router.route("/refresh-token").post(refreshAccessToken)

//Postman Tested
router.route("/change-password").post(verifyJWT,changeCurrentPassword)

//Postman Tested
router.route("/current-user").get(verifyJWT,getCurrentUser)

//Postman Tested
router.route("/update-account").patch(verifyJWT,updateAccountDetails) //patch me rakhna hai cuz kuch deatils hi update ho rhi hai sabko change nahi akrna

router.route("/avatar").patch(verifyJWT,upload.single("avatar"),updateUserAvatar)

router.route("/cover-image").patch(verifyJWT,upload.single("coverImage"),updateUsercoverImage)

//Postman Tested
router.route("/c/:username").get(verifyJWT,getUserChanelprofile)

//Postman Tested
router.route("/history").get(verifyJWT,getWatchHistory)



export default router