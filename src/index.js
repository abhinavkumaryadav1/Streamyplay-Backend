// require('dotenv').config({path: './env'})
import dotenv from "dotenv"
import connectDB from "./db/index.js"
import { app } from "./app.js"

dotenv.config({
    path: '../.env'
})

 
connectDB() 
.then(()=>{
    app.listen(process.env.PORT || 4500 , ()=>{
       console.log(`Server is listening at port : ${process.env.PORT}`);
        
    })
    app.on("error", (error)=>{
        console.log("error: ", error);
        throw error;
    })  
})
.catch((err)=>{
    console.log("MONGO DB CONNECTION FAILED!! ", err);
    
})




/* A way to mange database but very pollted so we will do it modular way.
import express from "express"
const app = express()

(async ()=>{
    try{
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error", (error)=>{
            console.log("error: ",error);
            throw error;            
        })
      
        app.listen(process.env.PORT, ()=>{
            console.log(`app is listening on port ${process.env.PORT}`);
            
        })
        
    }
    catch(error)
    {
        console.log("error: ", error);
        throw error
    }
})() */