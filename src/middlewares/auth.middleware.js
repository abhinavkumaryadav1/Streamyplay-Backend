import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"

export const verifyJWT = asyncHandler(async(req,_,next)=>{

   try {
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")
 
     if(!token)
     {
         throw new ApiError(401,"Unauthorized request - No token provided")
     }

    let decodedToken;
    try {
        decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    } catch (jwtError) {
        // Token is invalid or expired - clear indication for debugging
        if (jwtError.name === 'TokenExpiredError') {
            throw new ApiError(401, "Access token has expired. Please login again.")
        } else if (jwtError.name === 'JsonWebTokenError') {
            throw new ApiError(401, "Invalid access token. Please login again.")
        }
        throw new ApiError(401, "Token verification failed. Please login again.")
    }
 
    const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
 
    if(!user)
    {
     throw new ApiError(401 , "Invalid Access Token - User not found")
    }
 
     req.user = user //req kya hai wo bhi ek object hi hota hai req.user bolne pe object ke andar nayi field bana deta hai suer name ka aur fir user store kara diya
     next()

   } catch (error) {
     // If it's already an ApiError, rethrow it
     if (error instanceof ApiError) {
         throw error
     }
     throw new ApiError(401, error?.message || "Invalid access token")
   }

})
