# Architecture Overview

## Cross-Device Sync Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     CLOUD SERVER                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Node.js + Express API Server (port 3000)          │   │
│  │  ┌────────────────────────────────────────────────┐ │   │
│  │  │  POST /api/posts      (Create)               │ │   │
│  │  │  GET  /api/posts      (Read all)             │ │   │
│  │  │  GET  /api/posts/:id  (Read one)             │ │   │
│  │  │  PUT  /api/posts/:id  (Update)               │ │   │
│  │  │  DELETE /api/posts/:id (Delete)              │ │   │
│  │  └────────────────────────────────────────────────┘ │   │
│  │  ┌────────────────────────────────────────────────┐ │   │
│  │  │  PostgreSQL Database (Neon or local)         │ │   │
│  │  │  ┌──────────────────────────────────────────┐ │ │   │
│  │  │  │ posts table                             │ │ │   │
│  │  │  │ - id (PRIMARY KEY)                      │ │ │   │
│  │  │  │ - data (JSONB)                          │ │ │   │
│  │  │  │ - created_at (TIMESTAMPTZ)              │ │ │   │
│  │  │  │ - updated_at (TIMESTAMPTZ)              │ │ │   │
│  │  │  │                                         │ │ │   │
│  │  │  │ settings table (same structure)         │ │ │   │
│  │  │  └──────────────────────────────────────────┘ │ │   │
│  │  └────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ▲
                    ┌───────┴───────┐
                    │               │
        ┌───────────▼──┐   ┌────────▼──────────┐
        │   DESKTOP    │   │      MOBILE      │
        │  Browser     │   │    Browser       │
        ├──────────────┤   ├─────────────────┤
        │ admin.html   │   │ post.html        │
        │ post-view.js │   │ posts.js         │
        │ posts.js     │   │ database.js      │
        │ database.js  │   │                  │
        ├──────────────┤   ├─────────────────┤
        │localStorage  │   │ localStorage    │
        │(cache)       │   │ (cache)         │
        └──────────────┘   └─────────────────┘
```

## Data Flow Diagram

### Scenario 1: Adding a Post (Online)

```
USER ACTION: Click "Save Post"
     │
     ▼
desktop/admin.html
     │
     ├─► completeSavePost()
     │       │
     │       ├─► create newPost object
     │       │    {_id, id, title, description, ...}
     │       │
     │       └─► DB.addPost(post)
     │               │
     │               ├─► isOffline? NO (backend available)
     │               │
     │               ├─► fetch POST /api/posts
     │               │       │
     │               │       └─► Cloud Server/Database
     │               │           │
     │               │           ├─► INSERT INTO posts
     │               │           │
     │               │           └─► RESPONSE: OK
     │               │
     │               └─► Also save to localStorage (cache)
     │
     └─► Toast: "✅ Post saved!"

RESULT: Post in cloud ☁️ + in localStorage 
====================================================================

MOBILE USER: Refresh page
     │
     ▼
mobile/post.html
     │
     ├─► DB.getPosts()
     │   │
     │   ├─► isOffline? NO (backend available)
     │   │
     │   ├─► fetch GET /api/posts
     │   │   │
     │   │   ├─► Cloud Server queries database
     │   │   │
     │   │   └─► Returns ALL posts (including desktop post!)
     │   │
     │   └─► Also update localStorage (cache)
     │
     ▼
Mobile sees the post! 🎉
```

### Scenario 2: Adding a Post (Offline)

```
USER ACTION: Click "Save Post" (No Internet)
     │
     ▼
desktop/admin.html
     │
     ├─► DB.addPost(post)
     │   │
     │   ├─► isOffline? YES (no backend available)
     │   │
     │   ├─► Skip POST /api/posts (no internet)
     │   │
     │   ├─► Save to localStorage (fallback)
     │   │
     │   └─► Return newPost
     │
     └─► Toast: "✅ Post saved locally!"

RESULT: Post in localStorage only
User can still see it (offline cache working)

====================================================================

USER COMES BACK ONLINE
     │
     ▼
DB.checkBackendAvailability() runs
     │
     ├─► Backend available again? YES
     │
     └─► Next sync (getPosts or manual refresh)
         │
         ├─► Reads from localStorage cache
         │
         ├─► Sends POST to /api/posts
         │
         └─► Cloud database updated

RESULT: Post now in cloud ☁️ (synced!)
Mobile users can now see it
```

## File Interaction Diagram

```
┌─────────────────────────────────────────────────────────┐
│                  Server-Side (Node.js)                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  server.js                                             │
│  ├─► Express app setup                                 │
│  ├─► PostgreSQL connection                             │
│  └─► API Routes                                        │
│      ├─ GET /api/posts                                │
│      ├─ GET /api/posts/:id                            │
│      ├─ POST /api/posts                               │
│      ├─ PUT /api/posts/:id    ← NEW!                  │
│      ├─ DELETE /api/posts/:id                         │
│      ├─ GET /api/settings                             │
│      └─ PUT /api/settings                             │
│                                                         │
└─────────────────────────────────────────────────────────┘
            ▲
            │
            │ (HTTP/JSON)
            │
