# Guftaguu — Documentation Index

> **Version:** 2.0.0 | **Last Updated:** August 2026 | **Status:** Polyglot Architecture (Node.js & Spring Boot Java 17)

---

## 📂 Document Directory

| # | File | Purpose |
|---|------|---------|
| 00 | `00_INDEX.md` | This file — master navigation |
| 01 | `01_STUDY_NOTES.md` | Technologies studied and concepts learned |
| 02 | `02_SYSTEM_DESIGN.md` | High-Level Design (HLD) and Low-Level Design (LLD) |
| 03 | `03_ARCHITECTURE.md` | Project architecture, data flow, and integration map |
| 04 | `04_API_REFERENCE.md` | HTTP REST API and WebSocket event reference |
| 05 | `05_COMPONENT_GUIDE.md` | Frontend component library and usage guide |
| 06 | `06_FUTURE_ROADMAP.md` | Planned features and technical upgrades |
| 07 | `07_SYSTEM_ARCHITECTURE_COMPONENTS.md` | Comprehensive Enterprise System Architecture & Components Manual |

---

## 🚀 Quick Start

```bash
# Spring Boot Java Backend (Port 3001 WebSocket / 3002 REST)
cd backend-spring && .\start.ps1

# OR Node.js Backend (Port 3001)
cd backend && node index.js

# Frontend
cd frontend && npm run dev
```

- **Frontend:** http://localhost:5173
- **Spring Boot Backend:** http://localhost:3001 (WebSocket), http://localhost:3002 (REST)
- **Production Frontend:** https://guftaguu.vercel.app
- **Production Backend:** https://guftaguu-backend.onrender.com

---

## 📌 Project At a Glance

Guftaguu is an **anonymous real-time chat platform** with built-in multiplayer mini-games. Users are instantly paired with a random stranger — no login, no history, no traces. Think modern Omegle, but with Chess, Connect 4, and Reaction games built right in.

**Stack:** React + Vite (Frontend) · Spring Boot Java 17 / Node.js + Netty-SocketIO (Backend) · Upstash Redis Cloud (Matchmaking Queue) · Vercel + Render (Hosting)
