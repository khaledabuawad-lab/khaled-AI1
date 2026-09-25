import express from "express";
import {askOpenAI} from "./openai.js";
const app=express();
app.use((req,res,next)=>{res.setHeader("Access-Control-Allow-Origin","*");res.setHeader("Access-Control-Allow-Headers","Content-Type,Authorization");res.setHeader("Access-Control-Allow-Methods","GET,POST,OPTIONS");if(req.method==="OPTIONS")return res.sendStatus(204);next();});\napp.use(express.json({limit:"1mb"}));
const port=process.env.PORT||3000;

app.get("/health",(_,res)=>res.json({ok:true,service:"khaled-ai-api",version:"0.2.0",aiConfigured:Boolean(process.env.OPENAI_API_KEY)}));

app.post("/v1/chat",async(req,res)=>{
  const text=String(req.body?.text||"").trim();
  if(!text)return res.status(400).json({error:"text is required"});
  try{
    const reply=await askOpenAI({
      input:text,
      instructions:"You are Khaled AI, a personal assistant. Detect and respond naturally in the user's language. Supported languages include Arabic, Norwegian, English and Brazilian Portuguese. Be concise, helpful and context-aware. Never claim to have accessed a service unless the integration actually supplied the data."
    });
    res.json({reply});
  }catch(error){
    const message=String(error.message||error);
    res.status(message.includes("OPENAI_API_KEY")?503:502).json({error:message});
  }
});

app.get("/v1/webhooks/whatsapp",(req,res)=>{const mode=req.query["hub.mode"],token=req.query["hub.verify_token"],challenge=req.query["hub.challenge"];if(mode==="subscribe"&&token&&token===process.env.WHATSAPP_VERIFY_TOKEN)return res.status(200).send(challenge);return res.sendStatus(403);});\napp.post("/v1/webhooks/whatsapp",(req,res)=>{res.sendStatus(200);});
app.listen(port,()=>console.log("Khaled AI API listening on "+port));
