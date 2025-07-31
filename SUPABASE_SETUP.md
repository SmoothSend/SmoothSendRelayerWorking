# Supabase Email Signup Setup

## Quick Setup Steps

### 1. Create Supabase Table
Go to your Supabase project SQL Editor and run:

```sql
CREATE TABLE email_signups (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  twitter VARCHAR(255),
  wallet_address VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE email_signups ENABLE ROW LEVEL SECURITY;

-- Create policy to allow inserts (for email signup)
CREATE POLICY "Allow public inserts" ON email_signups
FOR INSERT TO anon
WITH CHECK (true);

-- Create policy to allow reads for authenticated users (for admin panel)
CREATE POLICY "Allow authenticated reads" ON email_signups
FOR SELECT TO authenticated
USING (true);
```

### 2. Get Your Supabase Credentials
1. Go to your Supabase project dashboard
2. Click on "Settings" → "API"
3. Copy your:
   - Project URL
   - Anon public key

### 3. Update Environment Variables
Replace these values in `/smoothsend-frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Install Supabase Client (when ready)
```bash
cd smoothsend-frontend
npm install @supabase/supabase-js --force
```

Then uncomment the real Supabase implementation in `/app/lib/supabase.ts`

### 5. Test the Email Signup
1. Start the frontend: `npm run dev`
2. Connect a wallet
3. Scroll to "Mainnet Waitlist" section
4. Enter an email and optional Twitter handle
5. Check your Supabase dashboard to see the data

## Current Status
- ✅ Email signup form implemented
- ✅ Mock Supabase client working
- ⏳ Waiting for real Supabase package installation
- ⏳ Need to add your Supabase credentials

The form currently uses a mock client that logs data to console. Once you add real Supabase credentials and install the package, it will save directly to your database!
