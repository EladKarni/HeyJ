const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function investigateUserConversations() {
  console.log("🔍 Investigating user conversations...");
  
  try {
    const TARGET_CONVERSATION_ID = "510a9c8e-d532-411c-9b46-c885eecbf33d";
    const USER_ID = "a33b0f12-c1f1-484d-8d2d-c618ed1336fa"; // The user who has the conversation
    
    // 1. Get user's profile with their conversations array
    console.log("\n1️⃣ Getting user profile...");
    const { data: userProfile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("uid", USER_ID)
      .single();
    
    if (profileError) {
      console.error("❌ Error fetching user profile:", profileError);
      return;
    }
    
    console.log("✅ User profile:");
    console.log(JSON.stringify(userProfile, null, 2));
    
    // 2. Check all conversations in the database that should belong to this user
    console.log("\n2️⃣ Checking all conversations in database...");
    const { data: allConversations, error: conversationsError } = await supabase
      .from("conversations")
      .select("*");
    
    if (conversationsError) {
      console.error("❌ Error fetching all conversations:", conversationsError);
      return;
    }
    
    console.log(`✅ Found ${allConversations.length} total conversations in database`);
    
    // Filter conversations where user is a participant
    const userConversationsInDB = allConversations.filter(conv => 
      conv.uids && conv.uids.includes(USER_ID)
    );
    
    console.log(`✅ Found ${userConversationsInDB.length} conversations where user is a participant`);
    
    userConversationsInDB.forEach((conv, index) => {
      const isTarget = conv.conversationId === TARGET_CONVERSATION_ID;
      console.log(`  ${index + 1}. ${conv.conversationId} ${isTarget ? '🎯 TARGET' : ''}`);
      console.log(`     Participants: ${conv.uids.join(', ')}`);
      console.log(`     Messages: ${conv.messages?.length || 0}`);
      console.log(`     In profile array: ${userProfile.conversations?.includes(conv.conversationId)}`);
    });
    
    // 3. Check what's in the user's profile.conversations array vs what's in the database
    console.log("\n3️⃣ Comparing profile conversations vs database...");
    const profileConversations = userProfile.conversations || [];
    console.log(`Profile conversations array length: ${profileConversations.length}`);
    console.log(`Database conversations with user: ${userConversationsInDB.length}`);
    
    // Find conversations in profile but not in database
    const inProfileNotInDB = profileConversations.filter(convId => 
      !userConversationsInDB.find(dbConv => dbConv.conversationId === convId)
    );
    
    // Find conversations in database but not in profile
    const inDBNotInProfile = userConversationsInDB.filter(dbConv => 
      !profileConversations.includes(dbConv.conversationId)
    );
    
    if (inProfileNotInDB.length > 0) {
      console.log("\n❌ Conversations in profile but NOT in database:");
      inProfileNotInProfile.forEach(convId => {
        console.log(`  - ${convId}`);
      });
    }
    
    if (inDBNotInProfile.length > 0) {
      console.log("\n⚠️ Conversations in database but NOT in user profile:");
      inDBNotInProfile.forEach(conv => {
        const isTarget = conv.conversationId === TARGET_CONVERSATION_ID;
        console.log(`  - ${conv.conversationId} ${isTarget ? '🎯 TARGET' : ''}`);
      });
    }
    
    // 4. Check the sorting issue - conversations are sorted by lastMessageTimestamp
    console.log("\n4️⃣ Checking conversation timestamps...");
    const userConversationsWithTimestamp = userConversationsInDB.map(conv => ({
      id: conv.conversationId,
      isTarget: conv.conversationId === TARGET_CONVERSATION_ID,
      createdAt: new Date(conv.created_at),
      updatedAt: new Date(conv.updated_at),
      messageCount: conv.messages?.length || 0,
      inProfileArray: profileConversations.includes(conv.conversationId)
    }));
    
    console.log("User conversations sorted by creation time (newest first):");
    userConversationsWithTimestamp
      .sort((a, b) => b.createdAt - a.createdAt)
      .forEach((conv, index) => {
        console.log(`  ${index + 1}. ${conv.id.slice(0, 8)}... ${conv.isTarget ? '🎯 TARGET' : ''}`);
        console.log(`     Created: ${conv.createdAt.toISOString()}`);
        console.log(`     Updated: ${conv.updatedAt.toISOString()}`);
        console.log(`     Messages: ${conv.messageCount}`);
        console.log(`     In profile: ${conv.inProfileArray}`);
      });
    
  } catch (error) {
    console.error("❌ Unexpected error:", error);
  }
}

investigateUserConversations();