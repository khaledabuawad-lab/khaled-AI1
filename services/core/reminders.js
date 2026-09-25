export function normalizeReminder(text,dueAt,timezone=Intl.DateTimeFormat().resolvedOptions().timeZone){return{id:crypto.randomUUID(),text,dueAt:new Date(dueAt).toISOString(),timezone,status:"pending",source:"user"}}
export function isDue(reminder,now=Date.now()){return reminder.status==="pending"&&new Date(reminder.dueAt).getTime()<=now}
