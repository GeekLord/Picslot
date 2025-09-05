-- This file contains all the SQL commands needed to set up the Picslot database schema in Supabase.
-- It is designed to be idempotent, meaning you can run the entire script multiple times without causing errors.

-- Projects table
-- Stores all user-created projects, including their edit history and version snapshots.
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    history JSONB NOT NULL,
    history_index INTEGER NOT NULL,
    thumbnail TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add snapshots column for version history if it doesn't already exist.
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS snapshots JSONB DEFAULT '[]'::jsonb NOT NULL;

-- Enable Row Level Security (RLS) for the projects table.
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Drop the existing policy before creating a new one to ensure updates are applied.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'projects' AND policyname = 'Users can manage their own projects'
    ) THEN
        EXECUTE 'DROP POLICY "Users can manage their own projects" ON public.projects';
    END IF;
END$$;

-- Policy: Users can create, read, update, and delete their own projects.
CREATE POLICY "Users can manage their own projects"
    ON public.projects
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Prompts table
-- Stores user-saved prompts for the Prompt Manager feature.
CREATE TABLE IF NOT EXISTS public.prompts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    prompt TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for the prompts table.
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;

-- Drop existing policy to apply updates.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'prompts' AND policyname = 'Users can manage their own prompts'
    ) THEN
        EXECUTE 'DROP POLICY "Users can manage their own prompts" ON public.prompts';
    END IF;
END$$;

-- Policy: Users can manage their own saved prompts.
CREATE POLICY "Users can manage their own prompts"
    ON public.prompts
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Function for sharing prompts between users.
-- SECURITY DEFINER allows this function to temporarily bypass RLS to find the recipient's user ID.
CREATE OR REPLACE FUNCTION share_prompt_with_user(prompt_id_to_share UUID, recipient_email TEXT)
RETURNS VOID AS $$
DECLARE
    recipient_user_id UUID;
    prompt_to_share RECORD;
BEGIN
    -- Find the recipient's user ID from their email in the private auth schema.
    SELECT id INTO recipient_user_id FROM auth.users WHERE email = recipient_email;
    IF recipient_user_id IS NULL THEN
        RAISE EXCEPTION 'Recipient email not found';
    END IF;
    
    -- Find the prompt to share, ensuring the calling user is the owner.
    SELECT * INTO prompt_to_share FROM public.prompts
        WHERE id = prompt_id_to_share AND user_id = auth.uid();
    IF prompt_to_share IS NULL THEN
        RAISE EXCEPTION 'Prompt not found or you do not have permission to share it';
    END IF;
    
    -- Insert a copy of the prompt for the recipient, marking it as shared.
    INSERT INTO public.prompts (user_id, title, prompt, created_at, updated_at)
    VALUES (recipient_user_id, '(Shared) ' || prompt_to_share.title, prompt_to_share.prompt, NOW(), NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- User profiles table
-- Stores public-facing user information.
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    title TEXT,
    bio TEXT,
    website TEXT,
    profile_image_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for user profiles.
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to apply updates.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname = 'Users can manage their own profile'
    ) THEN
        EXECUTE 'DROP POLICY "Users can manage their own profile" ON public.user_profiles';
    END IF;
END$$;

-- Policy: Users can fully manage their own profile.
CREATE POLICY "Users can manage their own profile"
    ON public.user_profiles
    FOR ALL
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname = 'Users can view public profiles'
    ) THEN
        EXECUTE 'DROP POLICY "Users can view public profiles" ON public.user_profiles';
    END IF;
END$$;

-- Policy: All users (including anonymous) can view public profiles.
CREATE POLICY "Users can view public profiles"
    ON public.user_profiles
    FOR SELECT
    USING (true);

-- Function to automatically create a user profile when a new user signs up.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a new row into user_profiles with the new user's ID and email.
  INSERT INTO public.user_profiles (id, display_name)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the trigger to ensure it's up to date.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
    ) THEN
        EXECUTE 'DROP TRIGGER on_auth_user_created ON auth.users';
    END IF;
END$$;

-- Trigger that calls handle_new_user() after a new user is inserted into auth.users.
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
