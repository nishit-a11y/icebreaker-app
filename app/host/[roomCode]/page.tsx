'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { getGame } from '@/lib/games'
import type { Participant, Room } from '@/types'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      className="text-sm bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
    >
      {copied ? '✓ Copied!' : '📋 Copy'}
    </button>
  )
}

export default function HostLobby() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const roomCode = (params.roomCode as string).toUpperCase()
  const gameId = searchParams.get('game') || ''

  const [room, setRoom] = useState<Room | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')

  const game = getGame(gameId)
  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/join?code=${roomCode}` : ''

  // Fetch room on mount
  const fetchRoom = useCallback(async () => {
    const res = await fetch(`/api/rooms?code=${roomCode}`)
    const data = await res.json()
    if (data.room) setRoom(data.room)
  }, [roomCode])

  // Fetch existing participants
  const fetchParticipants = useCallback(async (roomId: string) => {
    const res = await fetch(`/api/participants?roomId=${roomId}`)
    const data = await res.json()
    if (data.participants) setParticipants(data.participants)
  }, [])

  useEffect(() => {
    fetchRoom()
  }, [fetchRoom])

  useEffect(() => {
    if (!room) return
    fetchParticipants(room.id)

    // Realtime subscription: listen for new participants
    const channel = supabase
      .channel(`lobby-${room.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ib_participants',
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          setParticipants(prev => [...prev, payload.new as Participant])
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
          // If game started, redirect host to game view
          if (updated.status === 'active' && updated.current_game_id) {
            router.push(`/host/${roomCode}/game`)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [room, roomCode, router, fetchParticipants])

  async function startGame() {
    if (!room || !game || !user) return
    if (participants.filter(p => !p.is_host).length < game.minPlayers) {
      setError(`Need at least ${game.minPlayers} players to start`)
      return
    }
    setStarting(true)
    setError('')

    try {
      const res = await fetch('/api/games/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room.id, gameId, hostId: user.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      // Realtime will redirect when room status updates
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start game')
      setStarting(false)
    }
  }

  const playerCount = participants.filter(p => !p.is_host).length

  if (!room) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/host" className="text-white/50 hover:text-white transition-colors text-sm cursor-pointer">
              ← Back
            </Link>
            <Link href="/host" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <span className="text-2xl">🧊</span>
              <span className="font-bold">IceBreak</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-white/50 text-sm">HOST VIEW</div>
            <button
              onClick={async () => { await supabase.auth.signOut(); window.location.href = '/' }}
              className="text-white/40 hover:text-white/80 text-sm transition-colors cursor-pointer"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 w-full flex-1 flex flex-col">
        {/* Game info + room code */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Selected game */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <p className="text-white/40 text-xs uppercase tracking-widest mb-2">Game selected</p>
            {game ? (
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-4xl">{game.emoji}</span>
                  <div>
                    <div className="font-bold text-xl">{game.name}</div>
                    <div className="text-white/50 text-sm">{game.engine} engine · ~{game.durationMinutes} min</div>
                  </div>
                </div>
                <p className="text-white/60 text-sm">{game.description}</p>
              </div>
            ) : (
              <p className="text-white/40">No game selected</p>
            )}
          </div>

          {/* Room code */}
          <div className="bg-gradient-to-br from-purple-600/30 to-indigo-600/30 border border-purple-500/30 rounded-2xl p-6">
            <p className="text-white/60 text-xs uppercase tracking-widest mb-3">Share this code</p>
            <div className="font-mono font-black text-5xl tracking-widest text-white mb-4">{roomCode}</div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-white/40 text-xs flex-1 truncate">{joinUrl}</span>
                <CopyButton text={joinUrl} />
              </div>
            </div>
            <p className="text-white/40 text-xs mt-3">Players go to this URL and enter the code</p>
          </div>
        </div>

        {/* Participant lobby */}
        <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-bold text-xl">Waiting room</h2>
              <p className="text-white/50 text-sm mt-0.5">
                {playerCount} {playerCount === 1 ? 'player' : 'players'} joined
                {game && ` · need ${game.minPlayers}+ to start`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${playerCount > 0 ? 'bg-green-400' : 'bg-yellow-400'}`} />
              <span className="text-white/40 text-xs">Live</span>
            </div>
          </div>

          {participants.filter(p => !p.is_host).length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">👀</div>
              <p className="text-white/40">Waiting for players to join...</p>
              <p className="text-white/30 text-sm mt-1">Share the room code above</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {participants.filter(p => !p.is_host).map((p, i) => (
                <div
                  key={p.id}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {p.display_name[0]}
                  </div>
                  <span className="text-sm font-medium truncate">{p.display_name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Start game */}
        <div className="mt-6">
          {error && <p className="text-red-400 text-sm text-center mb-3">{error}</p>}
          <button
            onClick={startGame}
            disabled={starting || playerCount < (game?.minPlayers || 2)}
            className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl text-lg transition-all hover:shadow-lg hover:shadow-purple-500/20 flex items-center justify-center gap-2"
          >
            {starting ? (
              <>
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Starting game...
              </>
            ) : playerCount < (game?.minPlayers || 2) ? (
              `Waiting for ${(game?.minPlayers || 2) - playerCount} more player${(game?.minPlayers || 2) - playerCount === 1 ? '' : 's'}...`
            ) : (
              `🚀 Start ${game?.name || 'Game'} with ${playerCount} players`
            )}
          </button>
        </div>
      </main>
    </div>
  )
}
