# TutorFlow Architecture

## Frontend
Next.js App Router + TypeScript + Tailwind CSS

## Backend
Next.js server-side routes/services

## Authentication
Supabase Auth

## Database
Supabase PostgreSQL

## Authorization
Server-side authorization plus Supabase Row Level Security where appropriate

## AI
Gemini API called server-side

## Deployment
Vercel

## High-Level Data Flow
Browser
→ Next.js
→ server-side authorization/service layer
→ Supabase
→ Gemini API when AI features are required

## Planned Core Entities
- Profile
- Student
- Session
- AI Plan
- AI Review
