const asyncHandler = (requestHandeler) => {
     return (req,res,next)=>{
        Promise.resolve(requestHandeler(req,res,next)).catch((err)=>
       next(err) )
    }
}

export {asyncHandler}

//you can also do this usieng async await try catch block