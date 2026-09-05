# 🌾 AgriKart 2.0 — Farmer-Centric AgriTech Platform

[![Live Demo](https://img.shields.io/badge/Live%20Demo-agri--kart.vercel.app-22c55e?style=for-the-badge&logo=vercel)](https://agri-kart.vercel.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js)](https://nodejs.org/)
[![Supabase](https://img.shields.io/badge/Database-Supabase%20(PostgreSQL)-3ECF8E?logo=supabase)](https://supabase.com/)
[![Clerk](https://img.shields.io/badge/Auth-Clerk-6C47FF?logo=clerk)](https://clerk.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue?logo=typescript)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/ML-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python)](https://www.python.org/)

> 🌐 **Live Web Application:** [https://agri-kart.vercel.app/](https://agri-kart.vercel.app/)
>
> **Your Farmer's Digital Companion** — A comprehensive digital ecosystem combining marketplace, disease intelligence, AI guidance, government information, and continuous learning.

AgriKart 2.0 is a **production-grade, AI-ready agricultural platform** that empowers Indian farmers with technology, knowledge, and direct market access. Beyond e-commerce, it's an intelligent companion providing disease detection, expert guidance, government scheme information, and agricultural news—all powered by continuous feedback loops. Accessible live at [agri-kart.vercel.app](https://agri-kart.vercel.app/).

---

## 🎯 Vision

AgriKart evolves into a **farmer-centric digital ecosystem** that combines:

1. **🛒 Agricultural Marketplace** — Direct vendor-to-farmer commerce, eliminating middlemen
2. **🔬 Disease Intelligence System** — AI-powered crop disease detection with treatment recommendations
3. **🤖 AI Agricultural Assistant** — Multi-domain conversational guidance (diseases, schemes, products, news)
4. **📋 Government Scheme Hub** — Centralized access to agricultural subsidies and eligibility information
5. **📰 Agri News & Alerts** — Curated agricultural news, market updates, weather alerts, pest alerts
6. **🏪 Vendor Ecosystem** — Fair pricing, bulk ordering, transparent ratings
7. **🧠 Continuous Learning Flywheel** — User feedback loops for continuous model improvement
8. **📊 Future Recommendation Systems** — Product recommendations, crop recommendations, personalized alerts

---

## 🎯 Problem Statement

Farmers face multiple challenges:

- **Marketplace Issues:** Middlemen inflate prices, lack transparency, difficulty finding quality products
- **Health Issues:** Can't identify crop diseases, limited access to expert guidance
- **Information Gap:** Unaware of government subsidies and schemes
- **Fragmented Data:** Agricultural information scattered across multiple platforms
- **Lack of Personalization:** Generic advice instead of farmer-specific guidance

**AgriKart 2.0 solves this** as an integrated ecosystem with marketplace, disease intelligence, AI guidance, and continuous learning.

---

## 🚀 Tech Stack

> **Production-Grade Architecture:** Independent, scalable services optimized for different concerns.

### Frontend

| Technology           | Version | Role                         |
| -------------------- | ------- | ---------------------------- |
| **Next.js**          | 14.x    | React framework (App Router) |
| **Clerk Next.js**    | 5.x     | User auth, sessions & 2FA    |
| **React**            | 18.x    | UI library                   |
| **TypeScript**       | 5.4     | Type safety                  |
| **Tailwind CSS**     | 3.4     | Utility-first styling        |
| **Zustand**          | 4.4     | Global state management      |
| **TanStack Query**   | 5.x     | Server state management      |
| **Socket.io Client** | 4.7     | Real-time features           |
| **Framer Motion**    | 11.x    | Animations & transitions     |
| **React Icons**      | 5.x     | Icon library                 |
| **Axios**            | 1.7     | HTTP client                  |
| **Supabase JS**      | 2.x     | Direct PostgreSQL access & storage |

### Backend

| Technology             | Version | Role                          |
| ---------------------- | ------- | ----------------------------- |
| **Node.js**            | 18+     | Runtime                       |
| **Express.js**         | 4.18    | REST API framework            |
| **@clerk/backend**     | 1.x     | Clerk JWT token verification  |
| **TypeScript**         | 5.4     | Type safety                   |
| **Socket.io**          | 4.7     | WebSocket server              |
| **Supabase Admin SDK** | 2.x     | PostgreSQL & Storage manager  |
| **Zod**                | 3.x     | Schema validation             |
| **JWT**                | 9.x     | Token-based authentication    |
| **Winston**            | 3.x     | Structured logging            |
| **CORS**               | 2.8     | Cross-origin resource sharing |

### ML Service

| Technology       | Version | Role                           |
| ---------------- | ------- | ------------------------------ |
| **Python**       | 3.10+   | Runtime                        |
| **FastAPI**      | 0.100+  | High-performance API framework |
| **PyTorch**      | 2.x     | Deep learning framework        |
| **OpenCV**       | 4.8     | Image processing               |
| **NumPy/Pandas** | Latest  | Data processing                |
| **MLflow**       | 2.x     | Experiment tracking & registry |
| **Scikit-learn** | 1.x     | ML utilities                   |

### AI Assistant Service

| Technology         | Version | Role              |
| ------------------ | ------- | ----------------- |
| **Python**         | 3.10+   | Runtime           |
| **FastAPI**        | 0.100+  | API framework     |
| **LangChain**      | 0.1.x   | LLM orchestration |
| **LangGraph**      | 0.1.x   | Agent framework   |
| **Gemini/OpenAI**  | Latest  | LLM providers     |
| **FAISS/Pinecone** | Latest  | Vector stores     |

### Cloud & Infrastructure

| Service                  | Role                                  |
| ------------------------ | ------------------------------------- |
| **Clerk**                | User Identity, Auth & 2FA Management  |
| **Supabase**             | PostgreSQL Database + Cloud Storage   |
| **Vercel**               | Frontend deployment & Edge CDN        |
| **Railway / Render**     | Backend + ML + LLM deployment         |
| **GitHub Actions**       | CI/CD pipelines                       |
| **DagsHub** _(optional)_ | ML experiments & model registry       |

---

## 🔐 Hybrid Authentication & Profile Architecture

AgriKart 2.0 adopts a **decoupled hybrid architecture** separating user identity authentication from core business data:

```
                  ┌─────────────────────────────────────┐
                  │          Clerk Authentication       │
                  │ (Email/Pass, Google, 2FA, Sessions) │
                  └──────────────────┬──────────────────┘
                                     │ JIT Token Sync
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   AgriKart Full-Stack Application                      │
│                                                                        │
│   Frontend:  useAuth Hook  ──►  Farmer / Vendor Role Routing           │
│   Backend:   clerk_auth    ──►  requireClerkAuth & Role Guard          │
│   Database:  Supabase DB   ──►  public.profiles & public.vendors       │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Authentication Engine (Clerk)**:
   * Handles user sign-up, sign-in, password resets, Google OAuth, two-factor authentication (2FA), and active device sessions.
   * Eliminates previous email verification blockers and credential verification issues.

2. **Database & Assets (Supabase PostgreSQL)**:
   * All business tables (`products`, `orders`, `vendors`, `cart_items`, `reviews`, `disease_predictions`, `schemes`, `articles`, `chat_sessions`) remain securely in Supabase.
   * The migration script (`clerk_supabase_migration.sql`) decoupled `profiles.id` from `auth.users(id)` into `VARCHAR(255)`, maintaining full referential integrity and clean RLS policies.

3. **Just-in-Time (JIT) Profile Synchronization**:
   * When a user signs in through Clerk, AgriKart's backend middleware (`backend/src/middleware/clerk_auth/`) and frontend hook (`useAuth`) automatically synchronize user metadata into Supabase `public.profiles` and `public.vendors`.

4. **Comprehensive Settings & Profile Hub (`/profile`)**:
   * **🌾 Personal Details**: Full Name, Email, Phone, State, Village / City, and Bio.
   * **🚜 Farm & Land Info**: Land Size (Acres), Farming Type, and Primary Crops grown (used by disease prediction and scheme eligibility engines).
   * **🏪 Vendor & Business Profile**: Switch between Farmer and Vendor roles, Store Name, GSTIN, PAN, Business Phone, and Warehouse Address.
   * **🔔 Preferences & Alerts**: Multi-language support (English, Hindi, Marathi, Telugu, Tamil) and custom alert notification switches.
   * **🛡️ Security & Clerk Manager**: One-click modal to manage Clerk passwords, connected social logins, and multi-factor authentication.

---

## 📁 Project Structure

AgriKart 2.0 follows a **monorepo structure** with independent, modular services:

```
AgriKart/
│
├── 📄 README.md                 # Project overview
├── 📄 package.json              # Monorepo root
├── 📄 .env.example              # Environment variables template
│
├── docs/
│   ├── ARCHITECTURE.md          # System architecture & design decisions
│   ├── DATABASE.md              # Schema design & RLS policies
│   ├── API.md                   # API specification
│   ├── DEPLOYMENT.md            # Deployment guides
│   ├── ML_PIPELINE.md           # ML workflow & training
│   ├── CONTRIBUTION.md          # Contributing guidelines
│   └── SECURITY.md              # Security best practices
│
├── frontend/                    # Next.js 14 Application (TypeScript)
│   ├── app/                     # App Router structure
│   │   ├── (auth)/              # Auth routes (login, signup, verify)
│   │   ├── (dashboard)/         # Farmer/Vendor dashboards
│   │   ├── (marketplace)/       # Products, cart, checkout
│   │   │   ├── products/
│   │   │   ├── cart/
│   │   │   └── checkout/
│   │   ├── (disease)/           # Disease detection
│   │   │   ├── detect/
│   │   │   └── results/
│   │   ├── (schemes)/           # Government schemes hub
│   │   │   ├── browse/
│   │   │   └── eligibility/
│   │   ├── (news)/              # News & alerts
│   │   │   └── feed/
│   │   ├── (assistant)/         # AI Assistant
│   │   │   └── chat/
│   │   └── admin/               # Admin panel
│   │
│   ├── components/              # Reusable React components
│   │   ├── ui/                  # Design system (buttons, cards, etc.)
│   │   ├── marketplace/         # Product, cart, checkout components
│   │   ├── disease/             # Disease detection components
│   │   ├── schemes/             # Scheme browsing components
│   │   ├── news/                # News feed components
│   │   ├── assistant/           # AI chat components
│   │   └── common/              # Navbar, footer, layout
│   │
│   ├── lib/
│   │   ├── api/                 # API client functions
│   │   │   ├── products.ts
│   │   │   ├── disease.ts
│   │   │   ├── schemes.ts
│   │   │   ├── news.ts
│   │   │   ├── orders.ts
│   │   │   └── chat.ts
│   │   ├── hooks/               # Custom React hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useCart.ts
│   │   │   └── useProduct.ts
│   │   ├── store/               # Zustand state stores
│   │   │   ├── authStore.ts
│   │   │   ├── cartStore.ts
│   │   │   └── uiStore.ts
│   │   ├── utils/               # Helper functions
│   │   │   ├── validation.ts
│   │   │   ├── formatting.ts
│   │   │   └── storage.ts
│   │   └── supabase.ts          # Supabase client setup
│   │
│   ├── config/
│   │   ├── env.ts
│   │   └── features.ts          # Feature flags
│   │
│   ├── styles/
│   │   └── globals.css
│   │
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── next.config.mjs
│   └── postcss.config.js
│
├── backend/                     # Express.js Application (TypeScript)
│   ├── src/
│   │   ├── routes/              # Express route handlers
│   │   │   ├── auth.ts
│   │   │   ├── marketplace.ts   # Products, orders, vendors
│   │   │   ├── disease.ts       # Disease predictions
│   │   │   ├── schemes.ts       # Government schemes
│   │   │   ├── news.ts          # News & alerts
│   │   │   └── chat.ts          # WebSocket handlers
│   │   │
│   │   ├── services/            # Business logic layer
│   │   │   ├── auth/
│   │   │   │   ├── authService.ts
│   │   │   │   └── tokenService.ts
│   │   │   ├── marketplace/
│   │   │   │   ├── productService.ts
│   │   │   │   ├── vendorService.ts
│   │   │   │   ├── orderService.ts
│   │   │   │   └── cartService.ts
│   │   │   ├── disease/
│   │   │   │   ├── predictionService.ts
│   │   │   │   └── mlClient.ts
│   │   │   ├── schemes/
│   │   │   │   └── schemeService.ts
│   │   │   ├── news/
│   │   │   │   └── newsService.ts
│   │   │   └── chat/
│   │   │       └── chatService.ts
│   │   │
│   │   ├── middleware/          # Express middleware
│   │   │   ├── authMiddleware.ts      # JWT verification
│   │   │   ├── validationMiddleware.ts # Zod validation
│   │   │   ├── errorHandler.ts        # Error handling
│   │   │   └── logging.ts             # Request logging
│   │   │
│   │   ├── models/              # TypeScript types & interfaces
│   │   │   ├── types.ts
│   │   │   └── database.ts
│   │   │
│   │   ├── utils/               # Utility functions
│   │   │   ├── supabase.ts      # Supabase admin client
│   │   │   ├── validators.ts    # Schema validators
│   │   │   └── helpers.ts
│   │   │
│   │   ├── config/
│   │   │   ├── env.ts
│   │   │   └── constants.ts
│   │   │
│   │   └── server.ts            # Express app setup
│   │
│   ├── package.json
│   └── tsconfig.json
│
├── ml/                          # FastAPI ML Service (Python)
│   ├── api/
│   │   ├── main.py              # FastAPI app
│   │   ├── routes/
│   │   │   ├── health.py        # Health checks
│   │   │   ├── predict.py       # Disease prediction
│   │   │   └── models.py        # Model management
│   │   └── middleware/
│   │       ├── auth.py
│   │       └── logging.py
│   │
│   ├── src/
│   │   ├── inference.py         # Model loading & inference
│   │   ├── preprocessing.py     # Image preprocessing
│   │   ├── postprocessing.py    # Result formatting
│   │   └── utils/
│   │       ├── logger.py
│   │       └── helpers.py
│   │
│   ├── models/                  # Pre-trained models
│   │   └── disease_detection_v1/
│   │       ├── model.pt         # PyTorch model
│   │       └── config.json      # Model config
│   │
│   ├── notebooks/               # Development notebooks
│   │   ├── training_placeholder.ipynb
│   │   └── evaluation_placeholder.ipynb
│   │
│   ├── tests/
│   │   ├── test_inference.py
│   │   └── test_preprocessing.py
│   │
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .dockerignore
│
├── llm/                         # AI Assistant Service (LangChain)
│   ├── api/
│   │   ├── main.py              # FastAPI app
│   │   ├── routes/
│   │   │   ├── chat.py          # Chat endpoint
│   │   │   └── rag.py           # RAG endpoints
│   │   └── middleware/
│   │       └── logging.py
│   │
│   ├── src/
│   │   ├── chain.py             # LangChain setup
│   │   ├── rag.py               # RAG implementation
│   │   ├── knowledge/           # Knowledge sources
│   │   │   ├── disease_kb.py    # Disease knowledge
│   │   │   ├── scheme_kb.py     # Scheme knowledge
│   │   │   ├── product_kb.py    # Product knowledge
│   │   │   └── news_kb.py       # News knowledge
│   │   └── utils/
│   │       ├── logger.py
│   │       └── helpers.py
│   │
│   ├── prompts/                 # LLM prompts
│   │   ├── disease_guidance.txt
│   │   ├── scheme_guidance.txt
│   │   ├── product_guidance.txt
│   │   └── system.txt
│   │
│   ├── tests/
│   │   └── test_chat.py
│   │
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .dockerignore
│
├── supabase/                    # Supabase Configuration
│   ├── migrations/              # Database migrations
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_rls_policies.sql
│   │   └── 003_indexes.sql
│   │
│   ├── seed/
│   │   ├── seed.sql             # Initial data
│   │   └── diseases.json        # Disease reference data
│   │
│   ├── functions/               # PostgreSQL functions
│   │   ├── handle_new_user.sql
│   │   └── create_default_cart.sql
│   │
│   └── config.toml              # Supabase configuration
│
├── .github/
│   └── workflows/               # CI/CD pipelines
│       ├── frontend.yml         # Frontend tests & deploy
│       ├── backend.yml          # Backend tests & deploy
│       ├── ml.yml               # ML service tests & deploy
│       ├── llm.yml              # LLM service tests & deploy
│       ├── tests.yml            # Integration & e2e tests
│       └── deploy.yml           # Production deployment
│
├── tests/                       # Test suite
│   ├── unit/
│   │   ├── backend/
│   │   │   ├── services/
│   │   │   └── middleware/
│   │   └── frontend/
│   │       ├── components/
│   │       └── hooks/
│   │
│   ├── integration/
│   │   ├── api/
│   │   │   ├── auth.test.ts
│   │   │   ├── marketplace.test.ts
│   │   │   ├── disease.test.ts
│   │   │   └── schemes.test.ts
│   │   └── flows/
│   │       ├── checkout.test.ts
│   │       └── disease_detection.test.ts
│   │
│   ├── e2e/
│   │   ├── marketplace.spec.ts
│   │   ├── disease.spec.ts
│   │   └── assistant.spec.ts
│   │
│   └── performance/
│       ├── ml/
│       │   └── inference.bench.ts
│       └── api/
│           └── load.bench.ts
│
└── CHANGELOG.md                 # Version history
```

---

│ │ └── providers.tsx
│ ├── lib/ # Utilities, store, API client
│ ├── styles/ # Global styles
│ ├── public/ # Static assets
│ ├── tailwind.config.ts
│ ├── next.config.mjs
│ └── .env.local.example
│
├── backend/ # Node.js + Express API Server
│ ├── server.js # Main entry — REST API + Socket.io
│ ├── config/ # DB & service configuration
│ ├── middleware/ # Auth & validation middleware
│ ├── check_db.js # Database connection health check
│ ├── seed_db.js # Database seeding script
│ ├── package.json
│ └── .env.example
│
├── docs/ # Documentation
│ ├── API.md # REST API reference
│ ├── DATABASE.md # Schema & table definitions
│ └── DEPLOYMENT.md # Cloud deployment guide
│
├── tests/ # Executable Jest test suite
│ ├── run_tests.js # ▶ Master runner → node run_tests.js
│ ├── setup.js # Loads backend/.env before tests
│ ├── package.json # Jest + test dependencies
│ ├── database.test.js # Supabase connection & CRUD tests
│ ├── backend.test.js # REST API endpoint tests (axios)
│ ├── socket.test.js # Socket.io real-time event tests
│ └── frontend.test.js # Next.js page smoke tests (axios)
│
├── .gitignore
└── README.md # This file

````

---

## 🌟 Key Features

### Phase 1-4: Core Platform (In Development)
- ✅ **User Authentication** — Supabase Auth with email verification
- ✅ **Agricultural Marketplace** — Product catalog, search, cart, checkout
- ✅ **Vendor Management** — Vendor profiles, inventory, orders
- ✅ **Real-time Chat** — WebSocket-based vendor-farmer communication
- ✅ **Order Management** — Order tracking, status updates

### Phase 5: Disease Intelligence
- 🔄 **Disease Detection** — Upload crop images, get AI predictions
- 🔄 **Treatment Recommendations** — ML-powered suggestions
- 🔄 **Confidence Scoring** — Model confidence metrics
- 🔄 **Feedback Collection** — User feedback for continuous improvement
- 🔄 **Farmer Learning** — Educational content linked to diseases

### Phase 6: Government Schemes
- 📋 **Scheme Browse** — State-wise government schemes
- 📋 **Eligibility Checker** — Filter by farmer profile
- 📋 **Application Links** — Direct government portal links
- 📋 **Deadline Tracking** — Important dates & reminders

### Phase 7: Agri News Platform
- 📰 **News Feed** — Curated agricultural news
- 📰 **Categorized Updates** — Market, weather, pest, government
- 📰 **Real-time Alerts** — Critical information push notifications
- 📰 **Personalization** — Farmer location & preference-based news

### Phase 8: AI Agricultural Assistant
- 🤖 **Multi-turn Conversations** — Context-aware chat
- 🤖 **Disease Guidance** — Explain disease predictions
- 🤖 **Product Recommendations** — Suggest products for problems
- 🤖 **Scheme Discovery** — Help navigate government schemes
- 🤖 **News Summaries** — Digest important news

### Phase 9: ML Pipeline
- 📊 **Model Training** — PyTorch disease detection models
- 📊 **Experiment Tracking** — MLflow monitoring
- 📊 **Model Versioning** — DagsHub model registry
- 📊 **Batch Predictions** — Efficient inference
- 📊 **Performance Monitoring** — Accuracy tracking

---

## 🌐 Live Deployment

AgriKart 2.0 is deployed in production and accessible globally:

* **Production URL:** [https://agri-kart.vercel.app/](https://agri-kart.vercel.app/)
* **Platform:** Vercel (Next.js 14 App Router)
* **Database & Storage:** Supabase PostgreSQL & Supabase Cloud Storage
* **Authentication:** Clerk Authentication Engine

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ (with npm)
- **Python** 3.10+
- **Supabase** account — [supabase.com](https://supabase.com)
- **Git**

### 1. Clone & Configure

```bash
git clone https://github.com/your-org/AgriKart
cd AgriKart

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# Required: SUPABASE_URL, SUPABASE_SERVICE_KEY
# Optional: LLM_API_KEY (for AI Assistant in Phase 8)
````

### 2. Backend Setup

```bash
cd backend

# Install Node dependencies
npm install

# Start Express server (development)
npm run dev
# ✅ API available at http://localhost:3001
```

### 3. Frontend Setup

```bash
cd ../frontend

# Install Node dependencies
npm install

# Start Next.js development server
npm run dev
# ✅ Application available at http://localhost:3000
```

### 4. ML Service Setup (Phase 5+)

```bash
cd ../ml

# Create Python virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Start FastAPI server
uvicorn api.main:app --reload --port 8000
# ✅ ML API available at http://localhost:8000
```

### 5. LLM Service Setup (Phase 8+)

```bash
cd ../llm

# Create Python virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Set environment variables
export GEMINI_API_KEY="your-api-key"
# or OpenAI:
export OPENAI_API_KEY="your-api-key"

# Start FastAPI server
uvicorn api.main:app --reload --port 8001
# ✅ LLM API available at http://localhost:8001
```

### 6. Database Setup

1. Create project at [supabase.com](https://supabase.com)
2. Copy your `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` to `.env`
3. Run migrations:

```bash
# From supabase/ directory
# Migrations are applied automatically when you set up Supabase CLI

supabase link --project-ref your_project_ref
supabase db push
```

4. Or manually run SQL from [docs/DATABASE.md](docs/DATABASE.md) in Supabase console

---

## 📚 Documentation

| Document                                | Purpose                                        |
| --------------------------------------- | ---------------------------------------------- |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, principles, data flows          |
| [DATABASE.md](docs/DATABASE.md)         | Schema design, RLS policies, relationships     |
| [API.md](docs/API.md)                   | REST API endpoints, request/response formats   |
| [ML_PIPELINE.md](docs/ML_PIPELINE.md)   | Model training, inference, MLflow setup        |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md)     | Production deployment, scaling, monitoring     |
| [CONTRIBUTION.md](docs/CONTRIBUTION.md) | Development guidelines, code standards         |
| [SECURITY.md](docs/SECURITY.md)         | Authentication, authorization, data protection |

---

## 🏃 Development Workflow

### Running All Services Locally

```bash
# Terminal 1: Frontend
cd frontend && npm run dev

# Terminal 2: Backend
cd backend && npm run dev

# Terminal 3: ML Service (Phase 5+)
cd ml && source venv/bin/activate && uvicorn api.main:app --reload

# Terminal 4: LLM Service (Phase 8+)
cd llm && source venv/bin/activate && uvicorn api.main:app --reload --port 8001
```

### Testing

```bash
# Run all tests
npm run test

# Run specific test suite
npm run test -- tests/unit

# Run integration tests
npm run test:integration

# Run e2e tests
npm run test:e2e
```

### Database Migrations

```bash
# Create new migration
supabase migration new your_migration_name

# Apply migrations
supabase db push

# Reset database (development only)
supabase db reset
```

---

## 🔄 Implementation Phases

AgriKart 2.0 is built incrementally across 10 phases, each delivering production-grade features:

| Phase  | Module               | Status          | Key Deliverables                                                                                                                                                                                   |
| ------ | -------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1**  | Project Structure    | ✅ **COMPLETE** | [Architecture docs](docs/ARCHITECTURE.md), [Security guide](docs/SECURITY.md), [Contribution guide](docs/CONTRIBUTION.md)                                                                          |
| **2**  | Supabase Design      | ✅ **COMPLETE** | [18-table schema](docs/DATABASE.md), RLS policies, indexes                                                                                                                                         |
| **3**  | Authentication       | ✅ **COMPLETE** | [JWT middleware](backend/src/middleware/auth.ts), [Auth service](backend/src/services/auth/), [Role-based RBAC](backend/src/services/auth/roleService.ts), [20+ files](PHASE_3_FILES_INVENTORY.md) |
| **4**  | Marketplace          | ⏳ Next         | Products, vendors, orders, cart                                                                                                                                                                    |
| **5**  | Disease Intelligence | ⏳ Planned      | ML integration, image upload, predictions                                                                                                                                                          |
| **6**  | Government Schemes   | ⏳ Planned      | Scheme hub, eligibility checker                                                                                                                                                                    |
| **7**  | Agri News            | ⏳ Planned      | News feed, alerts, categorization                                                                                                                                                                  |
| **8**  | AI Assistant         | ⏳ Planned      | LangChain RAG, multi-turn chat                                                                                                                                                                     |
| **9**  | ML Pipeline          | ⏳ Planned      | Training, MLflow, DagsHub, experimentation                                                                                                                                                         |
| **10** | CI/CD & Deploy       | ⏳ Planned      | GitHub Actions, automated testing                                                                                                                                                                  |

### Phase Details

Each phase includes:

- ✅ Architecture decisions explained
- ✅ Folder structure organized
- ✅ Production-grade code
- ✅ Type-safe implementations (TypeScript/Python)
- ✅ Documentation & examples
- ✅ Test structure
- ✅ Integration patterns

---

## 🏛️ Architecture Highlights

### Domain-Driven Design

```
AgriKart
├── Marketplace Domain        → Products, Vendors, Orders
├── Disease Domain            → Predictions, Feedback, Models
├── Schemes Domain            → Government Information
├── News Domain               → Articles, Alerts
├── Assistant Domain          → Chat, RAG, Knowledge
└── Flywheel Domain           → Data Collection, Feedback
```

### Microservices-Ready

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Next.js Front  │────→│  Express Back   │────→│  Supabase DB   │
│   (Port 3000)   │     │  (Port 3001)    │     │                │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               ↓
                    ┌──────────────────────┐
                    │  FastAPI ML Service  │
                    │   (Port 8000)        │
                    └──────────────────────┘
                               ↓
                    ┌──────────────────────┐
                    │ FastAPI LLM Service  │
                    │   (Port 8001)        │
                    └──────────────────────┘
```

### Scalability Features

- **Stateless Services** — All services can scale horizontally
- **Database Connection Pooling** — PgBouncer in Supabase
- **CDN & Edge Caching** — Vercel global network
- **Async Processing** — Non-blocking ML inference
- **Rate Limiting** — Token bucket algorithm
- **Caching Strategy** — Redis for hot data

---

## 🔐 Security First

- ✅ **Supabase Auth** — No password storage in app code
- ✅ **Row-Level Security** — Farmers can't see other farmers' data
- ✅ **JWT Validation** — Secure token verification
- ✅ **Environment Isolation** — Secrets never in code
- ✅ **SQL Injection Prevention** — Prepared statements
- ✅ **CORS Protection** — Configured origins only
- ✅ **Data Encryption** — TLS in transit, encryption at rest

---

## 🎓 Learning Resources

### For First-Time Contributors

1. Read [ARCHITECTURE.md](docs/ARCHITECTURE.md) — Understand the system
2. Check [CONTRIBUTION.md](docs/CONTRIBUTION.md) — Development guidelines
3. Review code in `frontend/components/ui/` — Design system patterns
4. Study `backend/src/services/` — Service layer examples

### For ML Engineers

1. Explore [ML_PIPELINE.md](docs/ML_PIPELINE.md)
2. Check `ml/notebooks/` for training placeholders
3. Review `ml/api/routes/predict.py` for inference API
4. Understand MLflow integration in `ml/src/`

### For Full-Stack Developers

1. Review folder structure in [ARCHITECTURE.md](docs/ARCHITECTURE.md)
2. Study `backend/src/middleware/` for request handling
3. Check `frontend/lib/api/` for client patterns
4. Understand state management in `frontend/lib/store/`

---

## 🤝 Contributing

We welcome contributions across all domains!

**Areas Needing Help:**

- Database schema optimization
- Frontend component design system
- ML model development
- Testing & QA
- Documentation

### Development Guidelines

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Follow code style in [CONTRIBUTION.md](docs/CONTRIBUTION.md)
3. Write tests for new features
4. Ensure all tests pass: `npm run test`
5. Submit a Pull Request with clear description

For detailed guidelines, see [CONTRIBUTION.md](docs/CONTRIBUTION.md).

---

## 📊 Project Status

| Component            | Status         | Notes                          |
| -------------------- | -------------- | ------------------------------ |
| Project Architecture | ✅ Complete    | Phase 1 documentation          |
| Backend Structure    | ⏳ In Progress | Express setup starting Phase 3 |
| Frontend Structure   | ⏳ In Progress | Next.js pages starting Phase 4 |
| Database Schema      | ⏳ Planned     | Phase 2 detailed design        |
| ML Service           | ⏳ Planned     | Phase 9 implementation         |
| LLM Service          | ⏳ Planned     | Phase 8 implementation         |
| CI/CD Pipelines      | ⏳ Planned     | Phase 10 automation            |
| Deployment           | ⏳ Planned     | Phase 10 setup                 |

---

## 🆘 Support & Community

- **Issues** — Report bugs via GitHub Issues
- **Discussions** — Ideas and questions in GitHub Discussions
- **Email** — agrikart@example.com
- **Documentation** — Start with [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## 🎯 Vision 2026

AgriKart 2.0 aims to become the **farmer's trusted digital companion**, offering:

✨ **Marketplace Excellence** — Fair prices, transparent vendors
🔬 **AI-Powered Insights** — Disease detection, smart recommendations
📚 **Knowledge Hub** — News, schemes, expert guidance
🌱 **Sustainable Support** — Practices for sustainable farming
💰 **Fair Pricing** — Eliminate middlemen, empower farmers
🌍 **Scale Impact** — Reach 10M+ farmers by 2027

---

## 📝 License

**MIT License** — Copyright (c) 2026 AgriKart Contributors

This project is open source and available under the MIT License. See [LICENSE](LICENSE) for details.

---

## 🙌 Acknowledgments

Built with ❤️ for Indian farmers and sustainable agriculture.

**Technology Partners:**

- [Supabase](https://supabase.com) — Database & Auth
- [Next.js](https://nextjs.org) — Frontend
- [FastAPI](https://fastapi.tiangolo.com) — ML & LLM services
- [LangChain](https://www.langchain.com) — AI orchestration
- [PyTorch](https://pytorch.org) — ML framework

**Inspiration:**

- Farmer-first design thinking
- Open source philosophy
- Sustainable agriculture
- Technology accessibility

---

**Last Updated:** June 2026  
**Current Version:** 2.0.0  
**Status:** Production-Grade Architecture, Phase 1 Complete ✅

See [LICENSE](LICENSE) for full text.

---

_Made with ❤️ for Indian Farmers · Last Updated: June 2026_
