// Debug script to investigate why conversation 510a9c8e-d532-411c-9b46-c885eecbf33d is not showing up
import { supabase } from '../src/utilities/Supabase';

const CONVERSATION_ID = '510a9c8e-d532-411c-9b46-c885eecbf33d';

async function debugConversation() {
  console.log('🔍 Starting conversation debug for:', CONVERSATION_ID);
  
  try {
    // 1. Check if conversation exists in database
    console.log('\n📋 1. Checking conversation in database...');
    const { data: conversationData, error: conversationError } = await supabase
      .from('conversations')
      .select('*')
      .eq('conversationId', CONVERSATION_ID)
      .single();
    
    if (conversationError) {
      console.error('❌ Error fetching conversation:', conversationError);
    } else if (conversationData) {
      console.log('✅ Conversation found:', {
        conversationId: conversationData.conversationId,
        uids: conversationData.uids,
        messages: conversationData.messages?.length || 0,
        lastMessageTimestamp: conversationData.lastMessageTimestamp
      });
    } else {
      console.log('❌ Conversation NOT found in database');
    }

    // 2. Check all user profiles to see who has this conversation
    console.log('\n👥 2. Checking user profiles...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('uid, name, conversations');
    
    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
    } else {
      console.log(`📊 Found ${profiles.length} user profiles`);
      
      profiles.forEach(profile => {
        const hasConversation = Array.isArray(profile.conversations) && 
          profile.conversations.includes(CONVERSATION_ID);
        
        if (hasConversation) {
          console.log(`✅ User ${profile.name} (${profile.uid}) HAS this conversation`);
          console.log(`   Their conversations:`, profile.conversations);
        }
      });
    }

    // 3. Check all conversations to see if there are any issues
    console.log('\n💬 3. Checking all conversations in database...');
    const { data: allConversations, error: allConvError } = await supabase
      .from('conversations')
      .select('conversationId, uids, messages');
    
    if (allConvError) {
      console.error('❌ Error fetching all conversations:', allConvError);
    } else {
      console.log(`📊 Found ${allConversations.length} total conversations`);
      
      const targetConv = allConversations.find(c => c.conversationId === CONVERSATION_ID);
      if (targetConv) {
        console.log('✅ Target conversation found in all conversations:', {
          conversationId: targetConv.conversationId,
          uids: targetConv.uids,
          messageCount: targetConv.messages?.length || 0
        });
      } else {
        console.log('❌ Target conversation NOT found in all conversations');
      }
    }

  } catch (error) {
    console.error('❌ Debug script error:', error);
  }
}

debugConversation();