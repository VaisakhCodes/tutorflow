-- ============================================================
-- TutorFlow - Core Database Schema
-- Migration: 0002_create_core_tables.sql
-- ============================================================

-- ------------------------------------------------------------
-- Students
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  profile_id UUID NOT NULL UNIQUE
    REFERENCES public.profiles(id)
    ON DELETE CASCADE,

  tutor_id UUID NOT NULL
    REFERENCES public.profiles(id)
    ON DELETE CASCADE,

  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  current_level TEXT NOT NULL,
  learning_goals TEXT NOT NULL,
  weak_areas TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT students_profile_is_student
    CHECK (
      profile_id <> tutor_id
    )
);


-- ------------------------------------------------------------
-- Sessions
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  tutor_id UUID NOT NULL
    REFERENCES public.profiles(id)
    ON DELETE CASCADE,

  student_id UUID NOT NULL
    REFERENCES public.students(id)
    ON DELETE CASCADE,

  scheduled_at TIMESTAMPTZ NOT NULL,
  topic TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (
      status IN (
        'scheduled',
        'in_progress',
        'completed',
        'ai_reviewed'
      )
    ),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT sessions_tutor_student_unique_time
    UNIQUE (tutor_id, scheduled_at)
);


CREATE INDEX IF NOT EXISTS sessions_tutor_id_idx
  ON public.sessions(tutor_id);

CREATE INDEX IF NOT EXISTS sessions_student_id_idx
  ON public.sessions(student_id);

CREATE INDEX IF NOT EXISTS sessions_scheduled_at_idx
  ON public.sessions(scheduled_at);


-- ------------------------------------------------------------
-- Session Notes
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.session_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  session_id UUID NOT NULL UNIQUE
    REFERENCES public.sessions(id)
    ON DELETE CASCADE,

  notes TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE INDEX IF NOT EXISTS session_notes_session_id_idx
  ON public.session_notes(session_id);


-- ------------------------------------------------------------
-- AI Session Plans
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ai_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  session_id UUID NOT NULL UNIQUE
    REFERENCES public.sessions(id)
    ON DELETE CASCADE,

  objectives JSONB NOT NULL DEFAULT '[]'::jsonb,
  lesson_outline JSONB NOT NULL DEFAULT '[]'::jsonb,
  practice_questions JSONB NOT NULL DEFAULT '[]'::jsonb,

  raw_response JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE INDEX IF NOT EXISTS ai_plans_session_id_idx
  ON public.ai_plans(session_id);


-- ------------------------------------------------------------
-- AI Session Reviews
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ai_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  session_id UUID NOT NULL UNIQUE
    REFERENCES public.sessions(id)
    ON DELETE CASCADE,

  summary TEXT NOT NULL,
  next_session_suggestion TEXT NOT NULL,

  raw_response JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE INDEX IF NOT EXISTS ai_reviews_session_id_idx
  ON public.ai_reviews(session_id);


-- ------------------------------------------------------------
-- Homework
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.homework (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  student_id UUID NOT NULL
    REFERENCES public.students(id)
    ON DELETE CASCADE,

  session_id UUID NOT NULL
    REFERENCES public.sessions(id)
    ON DELETE CASCADE,

  task TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE INDEX IF NOT EXISTS homework_student_id_idx
  ON public.homework(student_id);

CREATE INDEX IF NOT EXISTS homework_session_id_idx
  ON public.homework(session_id);


-- ============================================================
-- Session lifecycle protection
-- ============================================================

CREATE OR REPLACE FUNCTION public.enforce_session_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- A session cannot change its status backwards or skip a state.
  IF OLD.status = 'scheduled'
     AND NEW.status NOT IN ('scheduled', 'in_progress') THEN
    RAISE EXCEPTION
      'Invalid session transition: scheduled can only move to in_progress';
  END IF;

  IF OLD.status = 'in_progress'
     AND NEW.status NOT IN ('in_progress', 'completed') THEN
    RAISE EXCEPTION
      'Invalid session transition: in_progress can only move to completed';
  END IF;

  IF OLD.status = 'completed'
     AND NEW.status NOT IN ('completed', 'ai_reviewed') THEN
    RAISE EXCEPTION
      'Invalid session transition: completed can only move to ai_reviewed';
  END IF;

  IF OLD.status = 'ai_reviewed'
     AND NEW.status <> 'ai_reviewed' THEN
    RAISE EXCEPTION
      'Invalid session transition: ai_reviewed is terminal';
  END IF;

  -- Once completed, only the status may change to ai_reviewed.
  IF OLD.status = 'completed'
     AND NEW.status = 'ai_reviewed'
     AND (
       NEW.tutor_id <> OLD.tutor_id
       OR NEW.student_id <> OLD.student_id
       OR NEW.scheduled_at <> OLD.scheduled_at
       OR NEW.topic <> OLD.topic
     ) THEN
    RAISE EXCEPTION
      'Completed sessions cannot be edited except for AI review';
  END IF;

  -- Once AI reviewed, no fields can be changed.
  IF OLD.status = 'ai_reviewed'
     AND (
       NEW.tutor_id <> OLD.tutor_id
       OR NEW.student_id <> OLD.student_id
       OR NEW.scheduled_at <> OLD.scheduled_at
       OR NEW.topic <> OLD.topic
       OR NEW.status <> OLD.status
     ) THEN
    RAISE EXCEPTION
      'AI reviewed sessions cannot be edited';
  END IF;

  RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS enforce_session_status_transition
  ON public.sessions;

CREATE TRIGGER enforce_session_status_transition
BEFORE UPDATE ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.enforce_session_status_transition();


-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;


-- ------------------------------------------------------------
-- Students policies
-- ------------------------------------------------------------

CREATE POLICY "Tutors can view their students"
ON public.students
FOR SELECT
TO authenticated
USING (tutor_id = auth.uid());


CREATE POLICY "Students can view their own profile"
ON public.students
FOR SELECT
TO authenticated
USING (profile_id = auth.uid());


CREATE POLICY "Tutors can create their students"
ON public.students
FOR INSERT
TO authenticated
WITH CHECK (tutor_id = auth.uid());


CREATE POLICY "Tutors can update their students"
ON public.students
FOR UPDATE
TO authenticated
USING (tutor_id = auth.uid())
WITH CHECK (tutor_id = auth.uid());


-- ------------------------------------------------------------
-- Sessions policies
-- ------------------------------------------------------------

CREATE POLICY "Tutors can view their sessions"
ON public.sessions
FOR SELECT
TO authenticated
USING (tutor_id = auth.uid());


CREATE POLICY "Students can view their sessions"
ON public.sessions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.students
    WHERE students.id = sessions.student_id
      AND students.profile_id = auth.uid()
  )
);


