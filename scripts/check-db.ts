import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ifmwepbepoujfnzisrjz.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmbXdlcGJlcG91amZuemlzcmp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODQzODIsImV4cCI6MjA3NTM2MDM4Mn0.itUOgm94FL8dRPPiNz3TYZm4ca4e8LWlB-FNzrL9298";

async function checkDatabase() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  console.log("📊 Current Database State\n");
  console.log("================================================================================\n");

  const tables = [
    { name: "profiles", pk: "uid" },
    { name: "messages", pk: "messageId" },
    { name: "conversations", pk: "conversationId" },
    { name: "friendships", pk: "id" },
  ];

  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table.name)
        .select("*", { count: "exact" });

      if (error) {
        console.log(`❌ ${table.name.toUpperCase()}`);
        console.log(`   Error: ${error.message}\n`);
        continue;
      }

      console.log(`📋 ${table.name.toUpperCase()}`);
      console.log(`   Total rows: ${count || 0}`);

      if (data && data.length > 0) {
        console.log(`   Sample data (first 3 rows):`);
        data.slice(0, 3).forEach((row, idx) => {
          const jsonStr = JSON.stringify(row, null, 2);
          const lines = jsonStr.split("\n");
          console.log(`   ${idx + 1}. ${lines[0]}`);
          lines.slice(1).forEach((line) => {
            console.log(`      ${line}`);
          });
        });
      } else {
        console.log(`   ✅ Table is empty`);
      }
      console.log();
    } catch (error: any) {
      console.log(`❌ ${table.name.toUpperCase()}`);
      console.log(`   Error: ${error.message}\n`);
    }
  }

  // Check auth users (requires service role key for full details)
  console.log("👤 AUTH USERS");
  console.log("   Note: Cannot list auth.users with anon key");
  console.log("   Use service role key to see auth users\n");

  console.log("================================================================================");
}

checkDatabase();
