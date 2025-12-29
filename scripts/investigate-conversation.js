const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

const TARGET_CONVERSATION_ID = "510a9c8e-d532-411c-9b46-c885eecbf33d";

async function investigateConversation() {
  console.log("🔍 Investigating conversation:", TARGET_CONVERSATION_ID);
  
  try {
    // 1. Check if conversation exists in conversations table
    console.log("\n1️⃣ Checking conversations table...");
    const { data: conversationData, error: conversationError } = await supabase
      .from("conversations")
      .select("*")
      .eq("conversationId", TARGET_CONVERSATION_ID);
    
    if (conversationError) {
      console.error("❌ Error fetching conversation:", conversationError);
      return;
    }
    
    if (conversationData && conversationData.length > 0) {
      console.log("✅ Conversation found:");
      console.log(JSON.stringify(conversationData[0], null, 2));
    } else {
      console.log("❌ Conversation NOT found in conversations table");
    }
    
    // 2. Check messages for this conversation
    console.log("\n2️⃣ Checking messages for this conversation...");
    const { data: messagesData, error: messagesError } = await supabase
      .from("messages")
      .select("*")
      .eq("conversationId", TARGET_CONVERSATION_ID)
      .order("timestamp", { ascending: true });
    
    if (messagesError) {
      console.error("❌ Error fetching messages:", messagesError);
    } else {
      console.log(`✅ Found ${messagesData?.length || 0} messages:`);
      if (messagesData && messagesData.length > 0) {
        messagesData.forEach((msg, index) => {
          console.log(`  Message ${index + 1}: ${msg.messageId} from ${msg.uid} at ${new Date(msg.timestamp).toISOString()}`);
        });
      }
    }
    
    // 3. Check which users have this conversation in their profiles
    console.log("\n3️⃣ Checking which users have this conversation...");
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("uid, name, email, conversations")
      .contains("conversations", [TARGET_CONVERSATION_ID]);
    
    if (profilesError) {
      console.error("❌ Error fetching profiles:", profilesError);
    } else {
      console.log(`✅ Found ${profilesData?.length || 0} users with this conversation:`);
      if (profilesData && profilesData.length > 0) {
        profilesData.forEach(profile => {
          console.log(`  User: ${profile.name} (${profile.uid}) - ${profile.email}`);
          console.log(`    Conversations array length: ${profile.conversations?.length || 0}`);
          console.log(`    Has target conversation: ${profile.conversations?.includes(TARGET_CONVERSATION_ID)}`);
        });
      }
    }
    
    // 4. Check all profiles to see conversation count distribution
    console.log("\n4️⃣ Checking conversation count distribution...");
    const { data: allProfilesData, error: allProfilesError } = await supabase
      .from("profiles")
      .select("uid, name, conversations");
    
    if (allProfilesError) {
      console.error("❌ Error fetching all profiles:", allProfilesError);
    } else {
      const conversationCounts = {};
      if (allProfilesData) {
        allProfilesData.forEach(profile => {
          const convCount = profile.conversations?.length || 0;
          conversationCounts[convCount] = (conversationCounts[convCount] || 0) + 1;
        });
        
        console.log("📊 Conversation count distribution:");
        Object.entries(conversationCounts)
          .sort(([a], [b]) => parseInt(a) - parseInt(b))
          .forEach(([count, users]) => {
            console.log(`  ${count} conversations: ${users} users`);
          });
      }
    }
    
    // 5. Check if there are any database constraints or indexes that might affect queries
    console.log("\n5️⃣ Checking recent conversations by timestamp...");
    const { data: recentConversations, error: recentError } = await supabase
      .from("conversations")
      .select("conversationId, uids, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(10);
    
    if (recentError) {
      console.error("❌ Error fetching recent conversations:", recentError);
    } else {
      console.log("✅ Recent conversations:");
      recentConversations?.forEach((conv, index) => {
        const isTarget = conv.conversationId === TARGET_CONVERSATION_ID;
        console.log(`  ${index + 1}. ${conv.conversationId.slice(0, 8)}... ${isTarget ? '🎯 TARGET' : ''} - ${conv.uids.length} users`);
      });
    }
    
  } catch (error) {
    console.error("❌ Unexpected error:", error);
  }
}

investigateConversation();