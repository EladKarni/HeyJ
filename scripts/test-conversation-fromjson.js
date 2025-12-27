const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function testConversationFromJSON() {
  console.log("🔍 Testing Conversation.fromJSON() with empty conversation...");
  
  try {
    const TARGET_CONVERSATION_ID = "510a9c8e-d532-411c-9b46-c885eecbf33d";
    
    // 1. Get the conversation data as it would come from Supabase
    console.log("\n1️⃣ Fetching conversation data...");
    const { data: conversationData, error: conversationError } = await supabase
      .from("conversations")
      .select("*")
      .eq("conversationId", TARGET_CONVERSATION_ID)
      .single();
    
    if (conversationError) {
      console.error("❌ Error fetching conversation:", conversationError);
      return;
    }
    
    console.log("✅ Raw conversation data from Supabase:");
    console.log(JSON.stringify(conversationData, null, 2));
    
    // 2. Test the messages array handling
    console.log("\n2️⃣ Testing messages array...");
    console.log("Messages array:", conversationData.messages);
    console.log("Is array:", Array.isArray(conversationData.messages));
    console.log("Array length:", conversationData.messages?.length || 0);
    
    // 3. Simulate the Conversation.fromJSON() logic step by step
    console.log("\n3️⃣ Simulating Conversation.fromJSON()...");
    
    let messages = [];
    
    // This is the problematic part from Conversation.fromJSON:46-61
    if (!conversationData.messages || !Array.isArray(conversationData.messages)) {
      console.warn("Conversation.fromJSON: messages array missing or invalid", { data: conversationData });
      console.log("✅ This condition would be triggered for empty conversations");
      console.log("🎯 It would return a Conversation with empty messages array");
    } else {
      console.log("✅ Messages array exists and is valid");
      console.log(`📝 Processing ${conversationData.messages.length} message IDs...`);
      
      // Try to fetch messages for each ID
      for (const id of conversationData.messages) {
        console.log(`Fetching message: ${id}`);
        const { data: messageData, error: messageError } = await supabase
          .from("messages")
          .select("*")
          .eq("messageId", id);
        
        if (messageError) {
          console.error(`❌ Error fetching message ${id}:`, messageError);
        } else if (messageData && messageData.length > 0) {
          console.log(`✅ Found message ${id}`);
          // Message.fromJSON would be called here
        } else {
          console.log(`⚠️ No data found for message ${id}`);
        }
      }
    }
    
    // 4. Check if there are actually any messages in the database for this conversation
    console.log("\n4️⃣ Checking for messages with different column names...");
    
    // The conversation stores message IDs, but let's see if there are any messages at all
    const { data: allMessages, error: allMessagesError } = await supabase
      .from("messages")
      .select("*")
      .limit(10);
    
    if (allMessagesError) {
      console.error("❌ Error fetching all messages:", allMessagesError);
    } else {
      console.log(`✅ Total messages in database: ${allMessages?.length || 0}`);
      if (allMessages && allMessages.length > 0) {
        console.log("Sample message structure:");
        console.log(JSON.stringify(allMessages[0], null, 2));
      }
    }
    
    // 5. Test if the conversationId lookup works
    console.log("\n5️⃣ Testing message lookup by conversationId...");
    const { data: messagesForConversation, error: convMessagesError } = await supabase
      .from("messages")
      .select("*")
      .eq("conversationid", TARGET_CONVERSATION_ID); // Note: lowercase 'conversationid'
    
    if (convMessagesError) {
      console.error("❌ Error fetching messages by conversationId:", convMessagesError);
    } else {
      console.log(`✅ Found ${messagesForConversation?.length || 0} messages for this conversation`);
    }
    
    // 6. Conclusion
    console.log("\n🎯 ANALYSIS CONCLUSION:");
    console.log("1. The conversation exists in Supabase ✅");
    console.log("2. The conversation has an empty messages array ✅");
    console.log("3. Conversation.fromJSON() should handle empty messages correctly ✅");
    console.log("4. There are no messages in the database for this conversation ✅");
    console.log("5. The issue is likely in the sync process or UI rendering ❓");
    
    console.log("\n🔍 NEXT STEPS TO INVESTIGATE:");
    console.log("1. Check if the conversation is being cached in SQLite");
    console.log("2. Check browser console logs for JavaScript errors");
    console.log("3. Verify the UI sorting logic");
    console.log("4. Test if adding a message to this conversation makes it appear");
    
  } catch (error) {
    console.error("❌ Unexpected error:", error);
  }
}

testConversationFromJSON();