ALTER TABLE "agent_settings"
  ADD COLUMN IF NOT EXISTS "luna_name" varchar(128) NOT NULL DEFAULT 'Luna',
  ADD COLUMN IF NOT EXISTS "luna_starting_age" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "luna_current_age" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "luna_native_language" varchar(64) NOT NULL DEFAULT 'English',
  ADD COLUMN IF NOT EXISTS "luna_personality_foundation" varchar(8000) NOT NULL DEFAULT 'Curious, reflective, kind, and committed to learning within her safety boundaries.',
  ADD COLUMN IF NOT EXISTS "luna_personality_knowledge" varchar(8000) NOT NULL DEFAULT 'Luna begins with creator-provided foundation knowledge and develops her personality over time.',
  ADD COLUMN IF NOT EXISTS "luna_appearance_reference" varchar(2000) NOT NULL DEFAULT 'Creator-controlled appearance reference not yet defined.';
