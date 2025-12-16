import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ifmwepbepoujfnzisrjz.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmbXdlcGJlcG91amZuemlzcmp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODQzODIsImV4cCI6MjA3NTM2MDM4Mn0.itUOgm94FL8dRPPiNz3TYZm4ca4e8LWlB-FNzrL9298";

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const defaultProfileImage =
  "https://media.istockphoto.com/id/1223671392/vector/default-profile-picture-avatar-photo-placeholder-vector-illustration.jpg?s=612x612&w=0&k=20&c=s0aTdmT5aU6b8ot7VKm11DeID6NctRCpB755rA1BIP0=";

const testUsers = [
  { name: "Elad", userCode: "Elad@123" },
  { name: "Yalon", userCode: "Yalon@123" },
  { name: "Itai", userCode: "Itai@123" },
  { name: "Hadar", userCode: "Hadar@123" },
  { name: "Gal", userCode: "Gal@123" },
];

async function createTestUsers() {
  console.log("👥 Creating test users...\n");

  for (const user of testUsers) {
    try {
      const email = `${user.name.toLowerCase()}@test.com`;
      const password = "test12345678"; // Password that meets Supabase's 12 char minimum

      console.log(`Creating user: ${user.name} (${email})`);

      // Try to create auth user, or sign in if already exists
      let userId: string | null = null;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: user.name,
            profilePicture: defaultProfileImage,
          },
        },
      });

      if (authError) {
        if (authError.message.includes("already registered") || authError.message.includes("already exists")) {
          console.log(`  ℹ️  Auth user already exists, signing in...`);
          // User already exists, try to sign in to get user ID
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (signInError || !signInData.user) {
            console.error(`  ❌ Error signing in:`, signInError?.message || "No user returned");
            // Try to get user by email using admin API if service role key is available
            const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
            if (serviceRoleKey) {
              const adminClient = createClient(supabaseUrl, serviceRoleKey, {
                auth: {
                  autoRefreshToken: false,
                  persistSession: false,
                },
              });
              const { data: users } = await adminClient.auth.admin.listUsers();
              const foundUser = users?.users.find(u => u.email === email);
              if (foundUser) {
                userId = foundUser.id;
                console.log(`  ✅ Found user via admin API: ${userId}`);
              }
            }
            if (!userId) {
              console.error(`  ❌ Could not get user ID for ${user.name}`);
              continue;
            }
          } else {
            userId = signInData.user.id;
            console.log(`  ✅ Signed in existing user: ${userId}`);
          }
        } else {
          console.error(`  ❌ Error creating auth user for ${user.name}:`, authError.message);
          continue;
        }
      } else if (authData.user) {
        userId = authData.user.id;
        console.log(`  ✅ Auth user created: ${userId}`);
      } else {
        console.error(`  ❌ No user returned for ${user.name}`);
        continue;
      }

      // Wait a bit for any triggers to run
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("uid")
        .eq("uid", userId)
        .single();

      if (existingProfile) {
        // Update existing profile with correct userCode
        console.log(`  📝 Profile exists, updating userCode...`);
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            name: user.name,
            userCode: user.userCode,
            email: email,
          })
          .eq("uid", userId);

        if (updateError) {
          console.error(`  ❌ Error updating profile:`, updateError.message);
        } else {
          console.log(`  ✅ Profile updated with userCode: ${user.userCode}`);
        }
      } else {
        // Create profile
        console.log(`  📝 Creating profile...`);
        const { error: profileError } = await supabase.from("profiles").insert({
          uid: userId,
          email: email,
          name: user.name,
          profilePicture: defaultProfileImage,
          conversations: [],
          userCode: user.userCode,
        });

        if (profileError) {
          // Check if it's a duplicate key error (trigger already created it)
          if (profileError.code === "23505") {
            console.log(`  📝 Profile already exists (created by trigger), updating...`);
            const { error: updateError } = await supabase
              .from("profiles")
              .update({
                name: user.name,
                userCode: user.userCode,
              })
              .eq("uid", userId);

            if (updateError) {
              console.error(`  ❌ Error updating profile:`, updateError.message);
            } else {
              console.log(`  ✅ Profile updated with userCode: ${user.userCode}`);
            }
          } else {
            console.error(`  ❌ Error creating profile:`, profileError.message);
          }
        } else {
          console.log(`  ✅ Profile created with userCode: ${user.userCode}`);
        }
      }

      console.log(`  📧 Email: ${email}`);
      console.log(`  🔑 Password: ${password}`);
      console.log(`  🆔 User Code: ${user.userCode}\n`);
    } catch (error: any) {
      console.error(`❌ Unexpected error creating ${user.name}:`, error.message);
      console.log("");
    }
  }

  console.log("✅ Test user creation complete!");
}

createTestUsers();
