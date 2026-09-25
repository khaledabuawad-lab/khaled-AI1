import {MessagingAdapter} from "../adapter-contract.js";
export class WhatsAppAdapter extends MessagingAdapter{
 constructor(){super("whatsapp")}
 async verifyWebhook(){return false}
 async normalizeInbound(event){return{provider:this.provider,raw:event}}
 async sendMessage(){throw new Error("WhatsApp credentials are required before sending")}
}
