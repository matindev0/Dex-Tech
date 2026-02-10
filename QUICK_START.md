# Quick Start Guide - 5 Minute Setup

## ⚡ Get Cross-Device Sync Working in 5 Minutes

### Step 1: Create Database (2 min)

**Option A - Easy (Recommended):**
1. Go to https://console.neon.tech
2. Sign up (free)
3. Create project "dex-tech"
4. Copy your connection string

**Option B - Local:**
```bash
# If PostgreSQL is installed
createdb dex_tech
# Connection string: postgresql://localhost/dex_tech
```

### Step 2: Configure Your Project (2 min)

1. Create file `.env` in your project root:
```bash
PG_CONNECTION_STRING=postgresql://user:pass@host/db
PORT=3000
```

Replace with your actual connection string from Step 1.

### Step 3: Start Server (1 min)

```bash
npm install
npm start
```

You should see:
```
✅ Connected to Postgres (PG)
🚀 Server running on http://localhost:3000
```

### Step 4: Test It! ✨

**On Desktop:**
- Go to: http://localhost:3000/admin.html
- Create a post

**On Mobile:**
- Find your computer's IP: 
  - Windows: Open Command Prompt, type `ipconfig`, look for IPv4 Address (like 192.168.1.100)
  - Mac: System Preferences → Network
- On mobile browser: http://192.168.1.100:3000/post.html
- **See the post appear!**

## 🎉 That's It!

Posts now sync across all your devices!

## 📱 Test Offline

1. Create a post on desktop
2. Turn off WiFi on mobile
3. Go back to mobile
4. Post is still there!
5. Turn WiFi back on
6. Automatically syncs to database

## 🐛 Not Working?

### Check console logs (Desktop: F12)
```
⚠️ Backend unavailable, using offline mode
```
= Backend can't connect. Check error below.

### Quick fixes:
- Is Node.js running? Run `npm start` again
- Check .env file exists and has correct connection string
- On mobile: Use your IP (not localhost)
- Same WiFi? Make sure both devices on same network
- Firewall? Port 3000 might be blocked

## 📖 Full Documentation

See [CROSS_DEVICE_SETUP.md](CROSS_DEVICE_SETUP.md) for complete guide.

## 🚀 Next Steps

- [ ] Test on multiple devices
- [ ] Deploy backend to cloud
- [ ] Deploy frontend to cloud
- [ ] Share with friends!

---

**Questions?** Check the console logs - they'll tell you what's wrong!
