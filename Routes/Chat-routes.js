import express from "express";

const router = express.Router();
console.log("Chat routes loaded");
router.get("/test",(req,res)=>{   
    console.log("Chat route test endpoint hit");
    res.send("Hello from the chat route! Connections are working fine.")
    
})

export default router;