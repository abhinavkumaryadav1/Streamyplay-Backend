import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async(userId)=>{

  try {

      const user = await User.findById(userId) //finding the user to which we need to set Tokens
      const accessToken =  user.generateAccessToken() //previously built method which generates token
      const refreshToken = user.generateRefreshToken()
      user.refreshToken = refreshToken //setting the user's refresh token object to newly created token
      await user.save({validateBeforeSave:false}) //Mongoose instance method that writes (or updates) the document to your MongoDB database.
      //validate wala is liye false hai kyuunki jab save karte hai to baki fields jaise pass username bhi vapas check karne lagta hai jo hume nahi karwana

      return {accessToken,refreshToken};


  } catch (error) {
    throw new ApiError(500,"Something went wrong while generating Access and Refresh Token")
  }
  
}



const registerUser = asyncHandler(async (req,res) => {
   
//get user detail from front frontend
//validation : not empty
//check if user already exists or not : email.username
//check fro image and avatar
//upload them to cloudinary , check avatar
//create user object - create entry in db
// remove password and refresh token fieds from response
//check if user is craeted successfully? return res :return error;

//jo bhi data forms ya body se ata hai wo aise lete hai->
 const {fullName , username , email , password } = req.body 
 console.log("email: ", email , fullName , username , password);

 //you can also check one by one if they are empty and throw error but for now we are doing like this complex but little
 if (
   [fullName, username, email, password].some(
     (field) => !field || field.trim() === "" //.some checks if anyine is not present it returns true
   )
 ) {
   throw new ApiError(400, "All fields are required");
 }

 const existedUser= await User.findOne({
    $or: [{username} , {email}] //$or is a MongoDB logical operator.It takes an array of conditions and returns documents that match at least one.
})

if(existedUser)
{
    throw new ApiError(409 , "User Already exists")
}
 
//like expres gives req.body access likewise multer gives req.files access
//Multer is a Node.js middleware (usually used with Express) that helps you handle file uploads.

 const avatarLocalPath = req.files?.avatar[0]?.path; //constional check for if that thing exist then only do it & [0] isliye cuz in object [0]th index pe hota hai full path log karke dekh har ek ek chesse ko

 let coverImageLocalPath ;
 if(req.files &&  Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0)    //optional chaining ki hai kyunki agar files hi nahi hai to kya , agar coverimage nahi to kya , agar array ke andar kuch nahi to 
   {
      coverImageLocalPath =  req.files.coverImage[0].path
   } 

if (!avatarLocalPath) {
  throw new ApiError(400, "Avatar file is required");
}

 const avatar = await uploadOnCloudinary(avatarLocalPath);
 const coverImage = coverImageLocalPath
   ? await uploadOnCloudinary(coverImageLocalPath):"";

 if(!avatar) {
   throw new ApiError(400, "Avatar file is required");
 }

 const user = await User.create({ // .create(shortcut) use kiya hai to .save use karne ki zaroorat nahi hai
   fullName,
   avatar: avatar.url,
   coverImage : coverImage?.url || "", //kyunki humne kabhi check hi nahi kiya ki cover umage hai bhi ya nahi
   email,
   password,
   username:username.toLowerCase()

})

const createdUser = await User.findById(user._id).select(
   "-password -refreshToken"
) // mongodb creates this if this exists -> user hai nahi to nahi bana user

if(!createdUser)
{
      throw new ApiError(500,"Something went wrong while registering user")

}

// return res.redirect("/Homepage.html")

return res.status(201).json(
   new ApiResponse(200,createdUser,"User registered successfully")
)

})

  const loginUser = asyncHandler(async(req,res)=>{

    //req.body->data
    //validate username and password format
    //find user? check password : user not exist
    //password correct? generate access and refresh token : error
    //generated? send to cokkies : error

    const {email , username , password} = req.body

    

    if ((!email && !username) || !password) {
      throw new ApiError(
        400,
        "Username/email and password are required"
      );
    }
    

    const query = [];

if (username) query.push({ username: username.toLowerCase() });
if (email) query.push({ email: email.toLowerCase() });

const user = await User.findOne({ $or: query });



if(!user)
{
  throw new ApiError(404,"User Does not exists")
}

const isPasswordValid = await user.isPasswordCorrect(password)

if(!isPasswordValid)
{
  throw new ApiError(401,"password is incorrect")
}

  const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id)

  //loggedinuser is liye bnaya hai kyuni abhi jo refres token bnaya wo to agya but pehle user se refrnce liya tha to refresh abhi empty hi hai
  const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
  //cokkies
  const options = {
    httpOnly:true,
    secure:true,
    sameSite: "none",
    maxAge: 10 * 24 * 60 * 60 * 1000, // 10 days in milliseconds
    path: "/"
  }

  return res.status(200) //thoda 
  .cookie("accessToken",accessToken,options)
  .cookie("refreshToken",refreshToken,options)
  .json(

    new ApiResponse(200,
      {
        user:loggedInUser , accessToken , refreshToken
      },
      "User LoggedIn Successfully"
    )

  )


  })  


