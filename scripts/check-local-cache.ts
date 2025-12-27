import { getDatabase } from '../src/database/database';
import { getRecentConversations } from '../src/database/repositories/conversationRepository';

async function checkLocalCache() {
  console.log("🔍 Checking local SQLite cache...");
  
  try {
    const db = getDatabase();
    
    // 1. Check if there are any conversations in the local cache
    console.log("\n1️⃣ Checking local conversations table...");
    const allCachedConversations = await db.getAllAsync(`
      SELECT conversationId, uids, lastRead, lastMessageTimestamp, isCached, syncedAt
      FROM conversations
    `);
    
    console.log(`✅ Found ${allCachedConversations.length} conversations in local cache:`);
    allCachedConversations.forEach((conv: any, index: number) => {
      console.log(`${index + 1}. ${conv.conversationId}`);
      console.log(`   Last message timestamp: ${conv.lastMessageTimestamp ? new Date(conv.lastMessageTimestamp).toISOString() : 'null'}`);
      console.log(`   Is cached: ${conv.isCached}`);
      console.log(`   Synced at: ${conv.syncedAt ? new Date(conv.syncedAt).toISOString() : 'null'}`);
    });
    
    // 2. Check if the target conversation is in cache
    const TARGET_CONVERSATION_ID = "510a9c8e-d532-411c-9b46-c885eecbf33d";
    console.log(`\n2️⃣ Looking for target conversation: ${TARGET_CONVERSATION_ID}`);
    
    const targetConversation = allCachedConversations.find((conv: any) => conv.conversationId === TARGET_CONVERSATION_ID);
    if (targetConversation) {
      console.log("✅ Target conversation found in cache:");
      console.log(JSON.stringify(targetConversation, null, 2));
    } else {
      console.log("❌ Target conversation NOT found in local cache");
    }
    
    // 3. Test the getRecentConversations function
    console.log("\n3️⃣ Testing getRecentConversations function...");
    const recentConversations = await getRecentConversations(50);
    console.log(`✅ getRecentConversations returned ${recentConversations.length} conversations:`);
    recentConversations.forEach((conv, index) => {
      console.log(`${index + 1}. ${conv.conversationId} - ${conv.messages.length} messages`);
    });
    
    // 4. Check if target conversation is in getRecentConversations result
    const targetInRecent = recentConversations.find(conv => conv.conversationId === TARGET_CONVERSATION_ID);
    if (targetInRecent) {
      console.log("✅ Target conversation found in getRecentConversations result");
    } else {
      console.log("❌ Target conversation NOT found in getRecentConversations result");
    }
    
  } catch (error) {
    console.error("❌ Error checking local cache:", error);
  }
}

checkLocalCache().then(() => process.exit(0));