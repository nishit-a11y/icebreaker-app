import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase'

async function getSupabaseUser() {
  // Use service role to verify the auth token from the cookie
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('sb-access-token')?.value

  if (!accessToken) return null

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder'
  )

  const { data: { user } } = await supabase.auth.getUser(accessToken)
  return user
}

async function getStats() {
  const db = supabaseAdmin()
  const [rooms, participants, sessions] = await Promise.all([
    db.from('ib_rooms').select('id, code, status, plan, created_at', { count: 'exact' }),
    db.from('ib_participants').select('id', { count: 'exact' }),
    db.from('ib_game_sessions').select('id, game_id, started_at', { count: 'exact' }),
  ])
  return {
    totalRooms: rooms.count || 0,
    activeRooms: rooms.data?.filter(r => r.status === 'active').length || 0,
    totalParticipants: participants.count || 0,
    totalSessions: sessions.count || 0,
    recentRooms: (rooms.data || []).slice(-10).reverse(),
    planBreakdown: {
      free: rooms.data?.filter(r => r.plan === 'free').length || 0,
      team: rooms.data?.filter(r => r.plan === 'team').length || 0,
      pro: rooms.data?.filter(r => r.plan === 'pro').length || 0,
    },
  }
}

export default async function AdminDashboard() {
  const user = await getSupabaseUser()
  if (!user) redirect('/auth/signin')

  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL
  const userEmail = user.email

  if (userEmail !== superAdminEmail) {
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

  const stats = await getStats()

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
                {stats.recentRooms.map((room: { id: string; code: string; status: string; plan: string; created_at: string }) => (
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
      </main>
    </div>
  )
}
