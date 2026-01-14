const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function investigateSortingLogic() {
  console.log("🔍 Investigating sorting logic issue...");
  
  try {
    const TARGET_CONVERSATION_ID = "510a9c8e-d532-411c-9b46-c885eecbf33d";
    const USER_ID = "a33b0f12-c1f1-484d-8d2d-c618ed1336fa";
    
    // 1. Check the current conversation data structure
    console.log("\n1️⃣ Getting conversation data structure...");
    const { data: conversationData, error: conversationError } = await supabase
      .from("conversations")
      .select("*")
      .eq("conversationId", TARGET_CONVERSATION_ID)
      .single();
    
    if (conversationError) {
      console.error("❌ Error fetching conversation:", conversationError);
      return;
    }
    
    console.log("✅ Target conversation data:");
    console.log(JSON.stringify(conversationData, null, 2));
    
    // 2. Check if there's a created_at vs updated_at vs lastMessageTimestamp issue
    console.log("\n2️⃣ Analyzing timestamp fields...");
    const createdAt = new Date(conversationData.created_at);
    const updatedAt = new Date(conversationData.updated_at);
    
    console.log(`Created at: ${createdAt.toISOString()}`);
    console.log(`Updated at: ${updatedAt.toISOString()}`);
    
    // 3. Simulate the conversationRepository logic
    console.log("\n3️⃣ Simulating conversationRepository.getRecentConversations() logic...");
    
    // In conversationRepository.ts:65 - this is the issue
    // `ORDER BY lastMessageTimestamp DESC`
    // But our conversation has NO messages, so what is lastMessageTimestamp?
    
    console.log("📝 The conversation has:");
    console.log(`- Messages array: ${conversationData.messages}`);
    console.log(`- Messages array length: ${conversationData.messages?.length || 0}`);
    
    // Based on conversationRepository.ts:11-13
    // Empty conversations get current time so they appear near top
    const simulatedLastMessageTimestamp = conversationData.messages && conversationData.messages.length > 0
      ? Math.max(...conversationData.messages.map(m => new Date(m.timestamp).getTime()))
      : Date.now(); // This should make empty conversations appear at top
    
    console.log(`\n📊 Simulated lastMessageTimestamp: ${new Date(simulatedLastMessageTimestamp).toISOString()}`);
    console.log(`This should make the conversation appear at the TOP of the list`);
    
    // 4. Check if there might be a database-level lastMessageTimestamp column
    console.log("\n4️⃣ Checking for additional columns...");
    const allColumns = Object.keys(conversationData);
    console.log("All columns in conversation:", allColumns);
    
    // 5. Check what the actual database query would return
    console.log("\n5️⃣ Testing the actual database query from conversationRepository...");
    
    // The problematic query from conversationRepository.ts:63-69
    // SELECT conversationId, uids, lastRead FROM conversations WHERE isCached = 1 ORDER BY lastMessageTimestamp DESC LIMIT ?
    
    // But our conversation table doesn't have an isCached or lastMessageTimestamp column!
    console.log("⚠️ ISSUE IDENTIFIED:");
    console.log("- conversationRepository.ts queries for 'isCached' and 'lastMessageTimestamp' columns");
    console.log("- But the Supabase conversations table has 'created_at' and 'updated_at' columns");
    console.log("- The 'isCached' and 'lastMessageTimestamp' columns only exist in the local SQLite database");
    
    // 6. Check all conversations to see timestamps
    console.log("\n6️⃣ Checking all conversations with their timestamps...");
    const { data: allConversations, error: allError } = await supabase
      .from("conversations")
      .select("conversationId, created_at, updated_at, uids, messages")
      .order("created_at", { ascending: false });
    
    if (allError) {
      console.error("❌ Error fetching all conversations:", allError);
      return;
    }
    
    console.log("✅ All conversations ordered by created_at (newest first):");
    allConversations.forEach((conv, index) => {
      const isTarget = conv.conversationId === TARGET_CONVERSATION_ID;
      console.log(`${index + 1}. ${conv.conversationId.slice(0, 8)}... ${isTarget ? '🎯 TARGET' : ''}`);
      console.log(`   Created: ${conv.created_at}`);
      console.log(`   Updated: ${conv.updated_at}`);
      console.log(`   Messages: ${conv.messages?.length || 0}`);
      console.log(`   Users: ${conv.uids?.join(', ') || 'none'}`);
    });
    
  } catch (error) {
    console.error("❌ Unexpected error:", error);
  }
}

investigateSortingLogic();