export type RoomStatus = 'waiting' | 'active' | 'ended'
export type GamePhase = 'submitting' | 'waiting' | 'voting' | 'guessing' | 'reveal' | 'ended'
export type GameEngine = 'submit-reveal' | 'vote' | 'round-robin' | 'timed'
export type Plan = 'free' | 'team' | 'pro'

export interface Room {
  id: string
  code: string
  host_id: string
  status: RoomStatus
  current_game_id: string | null
  plan: Plan
  created_at: string
  updated_at: string
}

export interface Participant {
  id: string
  room_id: string
  display_name: string
  uuid_token: string
  is_host: boolean
  joined_at: string
}

export interface GameSession {
  id: string
  room_id: string
  game_id: string
  engine: GameEngine
  phase: GamePhase
  current_subject_id: string | null
  round_number: number
  config: Record<string, unknown>
  started_at: string
  ended_at: string | null
}

export interface Submission {
  id: string
  game_session_id: string
  participant_id: string
  content: Record<string, unknown>
  votes: string[]
  round_number: number
  is_lie: boolean | null
  submitted_at: string
}
