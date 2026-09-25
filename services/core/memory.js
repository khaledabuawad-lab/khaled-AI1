const KEY="khaledMemoryV1";
export function loadMemory(){try{return JSON.parse(localStorage.getItem(KEY)||"[]")}catch{return[]}}
export function addMemory(content,personId=null,importance=1){const m=loadMemory();const item={id:crypto.randomUUID(),content,personId,importance,createdAt:new Date().toISOString()};m.push(item);localStorage.setItem(KEY,JSON.stringify(m));return item}
export function deleteMemory(id){const m=loadMemory().filter(x=>x.id!==id);localStorage.setItem(KEY,JSON.stringify(m))}
