/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

interface MessagePayload {
  type: "INSERT";
  table: "messages";
  schema: "public";
  record: {
    messageId: string;
    timestamp: string;
    uid: string;
    audioUrl: string;
    isRead: boolean;
  };
  old_record: null;
}

Deno.serve(async (req) => {
  try {
    // Parse webhook payload
    const payload: MessagePayload = await req.json();
    const newMessage = payload.record;

    console.log("Processing new message:", newMessage.messageId);

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Get sender's profile
    const { data: senderProfile, error: senderError } = await supabase
      .from("profiles")
      .select("uid, name, profilePicture")
      .eq("uid", newMessage.uid)
      .single();

    if (senderError || !senderProfile) {
      console.error("Failed to fetch sender profile:", senderError);
      return new Response(
        JSON.stringify({ error: "Sender profile not found" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Step 2: Find conversation containing this message
    const { data: conversations, error: convError } = await supabase
      .from("conversations")
      .select("conversationId, uids")
      .contains("messages", [newMessage.messageId]);

    if (convError || !conversations || conversations.length === 0) {
      console.error("Failed to find conversation:", convError);
      return new Response(JSON.stringify({ error: "Conversation not found" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const conversation = conversations[0];

    // Step 3: Determine recipient UID
    const recipientUid = conversation.uids.find(
      (uid: string) => uid !== newMessage.uid
    );

    if (!recipientUid) {
      console.log("No recipient found (single-user conversation?)");
      return new Response(
        JSON.stringify({ success: true, skipped: "No recipient" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Step 4: Get recipient's Expo Push Token from database
    const { data: pushTokenData, error: tokenError } = await supabase
      .from("push_tokens")
      .select("tokens")
      .eq("uid", recipientUid)
      .single();

    if (tokenError || !pushTokenData?.tokens?.[0]) {
      console.log("No push token found for recipient:", recipientUid);
      return new Response(
        JSON.stringify({ success: true, skipped: "No push token" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const pushToken = pushTokenData.tokens[0];

    // Step 5: Send push notification via Expo Push API
    const notificationResponse = await fetch(
      "https://exp.host/--/api/v2/push/send",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: pushToken,
          title: senderProfile.name,
          body: "Sent you a voice message",
          data: {
            conversationId: conversation.conversationId,
            messageUrl: newMessage.audioUrl,
            messageId: newMessage.messageId,
            fromName: senderProfile.name,
            fromPhoto: senderProfile.profilePicture,
            notificationType: "message",
          },
          sound: "default",
          badge: 1,
        }),
      }
    );

    const result = await notificationResponse.json();

    if (!notificationResponse.ok) {
      console.error("Expo Push API error:", result);
      return new Response(
        JSON.stringify({ error: "Expo Push API error", details: result }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("Push notification sent successfully");

    return new Response(
      JSON.stringify({ success: true, result }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Edge function error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
});
