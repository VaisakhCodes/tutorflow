# Database Planning Document

This document outlines the planned entities, fields, and expected relationships for TutorFlow.

### Profiles
Identity and role information associated with authenticated users.
- `id`: UUID (Primary Key, references Supabase auth.users)
- `email`: String
- `full_name`: String
- `role`: Enum ('tutor', 'student')
- `created_at`: Timestamp
- `updated_at`: Timestamp

### Students
A student belongs to one tutor and contains:
- `id`: UUID (Primary Key)
- `tutor_id`: UUID (Foreign Key referencing Profiles)
- `name`: String
- `subject`: String
- `current_level`: String
- `learning_goals`: Text
- `weak_areas`: Text
- `created_at`: Timestamp
- `updated_at`: Timestamp

### Sessions
A session belongs to a tutor and a student and contains:
- `id`: UUID (Primary Key)
- `tutor_id`: UUID (Foreign Key referencing Profiles)
- `student_id`: UUID (Foreign Key referencing Students)
- `date_time`: Timestamp
- `topic`: String
- `status`: Enum ('Scheduled', 'In progress', 'Completed', 'AI reviewed')
- `notes`: Text
- `created_at`: Timestamp
- `updated_at`: Timestamp

### AI Plans
One AI-generated plan associated with a session.
- `id`: UUID (Primary Key)
- `session_id`: UUID (Foreign Key referencing Sessions, 1:1)
- `plan_content`: Text
- `generated_at`: Timestamp

### AI Reviews
One AI-generated review associated with a completed session.
- `id`: UUID (Primary Key)
- `session_id`: UUID (Foreign Key referencing Sessions, 1:1)
- `review_content`: Text
- `generated_at`: Timestamp

## Expected Relationships
- **Profiles to Students**: One-to-many (A tutor can manage multiple students).
- **Profiles to Sessions**: One-to-many (A tutor manages multiple sessions).
- **Students to Sessions**: One-to-many (A student participates in multiple sessions).
- **Sessions to AI Plans**: One-to-one (A session has up to one AI lesson plan).
- **Sessions to AI Reviews**: One-to-one (A completed session has up to one AI post-session review).

*Note: Database tables, schemas, and migrations are planned here and will be implemented in subsequent steps.*
