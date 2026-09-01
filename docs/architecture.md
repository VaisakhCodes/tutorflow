# TutorFlow Architecture

## Frontend
Next.js App Router + TypeScript + Tailwind CSS

## Backend
Next.js server-side routes/services

## Authentication
Supabase Auth (Email/Password) with cookie-based SSR via `@supabase/ssr` and Next.js Proxy (`src/proxy.ts`)

## Database
Supabase PostgreSQL (Minimal `profiles` table role model: `id`, `role`, `created_at`)

## Authorization
Server-side JWT claim verification (`supabase.auth.getClaims()`) coupled with authoritative database role checks (`profiles.role`) plus Supabase Row Level Security where appropriate

## AI
Gemini API called server-side

## Deployment
Vercel

## High-Level Data Flow
Browser
→ Next.js Proxy (Session refresh)
→ Next.js Server Components / Actions (`getClaims()` & `profiles.role` check)
→ Supabase PostgreSQL
→ Gemini API when AI features are required

## Planned Core Entities
- Profile (Minimal `id`, `role`, `created_at` implemented for Step 2 auth)
- Student
- Session
- AI Plan
- AI Review
