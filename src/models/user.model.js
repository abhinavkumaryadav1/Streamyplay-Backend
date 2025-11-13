import mongoose ,{Schema} from 'mongoose'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
//we cant incrypt password in schema so we use pre hook which is used to run some code before saving the document
const userSchema = new Schema({ 

   username:{
    type:String,
    required:true,
    unique:true,
    lowercase:true,
    trim:true,
    index:true, //B=Tree hash mapping eg: username:abhi ,ajay , b , c ,c ,c ,d.. -> maped to document 123 etc
   },

   email:{
    type:String,
    required:true,
    unique:true,
    lowercase:true,
    trim:true,
   },

   fullName:{
    type:String,
    required:true,
    trim:true,
    index:true,
   },

   avatar:{
    type:String, //coudnary url dete hai
    required:true,
   },

   coverImage:{
    type:String,
   },

   watchHistory:[
{
    type:Schema.Types.ObjectId,
    ref:"Video"
}
],

    password:{
type:String,
required:[true,'password is required'],
},

    refreshToken:{
type:String
},




}, {timestamps:true})

userSchema.pre("save", async function(next){ // **BOHOT kuch hai ya sikhne ko: next hota hai middleware ke liye. ab jab bhi hum kuch bhi change karenge to ye function chalega aur password ko hash karega but hume to jab password change karna ho ya first time password set karna ho tab hi hash karna hai isliye if condition lagayi hai aur negative check kiya hai ki agar password change nahi hua to next function call kar do aur aage badho.
    if(!this.isModified("password")) return next();
    this.password = await bcrypt.hashSync(this.password, 10)
    next()
})

userSchema.methods.isPasswordCorrect  = async function(password) // ye method humne banaya hai taki hum password ko compare kar sake
  {
     return await bcrypt.compare(password, this.password)
  }

userSchema.methods.generateAccessToken = function() // ye method access token banane ke liye hai
{
    return jwt.sign(
        {
            _id:this._id,
            email:this.email,
            username:this.username,
            fullName:this.fullName,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '10d'
        },
        
    )
}

userSchema.methods.generateRefreshToken = function() // ye method refresh token banane ke liye hai
{
    return jwt.sign(
        {
            _id:this._id,
            
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '10d'
        },
        
    )
}


export const User = mongoose.model("User",userSchema)
