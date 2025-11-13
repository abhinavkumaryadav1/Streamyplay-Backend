import mongoose , {Schema} from "mongoose"


const LikeSchema = new Schema({

video:{
    type:Schema.Types.ObjectId,
    ref:"Video"
},

comment:{
    type:Schema.Types.ObjectId,
    reg:"Comment"
},
tweet:{
    type:Schema.Types.ObjectId,
    reg:"Tweet"
},
likedBy:{
    type:Schema.Types.ObjectId,
    reg:"User"
}


},{timestamps:true})



export const Like = mongoose.model("Like",LikeSchema)