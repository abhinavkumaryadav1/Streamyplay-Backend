import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",")
  : [];

app.use(
  cors({
    origin: (origin, callback) => {
      // allow Postman, server-to-server, health checks
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("CORS blocked origin:", origin);
      return callback(null, false); // ❗ IMPORTANT
    },
    credentials: true,
  })
);

// allow preflight
app.options("/*", cors());



app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true,limit:"16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

//Routes import

import userRouter from "./routes/user.routes.js"
import videoRouter from "./routes/video.routes.js"
import likeRouter from "./routes/like.routes.js"
import commentRouter from "./routes/comment.routes.js"
import subscriptionRouter from "./routes/subscription.routes.js"
import dashboardRouter from "./routes/dashboard.routes.js"
import healthcheckRouter from "./routes/healthcheck.routes.js"

//Router declaration
                                    //standard practice for url kuch hai nhi ye api/v1
app.use("/api/v1/user",userRouter) // jaise hi url me /api/v1/user ayega to controle router ke paas jayega aur fir routing wahi se hogi.
                                  //  we can use directly router.get("/register",userregister) but for modularity and big projects we prefer above syntax.

app.use("/api/v1/video",videoRouter) 
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/comment", commentRouter);
app.use("/api/v1/subscriptions", subscriptionRouter);
app.use("/api/v1/healthcheck", healthcheckRouter);
app.use("/api/v1/dashboard", dashboardRouter);




export {app}