import {MessagingAdapter} from "../adapter-contract.js";
export class IMessageAdapter extends MessagingAdapter{
 constructor(){super("imessage")}
 async normalizeInbound(event){return{provider:this.provider,raw:event}}
 async sendMessage(){throw new Error("An Apple-side messaging bridge is required for autonomous existing-conversation messaging")}
}
