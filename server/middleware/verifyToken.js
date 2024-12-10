import jwt from "jsonwebtoken"
import { sendError } from "../utils/response.js";


export const verifyToken = (req,res,next) => {
    const token = req.cookies.access_token;
    if(!token){
        return sendError(res,'Unauthorized',null,401);
    }
    jwt.verify(token,process.env.JWT_SECRET,(err,user)=>{
        if(err) {   
            return sendError(res,'Forbidden',null,403);
        }
        req.userId = user.id;
        next();
    })
}