import { supabase } from "@utilities/Supabase";
import Conversation from "./Conversation";

export default class Profile {
  uid: string;
  profilePicture: string;
  name: string;
  email: string;
  conversations: string[];
  userCode: string;

  constructor(
    uid: string,
    profilePicture: string,
    name: string,
    email: string,
    conversations: string[],
    userCode: string
  ) {
    this.uid = uid;
    this.profilePicture = profilePicture;
    this.name = name;
    this.email = email;
    this.conversations = conversations;
    this.userCode = userCode;
  }

  toJSON() {
    return {
      uid: this.uid,
      profilePicture: this.profilePicture,
      name: this.name,
      email: this.email,
      conversations: this.conversations,
      userCode: this.userCode,
    };
  }

  toJSONWithoutConversations = () => {
    return {
      uid: this.uid,
      profilePicture: this.profilePicture,
      name: this.name,
      email: this.email,
      userCode: this.userCode,
    };
  };

  static fromJSON(data: any) {
    return new Profile(
      data.uid,
      data.profilePicture,
      data.name,
      data.email,
      data.conversations,
      data.userCode || `${data.name}@${Math.floor(Math.random() * 9999)}` // Fallback for existing profiles
    );
  }
}