const logoutUser = asyncHandler(async(req,res)=>{

  //auth.middleware me naya object bnaya haui to object user mil gya id nikalo aur delete kardo token simple
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset:{refreshToken: 1} //req jisme user object bna diya tha auth.middleware me wo aya id nikali aur databse se hata diya refresh tocken ko
    },
    {
      new:true
    }
  )

  const options = {
    httpOnly:true,
    secure:true,
    sameSite: "none",
    maxAge: 10 * 24 * 60 * 60 * 1000, // 10 days in milliseconds
    path: "/"
  }

  return res
  .status(200)
  .clearCookie("accessToken",options) //data base se hatane ke baad ab current browser cokkies ko bhi clear kardiya
  .clearCookie("refreshToken",options)
  .json(
    new ApiResponse(200,{},"User LoggedOut Successfully")
  )

})

const refreshAccessToken = asyncHandler(async(req,res)=>{
     const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

     if(!incomingRefreshToken)
     {
      throw new ApiError(401,"Unauthorized Request")
     }

     try {
      const decodedToken = jwt.verify(  // ye pura object  return karta hai jisme user ki details bhi hoti hai jaise user id
       incomingRefreshToken,
       process.env.REFRESH_TOKEN_SECRET,
      )
 
      const user = await User.findById(decodedToken?._id)
 
      if(!user)
      {
       throw new ApiError(401,"Invalid refresh token")
      }
 
      if(incomingRefreshToken !== user?.refreshToken)
      {
       throw new ApiError(401,"Refresh token is expired or used")
      }
 
      const options = {
       httpOnly:true,
       secure:true,
       sameSite: "none",
       maxAge: 10 * 24 * 60 * 60 * 1000, // 10 days in milliseconds
       path: "/"
      }
 
      const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id);
 
      res
      .status(200)
      .cookie("accessToken",accessToken,options)
      .cookie("refreshToken",refreshToken,options)
      .json(
       new ApiResponse(
         200,
         {accessToken,refreshToken:refreshToken},
         "Access token is refreshed successfully"
       
       )
      )
     } 
     
     catch (error) {
      throw new ApiError(401,"Invalid refresh token")
     }




})

const changeCurrentPassword = asyncHandler(async(req,res)=>{

  const {oldPassword , newPassword} = req.body

  const user = await User.findById(req.user?._id) //req.user naya object bnaya hai auth middleware ne. routes me change paswword method se pehle middle ware lagega jaise logut method me lagaya tha tab work karega

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

  if(!isPasswordCorrect)
  {
    throw new ApiError(400,"Invalid old password")
  }

  user.password = newPassword
  await user.save({validateBeforeSave:false})

  return res
  .status(200)
  .json(
    new ApiResponse(
    200,
    {},
    "Password changed successfully")
  )
  
})

const getCurrentUser = asyncHandler(async(req,res)=>{

return res
.status(200)
.json(new ApiResponse(200,req.user,"Current user fetched successfully"))

})

const updateAccountDetails = asyncHandler(async(req,res)=>{

const {fullName,email} = req.body

if(!fullName || !email)
{
  throw new ApiError(400,"username and email is required")
}

const user = await User.findByIdAndUpdate( //pehle ek hi update karte the , multiple karna hai to aise karo aur new lagay hai jo updated info return karega
  req.user?._id,
  {
    $set:{
      fullName,   //ES6 syntax (fullName:fullName) same thing
      email:email
    }
  },
  {new:true}
).select("-password")

return res
.status(200)
.json(new ApiResponse(
  200,user,"User details updated successfully"
))

})

const updateUserAvatar = asyncHandler(async (req,res)=>{

  const avatarLocalPath = req.file?.path

  if(!avatarLocalPath)
  {
    throw new ApiError(400,"Avatar file is missing")
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath)

  if(!avatar.url)
  {
    throw new ApiError(400,"Avatar upload failed in cloudinary")
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set:{
      avatar:avatar.url
          }
  } ,
    {
      new:true
    }
  ).select("-password")


return res
.status(200)
.json(new ApiResponse(
  200,user,"avatar updated successfully"
))

})

