import { supabase } from "./Supabase";

export const markMessageAsRead = async (messageId: string) => {
  console.log("💾 markMessageAsRead START:", messageId);
  try {
    const { error } = await supabase
      .from("messages")
      .update({ isRead: true })
      .eq("messageId", messageId);

    if (error) {
      console.error("❌ Error marking message as read:", error);
      return false;
    } else {
      console.log("✅ markMessageAsRead SUCCESS:", messageId);
      return true;
    }
  } catch (error) {
    console.error("❌ Exception marking message as read:", error);
    return false;
  }
};

