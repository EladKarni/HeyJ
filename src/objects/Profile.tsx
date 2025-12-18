import { supabase } from "@utilities/Supabase";
import Conversation from "./Conversation";

export default class Profile {
  uid: string;
  profilePicture: string;
  name: string;
  email: string;
  conversations: string[];
  userCode: string;
  oneSignalPlayerId: string | null;

  constructor(
    uid: string,
    profilePicture: string,
    name: string,
    email: string,
    conversations: string[],
    userCode: string,
    oneSignalPlayerId: string | null = null
  ) {
    this.uid = uid;
    this.profilePicture = profilePicture;
    this.name = name;
    this.email = email;
    this.conversations = conversations;
    this.userCode = userCode;
    this.oneSignalPlayerId = oneSignalPlayerId;
  }

  toJSON() {
    return {
      uid: this.uid,
      profilePicture: this.profilePicture,
      name: this.name,
      email: this.email,
      conversations: this.conversations,
      userCode: this.userCode,
      oneSignalPlayerId: this.oneSignalPlayerId,
    };
  }

  toJSONWithoutConversations = () => {
    return {
      uid: this.uid,
      profilePicture: this.profilePicture,
      name: this.name,
      email: this.email,
      userCode: this.userCode,
      oneSignalPlayerId: this.oneSignalPlayerId,
    };
  };

  static fromJSON(data: any) {
    return new Profile(
      data.uid,
      data.profilePicture,
      data.name,
      data.email,
      data.conversations,
      data.userCode || `${data.name}@${Math.floor(Math.random() * 9999)}`, // Fallback for existing profiles
      data.oneSignalPlayerId || null // Fallback for existing profiles
    );
  }
}