┌───────────▼─────────────────────────────────────────────┐
│              Client-Side (JavaScript)                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  database.js (THE BRAIN)                              │
│  ├─► API_BASE_URL: auto-detect server                 │
│  ├─► isOffline: check backend availability            │
│  ├─► getPosts()       → tries API → falls to cache    │
│  ├─► addPost()        → tries API → falls to cache    │
│  ├─► updatePost()     → tries API → falls to cache    │
│  ├─► deletePost()     → tries API → falls to cache    │
│  ├─► getPostById()    → tries API → falls to cache    │
│  └─► Utility methods: extractVideoId, verifyPin, etc  │
│                                                         │
│  ↕ (Used by all pages)                                │
│                                                         │
│  HTML Pages                                           │
│  ├─► admin.html                                       │
│  │   └─► admin.js                                     │
│  │       ├─► Create posts                             │
│  │       ├─► Edit posts                               │
│  │       ├─► Delete posts                             │
│  │       └─► Manage settings                          │
│  │                                                     │
│  ├─► post.html                                        │
│  │   └─► posts.js                                     │
│  │       ├─► Display all posts                        │
│  │       ├─► Search & filter                          │
│  │       └─► Show thumbnails                          │
│  │                                                     │
│  └─► post-view.html                                   │
│      └─► post-view.js                                 │
│          ├─► Load single post                         │
│          ├─► Display details                          │
│          └─► Show related posts                       │
│                                                         │
│  ↓                                                     │
│                                                         │
│  localStorage (Device-Specific Cache)                 │
│  ├─► matin_posts: [] (all posts)                     │
│  └─► matin_settings: {} (app settings)               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## State Transitions

```
┌─────────────────────────────────────────────────────┐
│        APP INITIALIZATION (DOMContentLoaded)        │
├─────────────────────────────────────────────────────┤
│                                                     │
│  database.js loads                                │
│         │                                          │
│         ▼                                          │
│  DB.init() called                                 │
│         │                                          │
│         ├─► checkBackendAvailability()             │
│         │   │                                      │
│         │   └─► try fetch /api/posts (5s timeout) │
│         │       │                                  │
│         │       ├─ YES ✅: isOffline = false      │
│         │       │          (Use API backend)      │
│         │       │                                  │
│         │       └─ NO ❌: isOffline = true        │
│         │          (Use localStorage)             │
│         │                                          │
│         ├─► Initialize localStorage               │
│         │   (if empty)                            │
│         │                                          │
│         └─► Console: "✅ Database ready..."       │
│                                                     │
│  All page scripts (admin.js, posts.js) can now    │
│  call DB methods and they "just work"             │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Error Recovery Flow

```
USER ACTION: Try to sync data
     │
     ▼
Network call to /api/posts
     │
     ├─────────────────────────┬────────────────────────┐
     │                         │                        │
  SUCCESS                   TIMEOUT                    ERROR
     │                         │                        │
     ▼                         ▼                        ▼
API Response            5 sec timeout              Network Error
  received              (no response)               (connection failed)
     │                         │                        │
     ├──────────────────┬──────┴────────────────────────┤
     │                 │                                │
   ✅ OK           ❌ FAILED                        ❌ FAILED
     │                 │                                │
     ▼                 ▼                                │
Use API           Fallback to                         │
data              localStorage               ┌────────┴────┘
     │             cache                     │
     ├─ Save to   │                          │
     │  localStorage  └──────────────────────┘
     │  (backup)           │
     └────────────┬────────┘
                  │
                  ▼
            Set isOffline = true
                  │
                  ▼
         Use cached data
         (app still works!)
                  │
                  ▼
      Next request will retry
      backend connection
```

## Comparison: Before vs After

### BEFORE (Device-Specific)
```
Desktop                Mobile
  │                      │
  ├─ Store in          ├─ Store in
  │  localStorage       │  localStorage
  │  (isolated)         │  (isolated)
  │                      │
  ├─ Posts visible    ├─ NO Posts!
  │  on desktop         │  (different device)
  │                      │
  └─────────────────────┘
       NOT SYNCED ❌
```

### AFTER (Cloud-Synced)
```
Desktop                Mobile
  │                      │
  ├─ Store in ──┐    ┌─ Store in
  │  localStorage│    │  localStorage
  │ (cache)      │    │ (cache)
  │              ▼    ▼              
  │          ☁️ CLOUD DATABASE ☁️
  │              ▲    ▲
  │  ┌───────────┘    │
  │  │                │
  ├─ Fetch ───────────┴─► Fetch
  │  from backend           from backend
  │                         │
  ├─ Posts visible ◀──┬────┤
  │  on desktop       │    ├─ Posts visible
  │                   │    │  on mobile
  │                   │    │
  └────────────────────────┘
      ✅ ALWAYS SYNCED ✅
```

---

**Key Insight**: The database.js file is the "smart" layer that decides:
1. Is backend available?
2. If YES → use backend (sync across devices)
3. If NO → use localStorage (work offline)
4. When backend comes back online → sync automatically

This architecture ensures the app works in ALL scenarios! 🎯