const updateUsercoverImage = asyncHandler(async (req,res)=>{

  const coverImageLocalPath = req.file?.path

  if(!coverImageLocalPath)
  {
    throw new ApiError(400,"Cover image file is missing")
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  if(!coverImage.url)
  {
    throw new ApiError(400,"Cover image upload failed in cloudinary")
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set:{
      coverImage:coverImage.url
          }
  } ,
    {
      new:true
    }
  ).select("-password")


return res
.status(200)
.json(new ApiResponse(
  200,user,"coverImage updated successfully"
))

})

const getUserChanelprofile = asyncHandler(async(req,res)=>{

  const {username} = req.params
  if(!username?.trim())
  {
    throw new ApiError(400,"username is missing")
  }
  
  //MongoDB Aggreagation Pipeline code for subscriber and subscibed To

  const channel = await User.aggregate(
    [

      {
        $match:{
        username:username?.toLowerCase() //tu general way may bhi kar sata hai pehle find kar user me fir store kar then match vagera kara but match directly dhonndhleta hai wo perticular document to kyun karnega find.
      }
      },

      {
        $lookup:{ //collection -> ware house & data models -> blueprint of how stored
          from:"subscriptions", //-> subscription model ->at export lowecase hojata hai aur plural ho jata hai mongo db me yaad kar
          localField: "_id",
          foreignField: "channels",
          as: "subscribers"
        }
      },

      {
        $lookup:{  // for how many user have subscribed
          from:"subscriptions",
          localField: "_id",
          foreignField: "subscriber",
          as: "subscribedto"
        }
      },

      {
        $addFields:{
          subscribersCount:{
            $size:"$subscribers"
          },
          channelsSubscribedToCount:{
            $size:"$subscribedto"
          },
          isSubscribed:{
            $cond:{
              if:{$in:[req.user?._id , "$subscribers.subscriber"]}, // in dono array aur object me seach kar leta hai || subscribers to pipeline se aya aaur subscruber data model wala hai kyunki utha to vasie hi model se rha hai aur save karega to blue print bhi same hi hoga na
              then:true,
              else:false
            }
          }
        }
      },

      {
        $project:{ //projection saves and projects only that field which you mark true(saves time network load speed)
          
          fullName:1,
          username:1,
          subscribersCount:1,
          channelsSubscribedToCount:1,
          isSubscribed:1,
          avatar:1,
          coverImage:1,
          email:1

        }
      }
      

    ]
  )
  if(!channel?.length)
  {
    throw new ApiError(404, "channel does not exists")
  }
      console.log("channel inforations extracted: ",channel);

      return res
      .status(200)
      .json(
        new ApiResponse(
          200,channel[0],"Channel details fetched successfully"
        )
      )
      
})

const getWatchHistory = asyncHandler(async (req,res)=>{

const user = await User.aggregate(
  [
  {

$match:{
  _id: new mongoose.Types.ObjectId(req.user._id) // this is because if u see in mongo DB the actual id is string and looks like "object('3442434242')" and when we use mongoose it directly converts the ids to anf forth beacuse we only get number when we extract id 
                                                // but whenever we are using aggregation pipeline the mongoose feature does not work so to have actual Id we have to use mongoose here.                                                

}
},

{
  $lookup:{

    from:"videos",
    localField:"watchHistory",
    foreignField:"_id",
    as:"watchHistory",
    pipeline:[        //user se video me aggreagte kiya ab video se vapas user aggreagate karna hai data isliye NESTING LOOKUP AGRREAGATE
      {
        $lookup:{
          from:"User",
          localField:"owner",
          foreignField:"_id",
          as:"owner",
          pipeline:[ //further one more pipeline for formated data we dont need everything. NOTE: we can also this this in 2nd stage of pipeline at the end. try it by yourself and find out the diffrence
            {
              $project:{
                fullName:true,
                username:true,
                avatar:true
              }
            }
          ]
        }
      },
      {// for frontend optimisation because AP' gives array and evertime we have to extract first value from it
        $addFields:{
          owner:{
            $first:"$owner"
          }
        }
      }
    ]
  }
}

]
)

return res
.status(200)
.json(
  new ApiResponse(
    200,
    user[0].watchHistory,
    "Watch history fetched successfuly"
  )
)

})


export {registerUser,loginUser,logoutUser,refreshAccessToken,changeCurrentPassword,getCurrentUser,updateAccountDetails,updateUserAvatar,updateUsercoverImage,getUserChanelprofile , getWatchHistory}

