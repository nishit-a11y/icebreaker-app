'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Stats {
  totalRooms: number
  activeRooms: number
  totalParticipants: number
  totalSessions: number
  recentRooms: Array<{ id: string; code: string; status: string; plan: string; created_at: string }>
  planBreakdown: { free: number; team: number; pro: number }
}

const SUPER_ADMIN_EMAIL = 'hi@thethoughtbulb.com'

export default function AdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth/signin'); return }
      if (user.email !== SUPER_ADMIN_EMAIL) { setUserEmail(user.email ?? null); setLoading(false); return }
      setUserEmail(user.email ?? null)

      // Fetch stats
      try {
        const [rooms, participants, sessions] = await Promise.all([
          supabase.from('ib_rooms').select('id, code, status, plan, created_at'),
          supabase.from('ib_participants').select('id'),
          supabase.from('ib_game_sessions').select('id, game_id, started_at'),
        ])
        const roomData = rooms.data || []
        setStats({
          totalRooms: roomData.length,
          activeRooms: roomData.filter(r => r.status === 'active').length,
          totalParticipants: (participants.data || []).length,
          totalSessions: (sessions.data || []).length,
          recentRooms: roomData.slice(-10).reverse(),
          planBreakdown: {
            free: roomData.filter(r => r.plan === 'free').length,
            team: roomData.filter(r => r.plan === 'team').length,
            pro: roomData.filter(r => r.plan === 'pro').length,
          },
        })
      } catch (e) {
        setError('Failed to load stats')
      }
      setLoading(false)
    }
    init()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  if (userEmail !== SUPER_ADMIN_EMAIL) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold mb-2">Access denied</h1>
          <p className="text-white/60">This page is for ThoughtBulb admins only.</p>
          <a href="/host" className="mt-6 inline-block bg-purple-500 text-white px-6 py-3 rounded-xl">Go to host dashboard</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-white/10 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧊</span>
            <span className="font-bold">IceBreak</span>
            <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2 py-0.5 rounded-full">SUPER ADMIN</span>
          </div>
          <span className="text-white/40 text-sm">{userEmail}</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-8">ThoughtBulb Dashboard</h1>

        {error && <p className="text-red-400 mb-6">{error}</p>}

        {stats && (
          <>
            {/* Key metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              {[
                { label: 'Total rooms', value: stats.totalRooms, emoji: '🏠' },
                { label: 'Active now', value: stats.activeRooms, emoji: '🟢' },
                { label: 'Total players', value: stats.totalParticipants, emoji: '👥' },
                { label: 'Games played', value: stats.totalSessions, emoji: '🎮' },
              ].map(({ label, value, emoji }) => (
                <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <div className="text-2xl mb-2">{emoji}</div>
                  <div className="text-3xl font-black text-white">{value.toLocaleString()}</div>
                  <div className="text-white/50 text-sm mt-1">{label}</div>
                </div>
              ))}
            </div>

            {/* Plan breakdown */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
              <h2 className="font-bold text-lg mb-4">Plan breakdown</h2>
              <div className="flex gap-6">
                {Object.entries(stats.planBreakdown).map(([plan, count]) => (
                  <div key={plan}>
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-white/50 text-sm capitalize">{plan}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent rooms */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="font-bold text-lg mb-4">Recent rooms</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-white/40 border-b border-white/10">
                      <th className="text-left pb-3 font-medium">Code</th>
                      <th className="text-left pb-3 font-medium">Status</th>
                      <th className="text-left pb-3 font-medium">Plan</th>
                      <th className="text-left pb-3 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentRooms.map((room) => (
                      <tr key={room.id} className="border-b border-white/5">
                        <td className="py-3 font-mono font-bold">{room.code}</td>
                        <td className="py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            room.status === 'active' ? 'bg-green-500/20 text-green-400' :
                            room.status === 'ended' ? 'bg-gray-500/20 text-gray-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>{room.status}</span>
                        </td>
                        <td className="py-3 capitalize text-white/70">{room.plan}</td>
                        <td className="py-3 text-white/40">{new Date(room.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
