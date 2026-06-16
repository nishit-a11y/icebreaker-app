'use client'

/**
 * GameRouter — picks the right engine based on the game session's engine field
 * This is the single entry point for any active game.
 */

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getGame } from '@/lib/games'
import type { GameSession, Participant } from '@/types'
import SubmitRevealEngine from './SubmitRevealEngine'
import VoteEngine from './VoteEngine'
import RoundRobinEngine from './RoundRobinEngine'
import TimedEngine from './TimedEngine'

interface Props {
  gameSessionId: string
  participant: Participant
  isHost: boolean
  roomId: string
}

export default function GameRouter({ gameSessionId, participant, isHost, roomId }: Props) {
  const [session, setSession] = useState<GameSession | null>(null)
  const [allParticipants, setAllParticipants] = useState<Participant[]>([])

  useEffect(() => {
    // Load session
    supabase.from('ib_game_sessions').select('*').eq('id', gameSessionId).single()
      .then(({ data }) => { if (data) setSession(data) })

    // Load participants for round-robin ordering
    supabase.from('ib_participants').select('*').eq('room_id', roomId).order('joined_at')
      .then(({ data }) => { if (data) setAllParticipants(data) })

    // Live session updates (phase changes, round advances)
    const channel = supabase
      .channel(`session-${gameSessionId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'ib_game_sessions',
        filter: `id=eq.${gameSessionId}`,
      }, (payload) => {
        setSession(payload.new as GameSession)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [gameSessionId, roomId])

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const game = getGame(session.game_id)
  if (!game) {
    return <div className="text-center text-white/60 py-20">Unknown game: {session.game_id}</div>
  }

  const commonProps = { session, game, participant, isHost, roomId }

  if (session.engine === 'submit-reveal') {
    return <SubmitRevealEngine {...commonProps} />
  }

  if (session.engine === 'vote') {
    return <VoteEngine {...commonProps} />
  }

  if (session.engine === 'round-robin') {
    return <RoundRobinEngine {...commonProps} participants={allParticipants} />
  }

  if (session.engine === 'timed') {
    return <TimedEngine {...commonProps} participants={allParticipants} />
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-8 text-center">
      <div className="text-5xl mb-4">{game.emoji}</div>
      <h2 className="text-2xl font-bold text-white mb-2">{game.name}</h2>
      <p className="text-white/60">{game.description}</p>
    </div>
  )
}
