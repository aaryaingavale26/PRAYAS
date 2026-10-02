# PRAYAS 3.0 — Complete Backend

AI-powered accessible job application assistant backend built with FastAPI, Supabase (PostgreSQL + pgvector + Storage + Auth), and Google Gemini AI.

---

## Features

- **FastAPI Core**: RESTful API with automated OpenAPI / Swagger documentation (`/docs`).
- **Supabase Authentication & Multi-Tenant Authorization**: Protected endpoints using HTTP Bearer JWT verification (HS256 local verification or Supabase Auth API fallback).
- **Document Processing**: Validates and extracts clean text from accessible PDF and DOCX files.
- **Private Storage**: Secure private document storage bucket in Supabase Storage with user-scoped isolation.
- **pgvector Vector Database**: Text chunking, 3072-dimensional Gemini embeddings (`gemini-embedding-001`), and cosine similarity search via `match_document_chunks` RPC.
- **RAG Question Answering**: Grounded question answering answering user queries strictly from their own uploaded documents.
- **AI Text Simplification**: Gemini-powered simplification rewriting complex job specifications into plain, accessible language.
- **Enterprise Error Handling & Security**: Defense-in-depth isolation, secret masking, and strict ownership checks.

---

## Directory Structure

```text
prayas-backend/
├── app/
│   ├── api/             # API v1 routes (documents, search, rag, simplify, health)
│   ├── core/            # Configuration, settings, auth dependencies
│   ├── db/              # Supabase client and PostgreSQL/pgvector schema
│   ├── schemas/         # Pydantic request/response validation schemas
│   ├── services/        # Business logic (chunking, embeddings, storage, RAG)
│   └── main.py          # FastAPI application entrypoint
├── tests/               # 220 unit and integration tests (212 hermetic, 8 opt-in live)
├── .env.example         # Example configuration file
├── .gitignore           # Git ignore rules ensuring secrets are never committed
├── README.md            # Backend documentation
└── requirements.txt     # Python dependencies
```

---

## Setup & Installation

1. **Virtual Environment**:
   ```bash
   python -m venv .venv
   # Windows:
   .\.venv\Scripts\activate
   # Linux/macOS:
   source .venv/bin/activate
   ```

2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Fill in your Supabase and Gemini credentials in `.env`.

4. **Database Setup**:
   Execute `app/db/schema.sql` in your Supabase SQL Editor.

---

## Running the Server

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive documentation is available at `http://localhost:8000/docs`.

---

## Running Tests

```bash
python -m unittest discover -s tests -p "test_*.py"
```
