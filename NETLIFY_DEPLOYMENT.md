# Netlify Deployment Guide

Deploy your static frontend to Netlify.

## Quick Deploy

### Option 1: Drag & Drop

1. Go to [Netlify Drop](https://app.netlify.com/drop)
2. Drag your project folder onto the page
3. Your site is deployed!

### Option 2: Connect GitHub

1. Push your code to GitHub
2. Go to [Netlify](https://app.netlify.com)
3. Click **"Add new site"** → **"Import an existing project"**
4. Select your GitHub repository
5. Deploy settings:
   - Build command: (leave empty)
   - Publish directory: `.`
6. Click **"Deploy site"**

## After Deployment

### Update Backend URL

1. After deploying, note your Netlify URL: `https://your-site.netlify.app`
2. Deploy your backend (see BACKEND_DEPLOYMENT.md)
3. Update `netlify.toml` with your backend URL:
   ```toml
   [[redirects]]
     from = "/api/*"
     to = "https://your-backend.herokuapp.com/api/:splat"
   ```
4. Redeploy to apply changes

## Your Site URL

After deployment, your site will be at:
```
https://random-name.netlify.app
```

You can change the name in Netlify dashboard → **Site settings** → **Change site name**
