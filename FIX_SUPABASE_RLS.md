# Fix Supabase RLS Policy for Waitlist Table

## Issue
The waitlist table has Row Level Security (RLS) enabled, but no policy allows public inserts.

## Quick Fix - Run this SQL in your Supabase SQL Editor:

```sql
-- Option 1: Disable RLS entirely (simplest for a waitlist)
ALTER TABLE public.waitlist DISABLE ROW LEVEL SECURITY;
```

## OR Option 2: Keep RLS but allow public inserts:

```sql
-- Enable RLS (if not already enabled)
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to insert into waitlist
CREATE POLICY "Allow public email signups" ON public.waitlist
FOR INSERT TO anon
WITH CHECK (true);

-- Optionally, allow authenticated users to view all records (for admin)
CREATE POLICY "Allow authenticated users to view waitlist" ON public.waitlist
FOR SELECT TO authenticated
USING (true);
```

## Recommended: Use Option 1 (Disable RLS)
For a simple email waitlist, disabling RLS is the easiest solution since:
- You want anyone to be able to sign up
- Email addresses should be unique anyway (handled by your UNIQUE constraint)
- No sensitive data protection needed for email collection

## After running the SQL:
1. Go to Supabase SQL Editor
2. Run: `ALTER TABLE public.waitlist DISABLE ROW LEVEL SECURITY;`
3. Test the email signup form again

The form should work immediately after updating the database policy!
