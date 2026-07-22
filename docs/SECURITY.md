# Termly Security Model & RLS

Termly is built with a "Security First" philosophy, ensuring that school data is strictly isolated and platform-level operations are highly guarded.

## 1. Authentication

- **Provider**: Supabase Auth (GoTrue).
- **Identity**: Users are identified by their email. Each login session is protected by standard JWT tokens.
- **Passwords**: Encrypted using `bcrypt` (handled by Supabase).
- **Verification**: New schools must verify their email before gaining full platform access.

## 2. Row-Level Security (RLS)

The most critical layer of defense. RLS ensures that even if a user manages to authenticate, they can **only** see data belonging to their specific school.

### Core Policies
- **Data Isolation**: Every table (`students`, `teachers`, `marks`, `payments`) has an `auth.uid()` check linked to the user's `school_id`.
- **Global Visibility**: Platform admins (verified against a hardcoded list) have global `SELECT` access across the entire database to enable monitoring and support.

### `SECURITY DEFINER` Functions
To prevent recursion errors (where a policy tries to query a table that has a policy), we use specialized logic:
- `is_platform_admin()`: A high-performance check for administrative emails.
- `is_school_admin()`: Verifies if the current user has the `admin` role for their school.

## 3. Administrative Authorization

Critical operations (e.g., activating a school, deleting records) are protected by:
1.  **UI Gating**: Components like `<SuperAdmin />` are only rendered for platform admin emails.
2.  **RPC Protection**: Database-level functions like `platform_reset_password` verify the caller's identity before executing.

## 4. Encryption & Privacy

- **In-Transit**: All traffic is encrypted using TLS/SSL.
- **At-Rest**: Postgres data is encrypted at rest (Supabase standard).
- **Data Privacy**: No school data is shared between tenants. The database is logically partitioned by `school_id`.

## 5. Security Best Practices for Developers

- **Never** call Supabase directly from the UI; use the abstracted `store.js` layer.
- **Always** include a `school_id` in every mutation (INSERT/UPDATE).
- **Review** RLS policies after any schema change using the scripts in the `supabase/` folder.
