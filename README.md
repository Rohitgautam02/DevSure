# DevSure 🛡️

> **GitHub Repository Analyzer for Code Quality, Security & Best Practices**

DevSure helps developers and students validate their projects before interviews, submissions, or production deployment by analyzing GitHub repositories for real-world quality standards.

---

## 🎯 What DevSure Does

Submit a GitHub repository URL and get:
- 🔒 **Security Analysis** - Vulnerability scanning via npm audit
- 📊 **Code Quality** - ESLint analysis with intelligent config detection
- 🧪 **Testing Assessment** - Test framework detection
- 📦 **Dependency Health** - Outdated package detection
- 📋 **Project Hygiene** - README, LICENSE, CI/CD checks
- 🏷️ **Smart Repo Type Detection** - Libraries scored differently than applications

---

## 🏗️ Features

### ✅ Supported
- **GitHub Repository Analysis**
  - Security vulnerability scanning (npm audit)
  - Production vs devDependency separation for libraries
  - ESLint analysis with project config detection
  - TypeScript support detection
  - Test framework detection (Jest, Vitest, Mocha, etc.)
  - CI/CD configuration detection
  - Monorepo support (packages/*, frontend/, backend/)

- **Smart Repo Type Detection**
  - 📱 **Application** - Full-stack apps, websites
  - 📦 **Library** - npm packages (Axios, Lodash, etc.)
  - 🔧 **CLI** - Command-line tools
  - 🏗️ **Framework** - Express, Fastify, etc.
  - 📁 **Monorepo** - Lerna, Nx, Turborepo workspaces

- **Industry-Aligned Scoring (0-95)**
  - Security: 30 points max
  - Code Quality: 25 points max
  - Testing: 20 points max
  - Dependencies: 10 points max
  - Project Hygiene: 10 points max

- **Plain English Reports**
  - Non-technical summaries
  - Priority action items with commands
  - Time estimates for fixes

### 🚧 Coming Soon
- Deployment URL analysis (Lighthouse integration)
- PDF report export
- Badge embeds for README
- Repository comparison

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 + Tailwind CSS |
| Backend | Node.js + Express |
| Database | SQLite (Prisma ORM) |
| Auth | JWT |
| Analysis | npm audit, ESLint, npm outdated |
| Jobs | DB Polling |

---

## 📁 Project Structure

```
DevSure/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── analyzers/
│   │   │   ├── githubAnalyzer.js    # Core repo analysis
│   │   │   ├── lighthouseAnalyzer.js # Performance (coming)
│   │   │   └── fullStackAnalyzer.js  # Combined analysis
│   │   ├── middlewares/
│   │   └── index.js
│   ├── prisma/
│   └── package.json
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx                  # Home page
│   │   └── report/[id]/page.tsx      # Report display
│   ├── components/
│   └── package.json
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Git

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your settings
npx prisma generate
npx prisma db push
npm start
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

## 📊 Scoring System

### Categories (95 points max)

| Category | Max Points | What's Checked |
|----------|------------|----------------|
| 🔒 Security | 30 | npm audit vulnerabilities |
| 📊 Code Quality | 25 | ESLint errors/warnings, TypeScript |
| 🧪 Testing | 20 | Test framework, CI/CD |
| 📦 Dependencies | 10 | Outdated packages, vuln deps |
| 📋 Hygiene | 10 | README, LICENSE, structure |

### Confidence Multiplier
- **HIGH** (≥80% checks passed): ×1.0
- **MEDIUM** (40-79%): ×0.85
- **LOW** (<40%): ×0.7

### Verdicts

**For Applications:**
| Score | Verdict |
|-------|---------|
| 85+ | 🏆 Excellent |
| 70-84 | 🚀 Production Ready |
| 55-69 | ✅ Acceptable |
| 40-54 | 📈 Developing |
| 25-39 | ⚠️ Needs Work |
| <25 | 🚫 Beginner Level |

**For Libraries:**
| Score | Verdict |
|-------|---------|
| 85+ | 🏆 Excellent Library |
| 70-84 | 🚀 Production-Grade |
| 55-69 | ✅ Good Library |
| 40-54 | 📦 Functional Library |
| <40 | ⚠️ Needs Attention |

---

## 🔗 API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile

### Projects
- `POST /api/projects/submit` - Submit GitHub URL for analysis
- `GET /api/projects/:id/status` - Check analysis status
- `GET /api/projects/:id/report` - Get analysis report
- `GET /api/projects` - List user's projects
- `DELETE /api/projects/:id` - Delete a project

### Health
- `GET /api/health` - API health check

---

## 🔑 Environment Variables

### Backend (.env)
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key"
PORT=5000
TEMP_DIR="/tmp/devsure-repos"
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## 📜 License

Proprietary - All Rights Reserved

---

## 👨‍💻 Author

Built with ❤️ for developers and students worldwide
