import { supabase } from "./Supabase";
import AppLogger from "@/utilities/AppLogger";

export const markMessageAsRead = async (messageId: string) => {
  AppLogger.debug("💾 markMessageAsRead START:", messageId);
  try {
    const { error } = await supabase
      .from("messages")
      .update({ isRead: true })
      .eq("messageId", messageId);

    if (error) {
      AppLogger.error("❌ Error marking message as read:", error);
      return false;
    } else {
      AppLogger.debug("✅ markMessageAsRead SUCCESS:", messageId);
      return true;
    }
  } catch (error) {
    AppLogger.error("❌ Exception marking message as read:", error);
    return false;
  }
};

