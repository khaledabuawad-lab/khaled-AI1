const OPENAI_URL="https://api.openai.com/v1/responses";
export async function askOpenAI({input,model=process.env.OPENAI_MODEL||"gpt-5.6-luna",instructions=""}){
  if(!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");
  const response=await fetch(OPENAI_URL,{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${process.env.OPENAI_API_KEY}`},body:JSON.stringify({model,instructions,input})});
  const data=await response.json();
  if(!response.ok) throw new Error(data?.error?.message||"OpenAI request failed");
  return data.output_text||"";
}
