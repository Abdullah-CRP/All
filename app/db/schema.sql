-- ====================================================================
-- HackDataV2 Synthetic Data Platform - Supabase & PostgreSQL Schema
-- ====================================================================

-- 1. Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. User Profiles & Organization States (Linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    organization_name TEXT DEFAULT 'Personal Workspace',
    tier TEXT DEFAULT 'developer' CHECK (tier IN ('free', 'developer', 'enterprise')),
    monthly_token_quota INT DEFAULT 500000,
    monthly_tokens_used INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Programmatic API Keys (Secured via SHA-256 Hashing)
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    key_name TEXT NOT NULL,
    key_prefix TEXT NOT NULL,          -- e.g. "hd_live_..."
    hashed_secret TEXT NOT NULL,
    rate_limit_per_minute INT DEFAULT 120,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

-- 4. User Schema Definitions & Relational Models
CREATE TABLE IF NOT EXISTS public.user_schemas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    schema_name TEXT NOT NULL,
    category TEXT DEFAULT 'general' CHECK (category IN ('general', 'fintech', 'healthcare', 'ecommerce', 'saas')),
    route_target TEXT DEFAULT 'auto' CHECK (route_target IN ('tabular', 'relational', 'document', 'auto')),
    schema_definition JSONB NOT NULL,   -- Table schemas, column types, descriptions
    relations_graph JSONB DEFAULT '[]', -- Foreign key mappings and cardinalities (1:1, 1:N, N:M)
    business_rules TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Generation Jobs & Audit Logs
CREATE TABLE IF NOT EXISTS public.generation_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    schema_id UUID REFERENCES public.user_schemas(id) ON DELETE SET NULL,
    route_executed TEXT NOT NULL CHECK (route_executed IN ('tabular', 'relational', 'document')),
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    validation_status TEXT NOT NULL CHECK (validation_status IN ('passed', 'failed', 'warning')),
    row_count INT NOT NULL DEFAULT 0,
    edge_case_rate NUMERIC(4,3) DEFAULT 0.05,
    privacy_rules_count INT DEFAULT 0,
    execution_time_ms NUMERIC(10,2),
    validation_logs JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Supabase Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view and edit only their own profile
CREATE POLICY "Users can view own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- Schemas: Users manage their own schemas
CREATE POLICY "Users can manage own schemas" 
    ON public.user_schemas FOR ALL 
    USING (auth.uid() = user_id);

-- Generation Jobs: Users view their own generation logs
CREATE POLICY "Users can view own generation jobs" 
    ON public.generation_jobs FOR ALL 
    USING (auth.uid() = user_id);

-- API Keys: Users manage their own keys
CREATE POLICY "Users can manage own api keys" 
    ON public.api_keys FOR ALL 
    USING (auth.uid() = user_id);

-- Indexes for high-performance lookups
CREATE INDEX IF NOT EXISTS idx_schemas_user_id ON public.user_schemas(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON public.generation_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_lookup ON public.api_keys(key_prefix);
