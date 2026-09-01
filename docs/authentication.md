# TutorFlow Authentication & Access Control

## Overview
TutorFlow uses **Supabase Auth** with email and password authentication, configured for Next.js App Router using `@supabase/ssr` and cookie-based sessions.

## Core Concepts

### 1. Session Refresh via Next.js Proxy
- Session cookies are refreshed automatically on incoming requests using the Next.js Proxy pattern implemented in `src/proxy.ts`.
- No deprecated client-side token storage in `localStorage` is used.

### 2. Role Model
TutorFlow supports exactly two application roles:
- `tutor`
- `student`

Role persistence relies on a minimal `profiles` database table schema:
- `id`: UUID (Primary Key, referencing `auth.users.id`)
- `role`: Enum / String (`'tutor'` | `'student'`)
- `created_at`: Timestamp

### 3. Server-Side Authorization (`getClaims()`)
- Authorization decisions rely on `supabase.auth.getClaims()` to verify JWT authenticity server-side.
- The user's role is resolved from the server-managed `profiles` table.
- `getSession()` is explicitly excluded from authorization decisions to prevent trusting unverified client session data.
- Client-side variables, email naming heuristics, or untrusted metadata are never used for authorization decisions.

### 4. Protected Route Behavior
- `/tutor`: Accessible only to authenticated users with the `tutor` role. Unauthenticated visitors are redirected to `/login`. Authenticated students are redirected to `/student`.
- `/student`: Accessible only to authenticated users with the `student` role. Unauthenticated visitors are redirected to `/login`. Authenticated tutors are redirected to `/tutor`.
- `/login`: Form for signing in. Authenticated users visiting `/login` are automatically redirected to their designated role area (`/tutor` or `/student`).

### 5. Account Provisioning & Database Migration
- There is no public registration route (`/signup`).
- The database migration for Step 2 is located at `supabase/migrations/0001_create_profiles.sql`.
- Accounts are created via Supabase Auth Admin API or Dashboard, and their role is assigned in the `public.profiles` table:
  ```sql
  INSERT INTO public.profiles (id, role) VALUES ('<USER_UUID>', 'tutor');
  INSERT INTO public.profiles (id, role) VALUES ('<USER_UUID>', 'student');
  ```

