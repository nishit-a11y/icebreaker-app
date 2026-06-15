-- ============================================
-- ICEBREAKER APP - SUPABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================

-- ROOMS: Created by host, holds session state
CREATE TABLE ib_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,                    -- e.g. "WOLF-42"
  host_id TEXT NOT NULL,                        -- Supabase user ID
  status TEXT DEFAULT 'waiting'                 -- waiting | active | ended
    CHECK (status IN ('waiting', 'active', 'ended')),
  current_game_id UUID,                         -- FK to ib_game_sessions
  plan TEXT DEFAULT 'free'                      -- free | team | pro
    CHECK (plan IN ('free', 'team', 'pro')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- PARTICIPANTS: Anonymous players in a room
CREATE TABLE ib_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES ib_rooms(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,                   -- "Purple Falcon"
  uuid_token TEXT NOT NULL,                     -- localStorage UUID
  is_host BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT now()
);

-- GAME_SESSIONS: Each time a game runs in a room
CREATE TABLE ib_game_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES ib_rooms(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL,                        -- "two-truths", "would-you-rather" etc
  engine TEXT NOT NULL,                         -- "submit-reveal" | "vote" | "round-robin" | "timed"
  phase TEXT DEFAULT 'submitting'               -- submitting | voting | reveal | ended
    CHECK (phase IN ('submitting', 'waiting', 'voting', 'reveal', 'ended')),
  current_subject_id UUID,                      -- For round-robin: whose turn
  round_number INTEGER DEFAULT 1,
  config JSONB DEFAULT '{}',                    -- game-specific config
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ
);

-- SUBMISSIONS: Every answer submitted by every participant
CREATE TABLE ib_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_session_id UUID REFERENCES ib_game_sessions(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES ib_participants(id) ON DELETE CASCADE,
  content JSONB NOT NULL,                       -- flexible: {text, fields, gif_url, etc}
  votes JSONB DEFAULT '[]',                     -- array of participant_ids who voted for this
  round_number INTEGER DEFAULT 1,
  is_lie BOOLEAN,                               -- for Two Truths & One Lie
  submitted_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_ib_rooms_code ON ib_rooms(code);
CREATE INDEX idx_ib_rooms_host ON ib_rooms(host_id);
CREATE INDEX idx_ib_participants_room ON ib_participants(room_id);
CREATE INDEX idx_ib_participants_token ON ib_participants(uuid_token);
CREATE INDEX idx_ib_game_sessions_room ON ib_game_sessions(room_id);
CREATE INDEX idx_ib_submissions_session ON ib_submissions(game_session_id);
CREATE INDEX idx_ib_submissions_participant ON ib_submissions(participant_id);

-- ============================================
-- REALTIME: Enable for live sync
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE ib_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE ib_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE ib_game_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE ib_submissions;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE ib_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE ib_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE ib_game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ib_submissions ENABLE ROW LEVEL SECURITY;

-- Rooms: anyone can read, only host can write
CREATE POLICY "ib_rooms_read" ON ib_rooms FOR SELECT USING (true);
CREATE POLICY "ib_rooms_insert" ON ib_rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "ib_rooms_update" ON ib_rooms FOR UPDATE USING (true);

-- Participants: anyone can read/insert
CREATE POLICY "ib_participants_read" ON ib_participants FOR SELECT USING (true);
CREATE POLICY "ib_participants_insert" ON ib_participants FOR INSERT WITH CHECK (true);
CREATE POLICY "ib_participants_update" ON ib_participants FOR UPDATE USING (true);

-- Game sessions: anyone in room can read
CREATE POLICY "ib_game_sessions_read" ON ib_game_sessions FOR SELECT USING (true);
CREATE POLICY "ib_game_sessions_insert" ON ib_game_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "ib_game_sessions_update" ON ib_game_sessions FOR UPDATE USING (true);

-- Submissions: anyone can read/insert
CREATE POLICY "ib_submissions_read" ON ib_submissions FOR SELECT USING (true);
CREATE POLICY "ib_submissions_insert" ON ib_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "ib_submissions_update" ON ib_submissions FOR UPDATE USING (true);

-- ============================================
-- HELPER FUNCTION: Generate room code
-- ============================================
CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS TEXT AS $$
DECLARE
  adjectives TEXT[] := ARRAY['WOLF','BEAR','LION','HAWK','JADE','NOVA','BOLT','ECHO','FLUX','GLOW'];
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    code := adjectives[1 + floor(random() * array_length(adjectives, 1))::int]
            || '-' || lpad((floor(random() * 90) + 10)::text, 2, '0');
    SELECT EXISTS(SELECT 1 FROM ib_rooms WHERE ib_rooms.code = code) INTO exists;
    EXIT WHEN NOT exists;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;
