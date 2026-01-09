# DevSure Deployment Guide

## 🚀 Deployment Overview

This guide covers deploying DevSure to production using free/low-cost services.

---

## 📊 Database Setup (Supabase - FREE)

### Step 1: Create Supabase Account
1. Go to [supabase.com](https://supabase.com)
2. Sign up with GitHub
3. Create a new project

### Step 2: Get Connection String
1. Go to Project Settings → Database
2. Copy the "URI" connection string
3. Replace `[YOUR-PASSWORD]` with your database password

### Step 3: Save Connection String
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres
```

---

## 🔧 Backend Deployment (Render - FREE)

### Step 1: Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub

### Step 2: Create New Web Service
1. Click "New" → "Web Service"
2. Connect your GitHub repo
3. Select the `backend` folder as root directory

### Step 3: Configure Service
```
Name: devsure-api
Environment: Node
Region: Oregon (US West)
Branch: main
Root Directory: backend
Build Command: npm install && npx prisma generate
Start Command: npm start
```

### Step 4: Add Environment Variables
```
DATABASE_URL = [Your Supabase connection string]
JWT_SECRET = [Generate a random 64-character string]
JWT_EXPIRES_IN = 7d
NODE_ENV = production
FRONTEND_URL = https://devsure.vercel.app
```

### Step 5: Deploy
1. Click "Create Web Service"
2. Wait for deployment (5-10 minutes)
3. Note your backend URL: `https://devsure-api.onrender.com`

### Step 6: Run Database Migration
After deployment, go to Render shell and run:
```bash
npx prisma db push
```

---

## 🎨 Frontend Deployment (Vercel - FREE)

### Step 1: Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub

### Step 2: Import Project
1. Click "Add New" → "Project"
2. Import your GitHub repository
3. Select the `frontend` folder as root directory

### Step 3: Configure Build Settings
```
Framework Preset: Next.js
Root Directory: frontend
Build Command: npm run build
Output Directory: .next
Install Command: npm install
```

### Step 4: Add Environment Variables
```
NEXT_PUBLIC_API_URL = https://devsure-api.onrender.com/api
```

### Step 5: Deploy
1. Click "Deploy"
2. Wait for deployment (2-3 minutes)
3. Your frontend will be live at: `https://devsure.vercel.app`

---

## ✅ Post-Deployment Checklist

- [ ] Backend health check: `https://your-api.onrender.com/api/health`
- [ ] Frontend loads correctly
- [ ] Registration works
- [ ] Login works
- [ ] Project submission works
- [ ] Analysis completes
- [ ] Report displays correctly

---

## 🔄 Updating Environment Variables

### Update Backend (Render)
1. Go to your service → Environment
2. Add/edit variables
3. Service will auto-restart

### Update Frontend (Vercel)
1. Go to your project → Settings → Environment Variables
2. Add/edit variables
3. Redeploy for changes to take effect

---

## 🐛 Troubleshooting

### "Database connection failed"
- Check DATABASE_URL is correct
- Ensure Supabase project is active
- Check if IP is whitelisted

### "Analysis not completing"
- Check Render logs for errors
- Ensure job runner is starting
- Verify database connection

### "Frontend can't reach backend"
- Check NEXT_PUBLIC_API_URL is correct
- Ensure backend is deployed and healthy
- Check CORS settings

### "JWT errors"
- Ensure JWT_SECRET is set
- Check token format in requests

---

## 💡 Tips

1. **Free tier limits**: Render free tier sleeps after 15 min inactivity. First request may take 30s.

2. **Custom domain**: Both Render and Vercel support custom domains.

3. **Monitoring**: Set up UptimeRobot for free monitoring.

4. **Scaling**: Upgrade Render/Vercel plans for production traffic.
