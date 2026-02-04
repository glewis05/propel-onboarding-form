# Database Schema

## Overview

The Providence Propel Onboarding Form uses Supabase PostgreSQL for data storage with Row Level Security (RLS) for access control.

## Tables

### onboarding_submissions

Main table storing form submissions (both drafts and completed).

```sql
CREATE TABLE onboarding_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    form_id VARCHAR(100) NOT NULL,
    form_version VARCHAR(20) NOT NULL,
    submission_status VARCHAR(20) NOT NULL DEFAULT 'draft',
    form_data JSONB NOT NULL,
    submitter_email VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Columns:**

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | References authenticated user (for RLS) |
| `form_id` | VARCHAR | Form identifier (e.g., 'providence_propel_onboarding') |
| `form_version` | VARCHAR | Form version at time of submission |
| `submission_status` | VARCHAR | 'draft' or 'submitted' |
| `form_data` | JSONB | Complete form data as JSON |
| `submitter_email` | VARCHAR | Email of submitter (for lookup) |
| `created_at` | TIMESTAMPTZ | When submission was created |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

**Indexes:**

```sql
CREATE INDEX idx_submissions_user_id ON onboarding_submissions(user_id);
CREATE INDEX idx_submissions_email ON onboarding_submissions(submitter_email);
CREATE INDEX idx_submissions_status ON onboarding_submissions(submission_status);
```

### programs

Reference table for available programs (managed by admins).

```sql
CREATE TABLE programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    value VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Row Level Security (RLS) Policies

### User-Scoped Access (Post-Auth Implementation)

```sql
-- Enable RLS
ALTER TABLE onboarding_submissions ENABLE ROW LEVEL SECURITY;

-- Users can insert their own submissions
CREATE POLICY "Users can insert own submissions"
ON onboarding_submissions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can view their own submissions
CREATE POLICY "Users can view own submissions"
ON onboarding_submissions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Users can update their own drafts
CREATE POLICY "Users can update own drafts"
ON onboarding_submissions FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND submission_status = 'draft')
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own drafts
CREATE POLICY "Users can delete own drafts"
ON onboarding_submissions FOR DELETE TO authenticated
USING (auth.uid() = user_id AND submission_status = 'draft');
```

## form_data JSON Structure

The `form_data` JSONB column stores the complete form state:

```json
{
  "program": "program_code",
  "lab_partner": "invitae",
  "test_panel": "TEST001",
  "clinic_name": "Example Clinic",
  "clinic_address": {
    "street": "123 Main St",
    "city": "Seattle",
    "state": "WA",
    "zip": "98101"
  },
  "primary_contact": {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "206-555-1234"
  },
  "ordering_providers": [
    {
      "provider_name": "Dr. Smith",
      "provider_npi": "1234567890",
      "provider_phone": "206-555-5678",
      "provider_address": {...}
    }
  ],
  "selected_genes": ["BRCA1", "BRCA2", "TP53"],
  "_metadata": {
    "lastSaved": "2024-01-15T10:30:00Z",
    "formVersion": "2.0"
  }
}
```

## Migrations

Migration files are stored in `supabase/migrations/`:

| File | Purpose |
|------|---------|
| `001_add_user_id.sql` | Adds user_id column for auth linking |
| `002_secure_rls_policies.sql` | Replaces anon policies with user-scoped |

### Running Migrations

```bash
# Using Supabase CLI
supabase db push

# Or manually via Supabase Dashboard SQL editor
```

## Backup Considerations

- JSONB columns should be included in backups
- Consider point-in-time recovery for production
- Submitted forms should never be deleted (only drafts via cleanup)
