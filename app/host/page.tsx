'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { GAMES } from '@/lib/games'

// Which plans can access each game plan tier
function canAccess(userPlan: string, gamePlans: string[]) {
  if (userPlan === 'pro') return true
  if (userPlan === 'team') return gamePlans.includes('team') || gamePlans.includes('free')
  return gamePlans.includes('free')
}

export default function HostDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [selectedGame, setSelectedGame] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null)
      setIsLoaded(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Get plan from user metadata (set by Stripe webhook)
  const userPlan = (user?.user_metadata?.plan as string) || 'free'

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  useEffect(() => {
    if (isLoaded && !user) router.push('/auth/signin')
  }, [isLoaded, user, router])

  async function createRoom() {
    if (!selectedGame || !user) return
    setCreating(true)
    setError('')
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostId: user.id, plan: userPlan }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Navigate to host lobby
      router.push(`/host/${data.room.code}?game=${selectedGame}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setCreating(false)
    }
  }

  if (!isLoaded || !user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const categories = ['reveal', 'compete', 'connect', 'laugh', 'timed'] as const
  const categoryLabels = {
    reveal: '🎭 Reveal',
    compete: '⚡ Compete',
    connect: '🤝 Connect',
    laugh: '😂 Laugh',
    timed: '⏱️ Timed',
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/host" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span className="text-2xl">🧊</span>
            <span className="font-bold text-lg">IceBreak</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              userPlan === 'pro' ? 'bg-yellow-400/20 text-yellow-300' :
              userPlan === 'team' ? 'bg-purple-400/20 text-purple-300' :
              'bg-gray-700 text-gray-400'
            }`}>
              {userPlan.toUpperCase()}
            </span>
            <span className="text-white/60 text-sm">{user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'Host'}</span>
            <button
              onClick={handleLogout}
              className="text-white/40 hover:text-white/80 text-sm transition-colors cursor-pointer"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Pick a game to start</h1>
          <p className="text-white/60">Select a game, then create your session. Players join with a code.</p>
        </div>

        {/* Upgrade banner for free plan */}
        {userPlan === 'free' && (
          <div className="bg-gradient-to-r from-purple-600/20 to-indigo-600/20 border border-purple-500/30 rounded-xl p-4 mb-6 flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">You're on the Free plan</p>
              <p className="text-white/60 text-xs mt-0.5">3 games available. Upgrade to unlock all 10.</p>
            </div>
            <a href="/#pricing" className="bg-purple-500 hover:bg-purple-400 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              Upgrade
            </a>
          </div>
        )}

        {/* Game grid by category */}
        <div className="space-y-8">
          {categories.map(cat => {
            const gamesInCat = GAMES.filter(g => g.category === cat)
            if (gamesInCat.length === 0) return null
            return (
              <div key={cat}>
                <h2 className="text-white/50 text-xs uppercase tracking-widest font-semibold mb-3">
                  {categoryLabels[cat]}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {gamesInCat.map(game => {
                    const accessible = canAccess(userPlan, game.plans)
                    const selected = selectedGame === game.id
                    return (
                      <button
                        key={game.id}
                        onClick={() => accessible && setSelectedGame(game.id)}
                        disabled={!accessible}
                        className={`relative text-left rounded-xl p-4 border transition-all ${
                          selected
                            ? 'bg-purple-600 border-purple-400 shadow-lg shadow-purple-500/20'
                            : accessible
                              ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                              : 'bg-white/2 border-white/5 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{game.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm leading-tight">{game.name}</div>
                            <div className="text-white/50 text-xs mt-1 leading-relaxed">{game.description}</div>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-white/30 text-xs">~{game.durationMinutes} min</span>
                              <span className="text-white/20">·</span>
                              <span className="text-white/30 text-xs">{game.minPlayers}+ players</span>
                            </div>
                          </div>
                        </div>
                        {!accessible && (
                          <div className="absolute top-2 right-2 bg-yellow-400/20 text-yellow-300 text-[10px] font-bold px-1.5 py-0.5 rounded">
                            {game.plans[0].toUpperCase()}
                          </div>
                        )}
                        {selected && (
                          <div className="absolute top-2 right-2">
                            <span className="text-white text-lg">✓</span>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Create session CTA */}
        <div className="sticky bottom-6 mt-10">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-xl">
            {selectedGame ? (
              <>
                <div>
                  <p className="font-semibold">{GAMES.find(g => g.id === selectedGame)?.emoji} {GAMES.find(g => g.id === selectedGame)?.name}</p>
                  <p className="text-white/50 text-sm">Ready to start. A room code will be generated.</p>
                </div>
                <button
                  onClick={createRoom}
                  disabled={creating}
                  className="bg-purple-500 hover:bg-purple-400 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl transition-colors flex items-center gap-2"
                >
                  {creating ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    '🚀 Create session'
                  )}
                </button>
              </>
            ) : (
              <p className="text-white/40 text-sm mx-auto">👆 Select a game above to get started</p>
            )}
          </div>
          {error && <p className="text-red-400 text-sm text-center mt-2">{error}</p>}
        </div>
      </main>
    </div>
  )
}
