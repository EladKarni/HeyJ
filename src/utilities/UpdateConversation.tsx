import Conversation from "@objects/Conversation";
import { supabase } from "./Supabase";

export const updateLastRead = async (
  conversationId: string,
  currentUid: string
) => {
  const { data: conversationData } = await supabase
    .from("conversations")
    .select()
    .eq("conversationId", conversationId);

  if (conversationData && conversationData[0]) {
    const conversation = await Conversation.fromJSON(conversationData[0]);
    // Update the lastRead for the current user, keep others unchanged
    const otherUsersLastRead = conversation.lastRead.filter((l) => l.uid !== currentUid);
    const newLastRead = [
      ...otherUsersLastRead,
      { uid: currentUid, timestamp: new Date() },
    ];
    const newConversation = {
      conversationId: conversation.conversationId,
      uids: conversation.uids, // Include uids for RLS policy check
      lastRead: newLastRead,
    };

    await supabase.from("conversations").upsert(newConversation);
  }
};
