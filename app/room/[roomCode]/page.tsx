'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Room, Participant } from '@/types'

// Shape stored in localStorage after joining
interface StoredParticipant {
  id: string
  name: string
  roomId: string
  roomCode: string
}

export default function ParticipantRoom() {
  const params = useParams()
  const router = useRouter()
  const roomCode = (params.roomCode as string).toUpperCase()

  const [room, setRoom] = useState<Room | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [myParticipant, setMyParticipant] = useState<StoredParticipant | null>(null)
  const [error, setError] = useState('')

  // Load stored participant identity
  useEffect(() => {
    const stored = localStorage.getItem('icebreak_participant')
    if (!stored) {
      // Not joined — redirect to join with this code
      router.push(`/join?code=${roomCode}`)
      return
    }
    const parsed = JSON.parse(stored)
    if (parsed.roomCode !== roomCode) {
      // Different room — redirect to join
      router.push(`/join?code=${roomCode}`)
      return
    }
    setMyParticipant(parsed)
  }, [roomCode, router])

  const fetchRoom = useCallback(async () => {
    const res = await fetch(`/api/rooms?code=${roomCode}`)
    const data = await res.json()
    if (!res.ok) { setError('Room not found'); return }
    setRoom(data.room)
    return data.room
  }, [roomCode])

  const fetchParticipants = useCallback(async (roomId: string) => {
    const res = await fetch(`/api/participants?roomId=${roomId}`)
    const data = await res.json()
    if (data.participants) setParticipants(data.participants)
  }, [])

  useEffect(() => {
    fetchRoom().then(r => {
      if (r) fetchParticipants(r.id)
    })
  }, [fetchRoom, fetchParticipants])

  useEffect(() => {
    if (!room) return

    // Realtime: new participants joining
    const channel = supabase
      .channel(`room-${room.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ib_participants',
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          setParticipants(prev => {
            if (prev.find(p => p.id === (payload.new as Participant).id)) return prev
            return [...prev, payload.new as Participant]
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ib_rooms',
          filter: `id=eq.${room.id}`,
        },
        (payload) => {
          const updated = payload.new as Room
          setRoom(updated)
          if (updated.status === 'active') {
            // Game started — go to game play view
            router.push(`/room/${roomCode}/play`)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [room, roomCode, router])

  const playerCount = participants.filter(p => !p.is_host).length

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-4">
        <div className="text-5xl mb-4">😕</div>
        <h1 className="text-2xl font-bold mb-2">Room not found</h1>
        <p className="text-white/60 mb-6">{error}</p>
        <a href="/join" className="bg-purple-500 text-white px-6 py-3 rounded-xl font-semibold">Try again</a>
      </div>
    )
  }

  if (!room || !myParticipant) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-black text-white flex flex-col">
      {/* Header */}
      <header className="px-6 py-5 text-center border-b border-white/10">
        <span className="text-2xl">🧊</span>
        <p className="text-white/50 text-xs mt-1 uppercase tracking-widest">Room {roomCode}</p>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center">
        {/* My identity */}
        <div className="mb-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-3xl font-bold mx-auto mb-4 shadow-lg shadow-purple-500/30">
            {myParticipant.name[0]}
          </div>
          <h2 className="text-2xl font-bold">{myParticipant.name}</h2>
          <p className="text-white/50 text-sm mt-1">That's you! 👋</p>
        </div>

        {/* Waiting state */}
        <div className="bg-white/5 border border-white/10 rounded-2xl px-8 py-8 max-w-sm w-full mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            <span className="text-yellow-400 text-sm font-semibold">Waiting for host to start</span>
          </div>

          <p className="text-4xl font-black mb-1">{playerCount}</p>
          <p className="text-white/50 text-sm">{playerCount === 1 ? 'player' : 'players'} in the room</p>

          {/* Animated dots */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        </div>

        {/* Who else is here */}
        {playerCount > 1 && (
          <div className="max-w-sm w-full">
            <p className="text-white/40 text-xs uppercase tracking-widest mb-3">Also in the room</p>
            <div className="flex flex-wrap justify-center gap-2">
              {participants
                .filter(p => !p.is_host && p.id !== myParticipant.id)
                .map(p => (
                  <span
                    key={p.id}
                    className="bg-white/10 border border-white/10 rounded-full px-3 py-1.5 text-sm text-white/80"
                  >
                    {p.display_name}
                  </span>
                ))}
            </div>
          </div>
        )}
      </main>

      {/* Tip footer */}
      <footer className="pb-8 px-6 text-center">
        <p className="text-white/30 text-xs">
          Keep this tab open. The game will begin automatically.
        </p>
      </footer>
    </div>
  )
}
