# Supabase MCP Setup Guide

I've created the MCP configuration file at `.cursor/mcp.json`. Follow these steps to complete the setup:

## Steps to Configure Supabase MCP:

1. **Get your Supabase Service Role Key:**
   - Go to your Supabase Dashboard: https://supabase.com/dashboard
   - Select your project: `ifmwepbepoujfnzisrjz`
   - Go to **Settings** → **API**
   - Copy the **service_role** key (⚠️ Keep this secret! It has admin access)
   - **DO NOT** use the anon key - it doesn't have permission to modify schema

2. **Update the MCP Configuration:**
   - Open `.cursor/mcp.json` in this project
   - Replace `YOUR_SERVICE_ROLE_KEY_HERE` with your actual service role key
   - Save the file

3. **Configure MCP in Cursor UI (Alternative/Additional):**
   - Open Cursor Settings (Cmd/Ctrl + ,)
   - Search for "MCP" or "Model Context Protocol"
   - If there's an MCP settings section, you can also configure it there
   - The project-level config file (`.cursor/mcp.json`) should work automatically

4. **Restart Cursor** after updating the configuration

5. **Verify Setup:**
   - After restarting, ask me to "list Supabase MCP resources" or "check if Supabase MCP is working"
   - I should be able to access your Supabase database and run migrations

## Security Note:
⚠️ The service role key has full admin access to your database. Never commit it to git or share it publicly. Consider using environment variables or Cursor's secure configuration.

## After Setup:
Once configured, I can:
- Add the `userCode` column directly
- Run migrations
- Query and modify your database schema
- Manage tables, columns, and indexes
