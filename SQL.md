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

-- Add title column if it's missing from an older schema version to prevent errors.
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS title TEXT;

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
-- The WITH CHECK clause is modified to also allow the 'postgres' user (which runs the SECURITY DEFINER trigger) to insert new rows.
CREATE POLICY "Users can manage their own profile"
    ON public.user_profiles
    FOR ALL
    USING (auth.uid() = id)
    WITH CHECK ((auth.uid() = id) OR (current_user = 'postgres'));

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

-- User Assets table
-- Stores user-uploaded images for reuse across the app.
CREATE TABLE IF NOT EXISTS public.user_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    storage_path TEXT NOT NULL,
    filename TEXT NOT NULL,
    asset_type TEXT NOT NULL DEFAULT 'image',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for user_assets.
ALTER TABLE public.user_assets ENABLE ROW LEVEL SECURITY;

-- Drop existing policy to apply updates.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_assets' AND policyname = 'Users can manage their own assets'
    ) THEN
        EXECUTE 'DROP POLICY "Users can manage their own assets" ON public.user_assets';
    END IF;
END$$;

-- Policy: Users can manage their own assets.
CREATE POLICY "Users can manage their own assets"
    ON public.user_assets
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Function to automatically create a user profile when a new user signs up.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a new row into user_profiles with the new user's ID and email.
  INSERT INTO public.user_profiles (id, display_name)
  VALUES (NEW.id, NEW.email);

  -- Seed the new user with a set of default prompts.
  INSERT INTO public.prompts (user_id, title, prompt) VALUES
    (NEW.id, 'Black Suit Portrait, Blue Background', 'Change the figure in the picture to a professional photo with a blue background wearing a black suit and tie, and take a close-up of the upper body facing the camera. Except for the costumes and backgrounds, the characters remain consistent without any changes.'),
    (NEW.id, 'Exact person, front-facing portrait', 'Keep the exact same person with identical facial features, skin texture, hairstyle, clothing, and overall appearance. Rotate the entire body and head so the subject is facing forward directly toward the camera, creating a true front-facing portrait instead of a side view. Preserve the original lighting, background, camera angle, and style so the edit feels seamless and natural.'),
    (NEW.id, 'New Angle, Revealing Depth', 'Move the camera from its current position to a new angle or perspective, revealing fresh details and aspects of the scene that were previously hidden. The shift should feel natural and cinematic, maintaining the existing mood, lighting, and style, while highlighting new layers of the environment, characters, or objects. The change in perspective should create a sense of discovery and depth, drawing the viewer further into the scene.'),
    (NEW.id, 'Portrait Restoration Advanced', 'An ultra-photorealistic, masterfully restored and colorized portrait of a beautiful young female. Her delicate, expressive features are illuminated by soft, diffused natural light, creating a flattering, golden hour glow. The image showcases incredibly fine details: perfect, radiant skin texture free of any imperfections or scratches, intricate hair strands, and sparkling catchlights in her eyes. The color palette is vibrant yet impeccably natural, with authentic skin tones and realistic color grading. Shot on a professional full-frame mirrorless camera with an 85mm f/1.4 prime lens, resulting in a very shallow depth of field, creamy bokeh, and pin-sharp focus on her eyes. The composition is a captivating, centered close-up, emphasizing her natural beauty and youthful serenity against a subtly blurred, complementary natural background. High resolution, hyper-detailed, fine-art quality.'),
    (NEW.id, 'Portrait Restoration Simple', 'Restore and colorize this image of cute young female. Remove any scratches or imperfections. make it super high quality portrait, natural colors.'),
    (NEW.id, 'Remove Watermarks, Restore Image', 'Remove all watermarks and unwanted overlays from the image while preserving the subject, background, and details exactly as they are. Ensure the person’s identity, race, ethnicity, and facial features remain unchanged. Maintain natural lighting, colors, and textures, producing a clean, restored version of the photo with no visible watermark or editing artifacts.'),
    (NEW.id, 'Restore Advance', 'Transform the old, low-resolution mobile photo into a high-quality, photorealistic studio-style portrait while keeping the person''s identity, race, ethnicity, and facial features exactly the same. Remove noise, grain, and pixelation, restoring natural skin tones and textures without distortion. Light the subject with soft, even studio lighting that enhances facial contours while maintaining authenticity. Sharpen facial details, eyes, and hair realistically, avoiding over-editing or artificial smoothing. Preserve the hairstyle, clothing, and jewelry, but render them with clarity and natural color. Replace the low-quality background with a subtle, softly blurred neutral studio backdrop that does not distract from the subject. The result should look like a professional portrait captured with a modern DSLR in perfect lighting conditions.'),
    (NEW.id, 'Restore and make studio portrait', 'Transform the old, low-resolution mobile photo into a high-quality, photorealistic full-body portrait taken in a professional photo studio. Keep the person''s identity, race, ethnicity, and facial features exactly the same. Remove noise, grain, and pixelation, restoring natural skin tones and realistic textures. Dress the subject in modern, elegant clothing suitable for a studio portrait, while keeping the style simple and timeless. Light the subject with soft, balanced studio lighting that enhances natural facial contours and details. Preserve the person''s hairstyle and jewelry, but render them with clarity and sharpness. Place the subject against a neutral, softly blurred professional studio backdrop. The result should look like a contemporary full-body portrait captured with a modern DSLR in perfect lighting conditions.'),
    (NEW.id, 'Restore Simple', 'Restore and enhance an old low-resolution photo taken with a low-end mobile phone camera in poor lighting. Remove heavy noise, grain, and pixelation while keeping the subject''s identity, race, ethnicity, and facial features exactly the same. Improve skin tones to look natural and balanced without over-smoothing. Correct lighting to achieve a clear, well-lit appearance, adjusting contrast and shadows realistically. Sharpen facial details while preserving authenticity. Maintain the original hairstyle, clothing, and background but render them with improved clarity and natural colors. Output should look like a clean, high-quality modern digital photo, not artificially stylized.');
  
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