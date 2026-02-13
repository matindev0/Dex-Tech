# Automatic Database Setup with Supabase

Your site now supports **Supabase** - a free, open-source database that saves posts automatically!

## What is Supabase?

- **Free**: 500MB database, no credit card
- **Automatic**: Posts save instantly when you add them
- **No export needed**: Unlike the manual method, posts sync automatically

## Quick Setup (5 minutes)

### Step 1: Create Supabase Account

1. Go to [Supabase.com](https://supabase.com)
2. Sign up with GitHub or email
3. Click **"New Project"**
4. Name: `dex-tech`
5. Generate a password and save it

### Step 2: Get Your Credentials

1. In Supabase dashboard, click **Settings** (gear icon)
2. Click **API**
3. Copy:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **publishable key** (or **anon public key** if shown)

### Step 3: Create Database Tables

1. In Supabase, click **SQL Editor**
2. Paste and run:

```sql
CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  youtube_embed TEXT,
  thumbnail TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE settings (
  id TEXT PRIMARY KEY DEFAULT 'appSettings',
  adsense_code TEXT,
  analytics_code TEXT,
  last_modified TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read posts" ON posts FOR SELECT USING (true);
CREATE POLICY "Public read settings" ON settings FOR SELECT USING (true);

CREATE POLICY "Public insert posts" ON posts FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update posts" ON posts FOR UPDATE USING (true);
CREATE POLICY "Public delete posts" ON posts FOR DELETE USING (true);

CREATE POLICY "Public upsert settings" ON settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update settings" ON settings FOR UPDATE USING (true);
```

### Step 4: Update Your Project

1. Open `assets/js/supabase-config.js`
2. Replace with your credentials:

```javascript
const supabaseUrl = 'https://your-project.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR...';
const supabasePublishableKey = 'sb_publishable_...';
const supabaseKey = supabaseAnonKey || supabasePublishableKey;
```

### Step 5: Deploy

```bash
git add assets/js/supabase-config.js
git commit -m "Add Supabase database"
git push
```

## How to Add Posts

1. Open `admin.html`
2. Add your post
3. **That's it!** Post is automatically saved to Supabase
4. Users see the post instantly!

## Fallback Mode

If Supabase is not set up, the site will use localStorage as a fallback. Posts will work but won't sync across devices.

## Troubleshooting

### Posts not saving?

1. Check browser console for errors
2. Verify credentials in `supabase-config.js`
3. Make sure SQL table was created
4. Ensure RLS policies allow insert/update/delete for public access

### Need to reset data?

Go to Supabase Dashboard -> Table Editor -> Delete rows from `posts` table
