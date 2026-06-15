'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { generateRandomName } from '@/lib/names'

function JoinForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefilledCode = searchParams.get('code') || ''

  const [code, setCode] = useState(prefilledCode.toUpperCase())
  const [name, setName] = useState('')
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Generate a default name the player can keep or re-roll
    setName(generateRandomName())
  }, [])

  function rerollName() {
    setName(generateRandomName())
  }

  function getOrCreateUUID(): string {
    let uuid = localStorage.getItem('icebreak_uuid')
    if (!uuid) {
      uuid = crypto.randomUUID()
      localStorage.setItem('icebreak_uuid', uuid)
    }
    return uuid
  }

  async function join(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) { setError('Enter a room code'); return }
    setJoining(true)
    setError('')

    try {
      const uuidToken = getOrCreateUUID()
      const res = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode: code.trim().toUpperCase(),
          uuidToken,
          displayName: name.trim() || generateRandomName(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Store participant info in localStorage for this session
      localStorage.setItem('icebreak_participant', JSON.stringify({
        id: data.participant.id,
        name: data.participant.display_name,
        roomId: data.room.id,
        roomCode: code.trim().toUpperCase(),
      }))

      router.push(`/room/${code.trim().toUpperCase()}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not join room')
      setJoining(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-5xl">🧊</span>
          <h1 className="text-white font-extrabold text-2xl mt-2">IceBreak</h1>
          <p className="text-white/60 text-sm mt-1">Join your team session</p>
        </div>

        <form onSubmit={join} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 space-y-5">
          {/* Room code */}
          <div>
            <label className="block text-white/70 text-sm font-medium mb-2">Room code</label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. WOLF-42"
              maxLength={10}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-center font-mono text-xl font-bold tracking-widest placeholder:text-white/30 focus:outline-none focus:border-yellow-300 focus:ring-1 focus:ring-yellow-300 transition-colors uppercase"
              autoFocus
              autoCapitalize="characters"
            />
          </div>

          {/* Display name */}
          <div>
            <label className="block text-white/70 text-sm font-medium mb-2">Your name</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Purple Falcon"
                maxLength={30}
                className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-yellow-300 focus:ring-1 focus:ring-yellow-300 transition-colors"
              />
              <button
                type="button"
                onClick={rerollName}
                className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl px-3 py-3 text-white transition-colors"
                title="Get a new random name"
              >
                🎲
              </button>
            </div>
            <p className="text-white/40 text-xs mt-1.5">Random name assigned — change it or keep it!</p>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg px-4 py-3 text-red-300 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={joining || !code.trim()}
            className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-gray-900 font-bold py-4 rounded-xl text-base transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
          >
            {joining ? (
              <>
                <span className="w-5 h-5 border-2 border-gray-700/30 border-t-gray-700 rounded-full animate-spin" />
                Joining...
              </>
            ) : (
              '🎮 Join session'
            )}
          </button>
        </form>

        <p className="text-center text-white/40 text-xs mt-6">
          Hosting a session?{' '}
          <a href="/sign-in" className="text-white/60 underline hover:text-white transition-colors">
            Sign in here
          </a>
        </p>
      </div>
    </main>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <JoinForm />
    </Suspense>
  )
}
