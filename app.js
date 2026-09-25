const $=id=>document.getElementById(id);
let reminders=JSON.parse(localStorage.getItem('khaledReminders')||'[]');

function save(){localStorage.setItem('khaledReminders',JSON.stringify(reminders));renderReminders()}
function renderReminders(){
 $('reminders').innerHTML=reminders.map((r,i)=>`<div class="reminder">⏰ ${r.text}<br><small>${new Date(r.time).toLocaleString()}</small></div>`).join('');
}
function addMessage(text,who='ai'){
 const d=document.createElement('div'); d.className='msg '+who; d.textContent=text;
 $('messages').appendChild(d); $('messages').scrollTop=99999;
}
$('sendBtn').onclick=()=>{
 const text=$('userInput').value.trim(); if(!text)return;
 addMessage(text,'user'); $('userInput').value='';
 addMessage('فهمت عليك. هذه النسخة الأولى من Khaled AI. قريباً سنربط هذه المحادثة بعقل AI حقيقي وآمن.');
};
$('userInput').addEventListener('keydown',e=>{if(e.key==='Enter')$('sendBtn').click()});

$('addReminder').onclick=()=>{
 const text=$('reminderText').value.trim(),time=$('reminderTime').value;
 if(!text||!time){alert('اكتب التذكير واختر الوقت');return}
 reminders.push({text,time,done:false});save();
 $('reminderText').value=''; $('reminderTime').value='';
 if(Notification.permission==='default')Notification.requestPermission();
 alert('تم حفظ التذكير ✅');
};
setInterval(()=>{
 const now=Date.now();
 reminders.forEach(r=>{
   if(!r.done && new Date(r.time).getTime()<=now){
     r.done=true; save();
     if(Notification.permission==='granted')new Notification('Khaled AI',{body:r.text});
     alert('🔔 Khaled AI: '+r.text);
     if('speechSynthesis' in window){
       speechSynthesis.speak(new SpeechSynthesisUtterance(r.text));
     }
   }
 })
},15000);

$('translateBtn').onclick=()=>{
 const text=$('translateInput').value.trim();
 if(!text)return;
 $('translationResult').textContent='ميزة الترجمة الذكية ستكون مربوطة بمحرك AI في المرحلة التالية.';
};
renderReminders();

if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');


function detectLanguage(text){
  if(/[\u0600-\u06FF]/.test(text)) return 'ar';
  if(/[ãõçáéíóúâêô]/i.test(text)) return 'pt';
  if(/\b(og|jeg|du|ikke|hva|det|skal|har)\b/i.test(text)) return 'no';
  return 'en';
}
function assistantReply(text){
  const lang=detectLanguage(text);
  const replies={
    ar:'فهمت. أنا Khaled AI، وسأتعامل مع اللغة والسياق تلقائياً.',
    pt:'Entendi. Eu sou o Khaled AI e vou lidar automaticamente com o idioma e o contexto.',
    no:'Jeg forstår. Jeg er Khaled AI og håndterer språk og kontekst automatisk.',
    en:'I understand. I’m Khaled AI, and I’ll handle the language and context automatically.'
  };
  return replies[lang];
}
const originalSend=$('sendBtn').onclick;
async function callKhaledAPI(text){return null;}
$('sendBtn').onclick=()=>{
  const text=$('userInput').value.trim(); if(!text)return;
  addMessage(text,'user'); $('userInput').value='';
  const live=await tryLiveChat(text);
  addMessage(live||assistantReply(text));
};
\nconst tabs=[...document.querySelectorAll('.tab')];
tabs.forEach(tab=>tab.addEventListener('click',()=>{
  tabs.forEach(t=>t.classList.remove('active')); tab.classList.add('active');
  const target=tab.dataset.section;
  document.querySelectorAll('main > .card').forEach(s=>{
    if(s.id==='chat') s.hidden=target!=='chat';
    else s.hidden=s.id!==target;
  });
}));
document.querySelectorAll('main > .card').forEach(s=>{if(s.id!=='chat')s.hidden=true});
document.querySelectorAll('.tab').forEach(tab=>tab.addEventListener('click',()=>{const target=tab.dataset.section;if(target==='peopleCard'){document.getElementById('peopleCard').hidden=false}}));

const memoryStore=JSON.parse(localStorage.getItem('khaledMemoryV1')||'[]');
function renderMemory(){const el=$('memoryList');if(!el)return;el.innerHTML=memoryStore.map(m=>'<div class="reminder">'+m.content+'</div>').join('')}
if($('saveMemory'))$('saveMemory').onclick=()=>{const text=$('memoryInput').value.trim();if(!text)return;memoryStore.push({id:crypto.randomUUID(),content:text,createdAt:new Date().toISOString()});localStorage.setItem('khaledMemoryV1',JSON.stringify(memoryStore));$('memoryInput').value='';renderMemory()};
renderMemory();

async function tryLiveChat(text){
  try{
    const base=localStorage.getItem("khaledApiUrl");
    if(!base) return null;
    const r=await fetch(base.replace(/\/$/,'')+"/v1/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text})});
    if(!r.ok)return null;
    const data=await r.json();
    return data.reply||data.message||null;
  }catch{return null}
}

if($('apiUrl')){ $('apiUrl').value=localStorage.getItem("khaledApiUrl")||""; $('saveApiUrl').onclick=()=>{const v=$('apiUrl').value.trim().replace(/\/$/,'');if(v)localStorage.setItem("khaledApiUrl",v);else localStorage.removeItem("khaledApiUrl");$('apiStatus').textContent=v?"Saved.":"Local API connection removed.";}; }
