const $=id=>document.getElementById(id);
const API_KEY="khaledApiUrl";
let reminders=JSON.parse(localStorage.getItem("khaledReminders")||"[]");
let memoryStore=JSON.parse(localStorage.getItem("khaledMemoryV1")||"[]");

function apiBase(){return (localStorage.getItem(API_KEY)||"https://khaled-ai-api.onrender.com").replace(/\/$/,"")}
function escapeHtml(v){return String(v).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
function addMessage(text,who="ai"){const d=document.createElement("div");d.className="msg "+who;d.textContent=text;$("messages")?.appendChild(d);$("messages")?.lastElementChild?.scrollIntoView({behavior:"smooth",block:"end"})}
function renderReminders(){$("reminders").innerHTML=reminders.map(r=>`<div class="reminder">⏰ <strong>${escapeHtml(r.text)}</strong><br><small>${new Date(r.time).toLocaleString()}</small></div>`).join("")}
function renderMemory(){$("memoryList").innerHTML=memoryStore.map(m=>`<div class="memory-item">🧠 ${escapeHtml(m.content)}</div>`).join("")}
function saveReminders(){localStorage.setItem("khaledReminders",JSON.stringify(reminders));renderReminders()}
async function syncCloudData(){try{const [mr,rr]=await Promise.all([fetch(apiBase()+"/v1/memories"),fetch(apiBase()+"/v1/reminders")]);if(mr.ok){const d=await mr.json();memoryStore=d.memories||memoryStore;localStorage.setItem("khaledMemoryV1",JSON.stringify(memoryStore));renderMemory()}if(rr.ok){const d=await rr.json();reminders=(d.reminders||[]).map(r=>({id:r.id,text:r.title,time:r.remind_at,done:r.status!=="pending"}));localStorage.setItem("khaledReminders",JSON.stringify(reminders));renderReminders()}}catch{}}
async function jsonPost(path,body){const r=await fetch(apiBase()+path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});if(!r.ok)throw new Error((await r.text())||"Request failed");return r.json()}
async function health(){try{const r=await fetch(apiBase()+"/health");const d=await r.json();$("connectionBadge").textContent=d.aiConfigured?"AI online":"API online";$("connectionBadge").className="badge "+(d.aiConfigured?"ok":"");$("aiIntegration").textContent=d.aiConfigured?"Connected":"Needs key";$("apiStatus").textContent=d.aiConfigured?"Connected to Khaled AI API.":"API reachable, but AI key is not configured.";return d}catch{$("connectionBadge").textContent="Offline";$("connectionBadge").className="badge error";$("aiIntegration").textContent="Offline";$("apiStatus").textContent="Could not reach the API.";return null}}
async function plan(text){try{return (await jsonPost("/v1/agent/plan",{text,context:"Current local time: "+new Date().toISOString()})).plan}catch{return null}}
async function sendMessage(){
 const input=$("userInput"),text=input?.value.trim();if(!text)return;input.value="";addMessage(text,"user");addMessage("Thinking…","ai");const pending=$("messages").lastElementChild;
 const p=await plan(text);
 try{
  if(p?.action==="investment"){const d=await jsonPost("/v1/investments/analyze",{question:text});pending.textContent=d.answer||p.response;return}
  if(p?.action==="reminder"&&p.reminder_at&&p.message){try{const d=await jsonPost("/v1/reminders",{title:p.message,remind_at:p.reminder_at});reminders.push({id:d.reminder?.id,text:p.message,time:p.reminder_at,done:false});saveReminders()}catch{reminders.push({text:p.message,time:p.reminder_at,done:false});saveReminders()}pending.textContent=p.response||"Reminder saved.";return}
  if(p?.action==="translate"&&p.message){pending.textContent=p.message;return}
  if(p?.action==="send_message"){pending.textContent="I prepared the message. Sending will be enabled when the corresponding WhatsApp/Apple connection is authorized.";return}
  if(p?.response){pending.textContent=p.response;return}
  const d=await jsonPost("/v1/chat",{text});pending.textContent=d.reply||"I couldn't get a response.";
 }catch(e){pending.textContent="Khaled AI could not complete that request yet: "+e.message}
}
$("sendBtn").onclick=sendMessage;$("userInput").onkeydown=e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage()}}
document.querySelectorAll("[data-prompt]").forEach(b=>b.onclick=()=>{$("userInput").value=b.dataset.prompt;$("chat").hidden=false;sendMessage()});
$("addReminder").onclick=()=>{const text=$("reminderText").value.trim(),time=$("reminderTime").value;if(!text||!time)return alert("Please enter a reminder and time.");reminders.push({text,time,done:false});saveReminders();$("reminderText").value="";$("reminderTime").value=""};
$("saveMemory").onclick=async()=>{const text=$("memoryInput").value.trim();if(!text)return;try{const d=await jsonPost("/v1/memories",{content:text,category:"general"});memoryStore.unshift(d.memory)}catch{memoryStore.push({id:crypto.randomUUID(),content:text,createdAt:new Date().toISOString()});localStorage.setItem("khaledMemoryV1",JSON.stringify(memoryStore))}$("memoryInput").value="";renderMemory()};
$("translateBtn").onclick=async()=>{const text=$("translateInput").value.trim(),lang=$("targetLang").value;if(!text)return;const result=$("translationResult");result.textContent="Translating…";try{const d=await jsonPost("/v1/chat",{text:`Translate this naturally into ${lang==="pt"?"Brazilian Portuguese":lang==="no"?"Norwegian":lang==="ar"?"Arabic":"English"}. Return only the translation.\\n\\n${text}`});result.textContent=d.reply||"No translation returned."}catch(e){result.textContent=e.message}};
$("saveApiUrl").onclick=()=>{const v=$("apiUrl").value.trim().replace(/\/$/,"");if(v)localStorage.setItem(API_KEY,v);else localStorage.removeItem(API_KEY);health()};
document.querySelectorAll(".tab").forEach(tab=>tab.onclick=()=>{document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));tab.classList.add("active");const target=tab.dataset.section;document.querySelectorAll("main>.card").forEach(s=>s.hidden=s.id!==target)});
$("apiUrl").value=apiBase();renderReminders();renderMemory();health().then(syncCloudData);
if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
