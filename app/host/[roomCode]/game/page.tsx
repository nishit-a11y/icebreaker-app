'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import GameRouter from '@/components/games/GameRouter'
import type { Room, Participant } from '@/types'

export default function HostGame() {
  const params = useParams()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const roomCode = (params.roomCode as string).toUpperCase()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const [room, setRoom] = useState<Room | null>(null)
  const [hostParticipant, setHostParticipant] = useState<Participant | null>(null)

  useEffect(() => {
    if (!user) return

    fetch(`/api/rooms?code=${roomCode}`)
      .then(r => r.json())
      .then(async data => {
        if (!data.room) { router.push('/host'); return }
        setRoom(data.room)

        // Find or create host participant record
        const { data: participants } = await supabase
          .from('ib_participants')
          .select('*')
          .eq('room_id', data.room.id)
          .eq('is_host', true)

        if (participants && participants.length > 0) {
          setHostParticipant(participants[0])
        } else {
          // Insert host as participant
          const { data: hp } = await supabase.from('ib_participants').insert({
            room_id: data.room.id,
            display_name: user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'Host',
            uuid_token: user.id,
            is_host: true,
          }).select().single()
          if (hp) setHostParticipant(hp)
        }
      })
  }, [user, roomCode, router])

  useEffect(() => {
    if (!room) return
    const ch = supabase
      .channel(`host-game-${room.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ib_rooms', filter: `id=eq.${room.id}` }, (payload) => {
        const updated = payload.new as Room
        setRoom(updated)
        if (updated.status === 'waiting') router.push(`/host/${roomCode}`)
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [room, roomCode, router])

  if (!room || !hostParticipant || !room.current_game_id) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-black text-white">
      {/* Host header */}
      <header className="border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <Link href="/host" className="text-lg hover:opacity-80 transition-opacity">🧊</Link>
        <span className="text-yellow-400 text-xs font-semibold uppercase tracking-widest">HOST</span>
        <div className="flex items-center gap-3">
          <span className="font-mono text-white/40 text-xs">{roomCode}</span>
          <button
            onClick={async () => {
              if (!confirm('End the game and return to the lobby?')) return
              if (room) {
                await supabase.from('ib_game_sessions').update({ phase: 'ended' }).eq('id', room.current_game_id!)
                await supabase.from('ib_rooms').update({ status: 'waiting', current_game_id: null }).eq('id', room.id)
              }
            }}
            className="text-white/30 hover:text-red-400 text-xs transition-colors cursor-pointer"
          >
            End game
          </button>
        </div>
      </header>

      <GameRouter
        gameSessionId={room.current_game_id}
        participant={hostParticipant}
        isHost={true}
        roomId={room.id}
      />
    </div>
  )
}
