import express from "express";
const app=express();
app.use(express.json());
const port=process.env.PORT||3000;

app.get("/health",(_,res)=>res.json({ok:true,service:"khaled-ai-api",version:"0.1.0"}));
app.post("/v1/chat",async(req,res)=>{
  const text=String(req.body?.text||"").trim();
  if(!text)return res.status(400).json({error:"text is required"});
  // AI provider is intentionally not hard-coded until the server secret is configured.
  if(!process.env.AI_API_KEY)return res.status(503).json({error:"AI_API_KEY is not configured"});
  res.status(501).json({error:"AI provider adapter not configured yet"});
});
app.post("/v1/webhooks/whatsapp",(req,res)=>res.status(501).json({error:"WhatsApp credentials/webhook configuration required"}));
app.listen(port,()=>console.log("Khaled AI API listening on "+port));
