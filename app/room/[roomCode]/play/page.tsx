'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import GameRouter from '@/components/games/GameRouter'
import type { Room } from '@/types'

// Shape stored in localStorage after joining
interface StoredParticipant {
  id: string
  name: string
  roomId: string
  roomCode: string
}

export default function ParticipantPlay() {
  const params = useParams()
  const router = useRouter()
  const roomCode = (params.roomCode as string).toUpperCase()

  const [room, setRoom] = useState<Room | null>(null)
  const [participant, setParticipant] = useState<StoredParticipant | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('icebreak_participant')
    if (!stored) { router.push(`/join?code=${roomCode}`); return }

    const parsed = JSON.parse(stored)
    setParticipant(parsed)

    // Fetch room
    fetch(`/api/rooms?code=${roomCode}`)
      .then(r => r.json())
      .then(data => {
        if (data.room) setRoom(data.room)
        else setError('Room not found')
      })
  }, [roomCode, router])

  useEffect(() => {
    if (!room) return
    // Watch for room ending
    const ch = supabase
      .channel(`play-room-${room.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ib_rooms', filter: `id=eq.${room.id}` }, (payload) => {
        const updated = payload.new as Room
        if (updated.status === 'waiting') router.push(`/room/${roomCode}`)
        if (updated.status === 'ended') router.push(`/join`)
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [room, roomCode, router])

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60">{error}</p>
          <a href="/join" className="mt-4 inline-block bg-purple-500 text-white px-6 py-3 rounded-xl">Back to join</a>
        </div>
      </div>
    )
  }

  if (!room || !participant || !room.current_game_id) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-black text-white">
      {/* Minimal header */}
      <header className="border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <a href="/" className="text-lg hover:opacity-80 transition-opacity">🧊</a>
        <span className="text-white/40 text-xs font-mono">{roomCode}</span>
        <div className="flex items-center gap-3">
          <span className="text-white/40 text-xs">{participant.name}</span>
          <button
            onClick={() => {
              if (!confirm('Leave the game?')) return
              localStorage.removeItem('icebreak_participant')
              window.location.href = '/join'
            }}
            className="text-white/20 hover:text-white/60 text-xs transition-colors cursor-pointer"
          >
            Leave
          </button>
        </div>
      </header>

      <GameRouter
        gameSessionId={room.current_game_id}
        participant={{
          id: participant.id,
          room_id: room.id,
          display_name: participant.name,
          uuid_token: '',
          is_host: false,
          joined_at: '',
        }}
        isHost={false}
        roomId={room.id}
      />
    </div>
  )
}
