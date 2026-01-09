# DevSure 🛡️

> **A Universal Project Testing & Analysis Platform**

DevSure helps developers and students validate their projects before interviews, submissions, or production deployment.

---

## 🎯 What DevSure Does

Submit a deployment URL and get:
- ❌ Bugs & errors detection
- ⚠️ Code quality analysis
- 🚀 Performance metrics
- 🧱 Durability score
- 🛠️ Actionable improvement suggestions

---

## 🏗️ V1 Scope (Current)

✅ **Supported:**
- Deployment URL analysis
- Page load testing
- HTTP error detection
- Response time measurement
- Performance scoring
- Improvement suggestions

❌ **Not Yet Supported (V2):**
- ZIP file upload
- GitHub integration
- Static code analysis
- Load testing
- Security scanning

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 + Tailwind CSS |
| Backend | Node.js + Express |
| Database | PostgreSQL (Supabase/Neon) |
| ORM | Prisma |
| Auth | JWT |
| Jobs | DB Polling |
| Hosting | Vercel (FE) + Render (BE) |

---

## 📁 Project Structure

```
devsure/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── analyzers/
│   │   ├── middlewares/
│   │   └── index.js
│   ├── prisma/
│   └── package.json
│
├── frontend/
│   ├── app/
│   ├── components/
│   └── package.json
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database (Supabase/Neon recommended)

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database URL
npx prisma generate
npx prisma db push
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local with your API URL
npm run dev
```

---

## 📊 Scoring Algorithm

```
Base Score = 100

Deductions:
- Page unreachable     → -50
- HTTP error (4xx/5xx) → -30
- Timeout > 5s         → -20
- Response time > 2s   → -10
- Console errors       → -5 each
```

---

## 🔗 API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Projects
- `POST /api/projects/submit` - Submit URL for analysis
- `GET /api/projects/:id/status` - Check analysis status
- `GET /api/projects/:id/report` - Get analysis report
- `GET /api/projects` - List user's projects

---

## 📜 License

Proprietary - Patent Pending

---

## 👨‍💻 Author

Built with ❤️ for developers and students worldwide
