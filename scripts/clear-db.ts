import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ifmwepbepoujfnzisrjz.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmbXdlcGJlcG91amZuemlzcmp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODQzODIsImV4cCI6MjA3NTM2MDM4Mn0.itUOgm94FL8dRPPiNz3TYZm4ca4e8LWlB-FNzrL9298";

// Service role key - replace with your actual key or set via environment variable
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

async function clearDatabase() {
  console.log("🧹 Clearing database...\n");

  // Use service role key if available, otherwise use anon key (limited permissions)
  const key = supabaseServiceRoleKey || supabaseAnonKey;
  const supabase = createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // If we have service role key, we can delete auth users
  if (supabaseServiceRoleKey) {
    console.log("🔑 Using service role key - full cleanup enabled\n");
    
    try {
      // List all users
      const { data: users, error: listError } = await supabase.auth.admin.listUsers();
      
      if (listError) {
        console.error("❌ Error listing users:", listError.message);
      } else {
        console.log(`📋 Found ${users.users.length} users to delete`);
        
        // Delete all users (this will cascade delete profiles)
        for (const user of users.users) {
          const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
          if (deleteError) {
            console.error(`❌ Error deleting user ${user.email}:`, deleteError.message);
          } else {
            console.log(`  ✅ Deleted user: ${user.email}`);
          }
        }
      }
    } catch (error: any) {
      console.error("❌ Error during user deletion:", error.message);
    }
  } else {
    console.log("⚠️  No service role key found - skipping auth user deletion");
    console.log("   Set SUPABASE_SERVICE_ROLE_KEY environment variable for full cleanup\n");
  }

  // Clear all data tables (in dependency order)
  // Note: message_audios and profile_images are storage buckets, not tables
  const tables = [
    { name: "messages", pk: "messageId" },
    { name: "conversations", pk: "conversationId" },
    { name: "friendships", pk: "id" },
    { name: "profiles", pk: "uid" }, // Profiles should be deleted last or cascade from auth.users
  ];

  for (const table of tables) {
    try {
      console.log(`🗑️  Clearing table: ${table.name}`);
      
      // First, try to get all rows to delete them
      const { data: rows, error: fetchError } = await supabase
        .from(table.name)
        .select(table.pk);
      
      if (fetchError) {
        // Table might not exist or be empty
        if (fetchError.code === "PGRST116" || fetchError.message.includes("does not exist")) {
          console.log(`  ℹ️  Table ${table.name} doesn't exist or is empty`);
          continue;
        }
        console.error(`  ❌ Error fetching from ${table.name}:`, fetchError.message);
        continue;
      }

      if (!rows || rows.length === 0) {
        console.log(`  ℹ️  Table ${table.name} is already empty`);
        continue;
      }

      // Delete all rows
      // For profiles, we need to be careful - delete by uid
      // For others, delete all
      let deleteQuery = supabase.from(table.name).delete();
      
      if (table.name === "profiles") {
        // Delete profiles by uid
        const uids = rows.map((r: any) => r.uid).filter(Boolean);
        if (uids.length > 0) {
          deleteQuery = deleteQuery.in("uid", uids);
        } else {
          console.log(`  ℹ️  No profiles to delete`);
          continue;
        }
      } else if (table.name === "messages") {
        const messageIds = rows.map((r: any) => r.messageId).filter(Boolean);
        if (messageIds.length > 0) {
          deleteQuery = deleteQuery.in("messageId", messageIds);
        } else {
          console.log(`  ℹ️  No messages to delete`);
          continue;
        }
      } else if (table.name === "conversations") {
        const conversationIds = rows.map((r: any) => r.conversationId).filter(Boolean);
        if (conversationIds.length > 0) {
          deleteQuery = deleteQuery.in("conversationId", conversationIds);
        } else {
          console.log(`  ℹ️  No conversations to delete`);
          continue;
        }
      } else if (table.name === "friendships") {
        const ids = rows.map((r: any) => r.id).filter(Boolean);
        if (ids.length > 0) {
          deleteQuery = deleteQuery.in("id", ids);
        } else {
          console.log(`  ℹ️  No friendships to delete`);
          continue;
        }
      }

      const { error: deleteError } = await deleteQuery;
      
      if (deleteError) {
        console.error(`  ❌ Error clearing ${table.name}:`, deleteError.message);
      } else {
        console.log(`  ✅ Cleared ${rows.length} row(s) from ${table.name}`);
      }
    } catch (error: any) {
      console.error(`  ❌ Unexpected error clearing ${table.name}:`, error.message);
    }
  }

  // Clear storage buckets if we have service role key
  if (supabaseServiceRoleKey) {
    console.log("\n🗑️  Clearing storage buckets...");
    const buckets = ["message_audios", "profile_images"];
    
    for (const bucket of buckets) {
      try {
        const { data: files, error: listError } = await supabase.storage.from(bucket).list();
        
        if (listError) {
          if (listError.message.includes("not found")) {
            console.log(`  ℹ️  Bucket ${bucket} doesn't exist`);
          } else {
            console.error(`  ❌ Error listing ${bucket}:`, listError.message);
          }
          continue;
        }

        if (!files || files.length === 0) {
          console.log(`  ℹ️  Bucket ${bucket} is already empty`);
          continue;
        }

        const filePaths = files.map(f => f.name);
        const { error: deleteError } = await supabase.storage.from(bucket).remove(filePaths);
        
        if (deleteError) {
          console.error(`  ❌ Error clearing ${bucket}:`, deleteError.message);
        } else {
          console.log(`  ✅ Cleared ${filePaths.length} file(s) from ${bucket}`);
        }
      } catch (error: any) {
        console.error(`  ❌ Unexpected error clearing ${bucket}:`, error.message);
      }
    }
  }

  console.log("\n✅ Database clearing complete!");
}

clearDatabase();
