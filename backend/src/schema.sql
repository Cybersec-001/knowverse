CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL UNIQUE, password_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS notebooks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 title text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS videos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), notebook_id uuid NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
 title text NOT NULL, source_type text NOT NULL CHECK(source_type IN ('upload','youtube')),
 source_url text, storage_key text, duration integer, status text NOT NULL DEFAULT 'transcribing' CHECK(status IN ('transcribing','chunking','generating','ready','failed')),
 error text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS transcripts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), video_id uuid NOT NULL UNIQUE REFERENCES videos(id) ON DELETE CASCADE,
 raw_text text NOT NULL, language text NOT NULL DEFAULT 'en');
CREATE TABLE IF NOT EXISTS chunks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
 text text NOT NULL, start_ts numeric NOT NULL, end_ts numeric NOT NULL,
 embedding vector(1536) NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS chunks_video_idx ON chunks(video_id);
CREATE TABLE IF NOT EXISTS artifacts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
 type text NOT NULL CHECK(type IN ('summary','notes','exam_notes','mcq')),
 content jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), regenerated_at timestamptz,
 UNIQUE(video_id,type));
CREATE TABLE IF NOT EXISTS chat_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 role text NOT NULL CHECK(role IN ('user','assistant')), content text NOT NULL,
 cited_chunk_ids uuid[] NOT NULL DEFAULT '{}', general_knowledge boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS chat_video_idx ON chat_messages(video_id,created_at);
CREATE TABLE IF NOT EXISTS user_notes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, text text NOT NULL,
 source_chunk_id uuid REFERENCES chunks(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS user_notes_video_user_idx ON user_notes(video_id,user_id);
CREATE TABLE IF NOT EXISTS summary_edits (
 video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 content text NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(video_id,user_id));
CREATE TABLE IF NOT EXISTS video_uploads (
 storage_key text PRIMARY KEY,
 body bytea NOT NULL,
 mime_type text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now());
