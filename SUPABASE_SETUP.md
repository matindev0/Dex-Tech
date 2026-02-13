# Supabase Setup Guide

Supabase is a free, open-source Firebase alternative with PostgreSQL.

## Why Supabase?

- **Free tier**: 500MB database, no credit card required
- **Automatic sync**: Posts save instantly to the cloud
- **Easy setup**: No server needed
- **Open source**: Based on PostgreSQL

## Step 1: Create Supabase Project

1. Go to [Supabase.com](https://supabase.com)
2. Click **"Start your project"** -> **"Sign in"**
3. Sign up with GitHub or email
4. Click **"New Project"**
5. Fill in:
   - **Name**: `dex-tech`
   - **Database Password**: Generate a strong password
6. Wait for project creation (1-2 minutes)

## Step 2: Get API Credentials

1. In Supabase dashboard, click **"Project Settings"** (gear icon)
2. Click **"API"** in the sidebar
3. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **publishable key** (or **anon public key** if shown)

## Step 3: Create Database Table

1. In Supabase dashboard, click **"SQL Editor"**
2. Click **"New query"**
3. Paste this SQL:

```sql
-- Create posts table
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

-- Create settings table
CREATE TABLE settings (
  id TEXT PRIMARY KEY DEFAULT 'appSettings',
  adsense_code TEXT,
  analytics_code TEXT,
  last_modified TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access to posts" ON posts
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access to settings" ON settings
  FOR SELECT USING (true);

-- Allow public write access for this static site (no backend)
CREATE POLICY "Allow public insert on posts" ON posts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on posts" ON posts
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on posts" ON posts
  FOR DELETE USING (true);

CREATE POLICY "Allow public upsert on settings" ON settings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on settings" ON settings
  FOR UPDATE USING (true);
```

4. Click **"Run"** to execute

## Step 4: Update Your Project

1. Open `assets/js/supabase-config.js`
2. Replace with your credentials:

```javascript
const supabaseUrl = 'https://your-project.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR...';
const supabasePublishableKey = 'sb_publishable_...';
const supabaseKey = supabaseAnonKey || supabasePublishableKey;
```

## Step 5: Deploy

```bash
git add assets/js/supabase-config.js
git commit -m "Add Supabase config"
git push
```

## How It Works

1. Open `admin.html`
2. Add a post
3. Post is **automatically saved** to Supabase
4. Users see the post instantly!

## Troubleshooting

### Posts not saving?

1. Check browser console for errors
2. Verify Supabase URL and key are correct
3. Check RLS policies are set up

### CORS errors?

Add your domain in Supabase:
- Project Settings -> API -> Site URL

### Need to reset?

Delete rows in Supabase Dashboard -> Table Editor -> posts
