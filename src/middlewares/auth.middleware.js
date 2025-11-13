import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"

export const verifyJWT = asyncHandler(async(req,_,next)=>{

   try {
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")
 
     if(!token)
     {
         throw new ApiError(401,"unauthorised request")
     }
 
    const decodedToken = jwt.verify(token , process.env.ACCESS_TOKEN_SECRET)
 
    const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
 
    if(!user)
    {
     throw new ApiError(401 , "Invalid Access Token")
    }
 
     req.user = user //req kya hai wo bhi ek object hi hota hai req.user bolne pe object ke andar nayi field bana deta hai suer name ka aur fir user store kara diya
     next()

   } catch (error) {
     throw new ApiError(401,error?.message || "Invalid access token")
   }

})
