const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function investigateTableStructure() {
  console.log("🔍 Investigating table structures...");
  
  try {
    // Check messages table structure
    console.log("\n1️⃣ Checking messages table columns...");
    const { data: columnsData, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'messages' });
    
    if (columnsError) {
      console.error("❌ Error getting columns:", columnsError);
      
      // Alternative: Try to describe the table
      console.log("\n🔄 Trying to fetch sample messages to see structure...");
      const { data: sampleMessages, error: sampleError } = await supabase
        .from("messages")
        .select("*")
        .limit(1);
      
      if (sampleError) {
        console.error("❌ Error fetching sample messages:", sampleError);
      } else if (sampleMessages && sampleMessages.length > 0) {
        console.log("✅ Sample message structure:");
        console.log(Object.keys(sampleMessages[0]));
      } else {
        console.log("ℹ️ No messages found in table");
      }
    } else {
      console.log("✅ Messages table columns:");
      console.log(columnsData);
    }
    
    // Check if there are any messages at all
    console.log("\n2️⃣ Checking total message count...");
    const { data: allMessages, error: allMessagesError } = await supabase
      .from("messages")
      .select("count", { count: 'exact', head: true });
    
    if (allMessagesError) {
      console.error("❌ Error counting messages:", allMessagesError);
    } else {
      console.log(`✅ Total messages in database: ${allMessages}`);
    }
    
    // Try a different approach to find messages for our target conversation
    console.log("\n3️⃣ Trying to find messages for target conversation using different column names...");
    const TARGET_CONVERSATION_ID = "510a9c8e-d532-411c-9b46-c885eecbf33d";
    
    // Try different possible column names
    const possibleColumns = ['conversationid', 'conversation_id', 'conversation'];
    
    for (const column of possibleColumns) {
      console.log(`\n🔍 Trying column: ${column}`);
      try {
        const { data: messagesData, error: messagesError } = await supabase
          .from("messages")
          .select("*")
          .eq(column, TARGET_CONVERSATION_ID)
          .order("timestamp", { ascending: true });
        
        if (messagesError) {
          console.log(`❌ Column ${column} not found or other error:`, messagesError.message);
        } else {
          console.log(`✅ Found ${messagesData?.length || 0} messages using column ${column}:`);
          if (messagesData && messagesData.length > 0) {
            console.log("Message structure:", Object.keys(messagesData[0]));
            messagesData.forEach((msg, index) => {
              console.log(`  Message ${index + 1}: ${msg.messageId || msg.id} from ${msg.uid || msg.user_id}`);
            });
          }
        }
      } catch (err) {
        console.log(`❌ Error trying column ${column}:`, err.message);
      }
    }
    
  } catch (error) {
    console.error("❌ Unexpected error:", error);
  }
}

investigateTableStructure();