CREATE POLICY "Tutors can create sessions"
ON public.sessions
FOR INSERT
TO authenticated
WITH CHECK (tutor_id = auth.uid());


CREATE POLICY "Tutors can update their sessions"
ON public.sessions
FOR UPDATE
TO authenticated
USING (tutor_id = auth.uid())
WITH CHECK (tutor_id = auth.uid());


-- ------------------------------------------------------------
-- Session notes policies
-- ------------------------------------------------------------

CREATE POLICY "Tutors can view session notes"
ON public.session_notes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.sessions
    WHERE sessions.id = session_notes.session_id
      AND sessions.tutor_id = auth.uid()
  )
);


CREATE POLICY "Tutors can create session notes"
ON public.session_notes
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.sessions
    WHERE sessions.id = session_notes.session_id
      AND sessions.tutor_id = auth.uid()
  )
);


CREATE POLICY "Tutors can update session notes"
ON public.session_notes
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.sessions
    WHERE sessions.id = session_notes.session_id
      AND sessions.tutor_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.sessions
    WHERE sessions.id = session_notes.session_id
      AND sessions.tutor_id = auth.uid()
  )
);


-- ------------------------------------------------------------
-- AI plans policies
-- ------------------------------------------------------------

CREATE POLICY "Tutors can view AI plans"
ON public.ai_plans
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.sessions
    WHERE sessions.id = ai_plans.session_id
      AND sessions.tutor_id = auth.uid()
  )
);


CREATE POLICY "Tutors can create AI plans"
ON public.ai_plans
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.sessions
    WHERE sessions.id = ai_plans.session_id
      AND sessions.tutor_id = auth.uid()
  )
);


-- ------------------------------------------------------------
-- AI reviews policies
-- ------------------------------------------------------------

CREATE POLICY "Tutors can view AI reviews"
ON public.ai_reviews
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.sessions
    WHERE sessions.id = ai_reviews.session_id
      AND sessions.tutor_id = auth.uid()
  )
);


CREATE POLICY "Tutors can create AI reviews"
ON public.ai_reviews
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.sessions
    WHERE sessions.id = ai_reviews.session_id
      AND sessions.tutor_id = auth.uid()
  )
);


-- ------------------------------------------------------------
-- Homework policies
-- ------------------------------------------------------------

CREATE POLICY "Students can view their homework"
ON public.homework
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.students
    WHERE students.id = homework.student_id
      AND students.profile_id = auth.uid()
  )
);


CREATE POLICY "Tutors can view their students homework"
ON public.homework
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.students
    WHERE students.id = homework.student_id
      AND students.tutor_id = auth.uid()
  )
);


CREATE POLICY "Tutors can create homework"
ON public.homework
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.students
    WHERE students.id = homework.student_id
      AND students.tutor_id = auth.uid()
  )
);


CREATE POLICY "Students can update their homework"
ON public.homework
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.students
    WHERE students.id = homework.student_id
      AND students.profile_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.students
    WHERE students.id = homework.student_id
      AND students.profile_id = auth.uid()
  )
);