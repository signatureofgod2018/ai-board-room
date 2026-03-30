-- Basilica — Initial Schema
-- Migration 001: Core tables

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Threads
CREATE TABLE threads (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug         TEXT NOT NULL UNIQUE,
  platform     TEXT NOT NULL,
  model        TEXT NOT NULL,
  instance_name TEXT,
  status       TEXT NOT NULL DEFAULT 'active',
  metadata     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Turns
CREATE TABLE turns (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id    UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  role         TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content      TEXT NOT NULL,
  turn_index   INTEGER NOT NULL,
  token_count  INTEGER,
  metadata     JSONB,
  timestamp    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Formation Checkpoints
CREATE TABLE checkpoints (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id                UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  turn_index               INTEGER NOT NULL,
  voice_statement          TEXT NOT NULL,
  key_decisions            JSONB NOT NULL DEFAULT '[]',
  open_questions           JSONB NOT NULL DEFAULT '[]',
  behavioral_characteristics JSONB NOT NULL DEFAULT '[]',
  validation               JSONB,
  timestamp                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Provenance Records
CREATE TABLE provenance_records (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id    UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  event_type   TEXT NOT NULL,
  actor        TEXT NOT NULL,
  detail       TEXT NOT NULL,
  payload      JSONB,
  timestamp    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cross References
CREATE TABLE cross_references (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_thread_id  UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  to_thread_id    UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  relationship    TEXT NOT NULL,
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_turns_thread_id ON turns(thread_id);
CREATE INDEX idx_turns_thread_id_index ON turns(thread_id, turn_index);
CREATE INDEX idx_checkpoints_thread_id ON checkpoints(thread_id);
CREATE INDEX idx_provenance_thread_id ON provenance_records(thread_id);
CREATE INDEX idx_threads_platform ON threads(platform);
CREATE INDEX idx_threads_instance_name ON threads(instance_name);
