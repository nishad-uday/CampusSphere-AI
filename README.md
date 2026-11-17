# CampusSphere AI



**An AI-Powered College Management and Student Support Platform**



CampusSphere AI connects students, faculty members and college administrators through academic services, communication tools and an AI-powered campus assistant.



## Dashboards

1. Student Dashboard

2. Faculty Dashboard

3. College Admin Dashboard



## Technology Stack

\- Frontend: React, Vite, JavaScript

\- Backend: Python, FastAPI, Uvicorn

\- Database: PostgreSQL, pgvector

\- Supporting Services: Redis, Docker Compose

\- AI: Gemini API, Retrieval-Augmented Generation (RAG)



## Main Features

\- Authentication and role-based access

\- Student and Faculty Management

\- Student Profiles

\- Direct Messaging

\- Notices and Announcements

\- Learning Resources

\- Academic Q\&A

\- AI Campus Assistant

\- Document Upload and Retrieval



## Local Setup



### Requirements

\- Python 3.11+

\- Node.js 20+

\- Docker Desktop

\- Git



### Configure Environment

```powershell

Copy-Item .env.example .env

Copy-Item backend/.env.example backend/.env

Copy-Item frontend/.env.example frontend/.env

```



### Start Database and Redis

```powershell

docker compose up -d

docker compose ps

```



Enable pgvector:

```sql

CREATE EXTENSION IF NOT EXISTS vector;

```



### Backend Setup

```powershell

cd backend

py -3.11 -m venv .venv

.\\\.venv\\\\Scripts\\\\Activate.ps1

pip install -r requirements.txt

alembic upgrade head

uvicorn app.main:app --reload --host 127.0.0.1 --port 8001

```



API Documentation: http://127.0.0.1:8001/docs



### Frontend Setup

Open another terminal:

```powershell

cd frontend

npm install

npm run dev

```



Frontend: http://localhost:5173



### Testing

Backend:

```powershell

cd backend

python -m pytest -v

```



Frontend:

```powershell

npm run build

```



## Deployment

Planned hosting architecture:

\- GitHub: Source code

\- Vercel: Frontend

\- Render: Backend

\- Managed PostgreSQL with pgvector

\- Managed Redis



## Security

\- Never commit `.env` files.

\- Never publish API keys, passwords or access tokens.

\- Keep uploaded college documents private.

\- Enforce role-based authorization on backend endpoints.

\- Use HTTPS in production.



## Project Scope

CampusSphere AI includes Student, Faculty and College Admin dashboards.



Future enhancements may include attendance, timetable, assignments, analytics and mobile applications.



## License

An appropriate open-source license should be selected before permitting reuse of this public repository.
