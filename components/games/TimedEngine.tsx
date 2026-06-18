'use client'

/**
 * Timed Engine — Self-Playing
 *
 * Games: This or That
 *
 * Flow: 15s countdown → everyone picks A/B → 5s results → next round (10 rounds)
 */

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { THIS_OR_THAT } from '@/lib/questions'
import type { GameSession, Submission, Participant } from '@/types'
import type { GameConfig } from '@/lib/games'

interface Props {
  session: GameSession
  game: GameConfig
  participant: Participant
  isHost: boolean
  roomId: string
  participants: Participant[]
  refreshSession?: () => Promise<void>
}

const PICK_TIMER = 15
const REVEAL_PAUSE = 5

function elapsedSince(iso: string | undefined): number {
  if (!iso) return 0
  return Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
}

export default function TimedEngine({ session, game, participant, isHost, roomId, participants, refreshSession }: Props) {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [myPick, setMyPick] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(PICK_TIMER)
  const [revealCountdown, setRevealCountdown] = useState(REVEAL_PAUSE)
  const advancedRef = useRef(false)

  const cfg = session.config as Record<string, unknown>
  const phase = session.phase
  const round = session.round_number
  const totalRounds = (cfg.rounds as number) ?? (game.rounds ?? 10)
  const promptStartIndex = (cfg.promptStartIndex as number) ?? 0

  const questionIndex = (promptStartIndex + round - 1) % THIS_OR_THAT.length
  const question = THIS_OR_THAT[questionIndex]

  const players = participants.filter(p => !p.is_host)

  // ── Load submissions for this round ──────────────────────────────────────
  useEffect(() => {
    setMyPick(null)
    advancedRef.current = false

    const fetchSubs = async () => {
      const { data } = await supabase
        .from('ib_submissions').select('*')
        .eq('game_session_id', session.id).eq('round_number', round)
      if (data) {
        setSubmissions(data)
        const mine = data.find(s => s.participant_id === participant.id)
        if (mine) setMyPick((mine.content as Record<string,string>).choice)
      }
    }
    fetchSubs()

    const ch = supabase.channel(`timed-${session.id}-${round}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'ib_submissions',
        filter: `game_session_id=eq.${session.id}`,
      }, fetchSubs)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [session.id, round, participant.id])

  // ── Pick countdown ────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'submitting') return
    const phaseStart = cfg.phaseStartedAt as string | undefined
    const tick = () => {
      const elapsed = elapsedSince(phaseStart)
      const remaining = Math.max(0, PICK_TIMER - elapsed)
      setTimeLeft(remaining)
      if (remaining === 0 && !advancedRef.current) {
        advancedRef.current = true
        advanceToReveal()
      }
    }
    tick()
    const id = setInterval(tick, 300)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, cfg.phaseStartedAt])

  // ── Reveal auto-advance ───────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'reveal') return
    advancedRef.current = false
    setRevealCountdown(REVEAL_PAUSE)
    const start = Date.now()
    const tick = () => {
      const elapsed = Math.floor((Date.now() - start) / 1000)
      const remaining = Math.max(0, REVEAL_PAUSE - elapsed)
      setRevealCountdown(remaining)
      if (remaining === 0 && !advancedRef.current) {
        advancedRef.current = true
        nextRound()
      }
    }
    const id = setInterval(tick, 300)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, round])

  async function advanceToReveal() {
    await supabase.from('ib_game_sessions')
      .update({ phase: 'reveal', config: { ...cfg, phaseStartedAt: new Date().toISOString() } })
      .eq('id', session.id).eq('phase', 'submitting')
  }

  // Host-only force skip — no phase guard so it always works
  async function forceSkipToReveal() {
    advancedRef.current = true
    await supabase.from('ib_game_sessions')
      .update({ phase: 'reveal', config: { ...cfg, phaseStartedAt: new Date().toISOString() } })
      .eq('id', session.id)
    await refreshSession?.()
  }

  async function nextRound() {
    if (round >= totalRounds) {
      await supabase.from('ib_game_sessions').update({ phase: 'ended' }).eq('id', session.id)
      await supabase.from('ib_rooms').update({ status: 'waiting', current_game_id: null }).eq('id', roomId)
    } else {
      await supabase.from('ib_game_sessions')
        .update({
          phase: 'submitting',
          round_number: round + 1,
          config: { ...cfg, phaseStartedAt: new Date().toISOString() },
        })
        .eq('id', session.id).eq('phase', 'reveal')
    }
  }

  async function pick(choice: 'A' | 'B') {
    if (myPick) return
    setMyPick(choice)
    await supabase.from('ib_submissions').insert({
      game_session_id: session.id,
      participant_id: participant.id,
      content: { choice },
      round_number: round,
    })
    const newCount = submissions.length + 1
    if (newCount >= players.length && !advancedRef.current) {
      advancedRef.current = true
      await advanceToReveal()
    }
  }

  // ── Derived stats ─────────────────────────────────────────────────────────
  const pickA = submissions.filter(s => (s.content as Record<string,string>).choice === 'A').length
  const pickB = submissions.filter(s => (s.content as Record<string,string>).choice === 'B').length
  const total = pickA + pickB
  const pctA = total ? Math.round((pickA / total) * 100) : 50
  const pctB = total ? Math.round((pickB / total) * 100) : 50
  const showResults = phase === 'reveal' || !!myPick

  const timerPct = (timeLeft / PICK_TIMER) * 100
  const timerColor = timeLeft <= 4 ? 'bg-red-500' : timeLeft <= 8 ? 'bg-yellow-400' : 'bg-purple-400'

  // ── ENDED ─────────────────────────────────────────────────────────────────
  if (phase === 'ended') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-white mb-2">That's a wrap!</h2>
        <p className="text-white/60">Hope you learned something new about your team.</p>
        {isHost && (
          <a href="/host" className="mt-8 bg-purple-500 hover:bg-purple-400 text-white font-bold px-8 py-4 rounded-xl transition-colors">
            Play another game
          </a>
        )}
      </div>
    )
  }

  // ── MAIN GAME ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-white/40 text-xs">Round {round}/{totalRounds}</span>
        <span className="text-white/40 text-xs">{game.emoji} {game.name}</span>
      </div>

      {/* Timer / reveal countdown */}
      {phase === 'submitting' && (
        <div className="mb-4">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-1">
            <div className={`h-full rounded-full ${timerColor}`} style={{ width: `${timerPct}%`, transition: 'background-color 0.3s' }} />
          </div>
          <div className="flex justify-between text-xs text-white/40">
            <span>{submissions.length >= players.length && players.length > 0 ? '✓ Everyone picked!' : `${submissions.length}/${players.length} picked`}</span>
            <span>{timeLeft}s</span>
          </div>
        </div>
      )}
      {phase === 'reveal' && (
        <p className="text-center text-white/40 text-xs mb-4">Next in {revealCountdown}s…</p>
      )}

      {/* Question label */}
      <p className="text-center text-white/50 text-sm font-medium mb-4">Which one are you?</p>

      {/* A / B cards */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {(['A', 'B'] as const).map(opt => {
          const text = opt === 'A' ? question.a : question.b
          const count = opt === 'A' ? pickA : pickB
          const pct = opt === 'A' ? pctA : pctB
          const chosen = myPick === opt
          const winning = showResults && count === Math.max(pickA, pickB) && total > 0

          return (
            <button
              key={opt}
              onClick={() => phase === 'submitting' && !myPick && pick(opt)}
              disabled={!!myPick || phase === 'reveal'}
              className={`rounded-2xl p-5 text-center transition-all border-2 relative ${
                chosen ? 'bg-purple-500/30 border-purple-400' :
                winning && showResults ? 'bg-white/10 border-white/40' :
                showResults ? 'bg-white/5 border-white/10' :
                'bg-white/5 border-white/15 hover:bg-white/15 hover:border-white/40 cursor-pointer'
              }`}
            >
              <p className="text-white font-bold text-base leading-snug">{text}</p>
              {showResults && (
                <div className="mt-3">
                  <p className="text-3xl font-black text-white">{pct}%</p>
                  <p className="text-white/40 text-xs mt-0.5">{count} of {total}</p>
                  <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${chosen ? 'bg-purple-400' : winning ? 'bg-white/50' : 'bg-white/20'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )}
              {chosen && <div className="absolute top-2 right-2 text-purple-300 text-xs">✓</div>}
            </button>
          )
        })}
      </div>

      {/* Who picked what — revealed after voting */}
      {showResults && players.length <= 20 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-3">Team breakdown</p>
          <div className="flex flex-wrap gap-2">
            {players.map(p => {
              const sub = submissions.find(s => s.participant_id === p.id)
              const choice = sub ? (sub.content as Record<string,string>).choice : null
              const isMe = p.id === participant.id
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
                    choice === 'A' ? 'bg-purple-500/20 border-purple-500/40 text-purple-200' :
                    choice === 'B' ? 'bg-blue-500/20 border-blue-500/40 text-blue-200' :
                    'bg-white/5 border-white/10 text-white/30'
                  }`}
                >
                  <span className="font-medium">{p.display_name.split(' ')[0]}{isMe ? ' (you)' : ''}</span>
                  {choice && <span className="font-bold">{choice}</span>}
                  {!choice && <span>–</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!myPick && phase === 'submitting' && (
        <p className="text-center text-white/40 text-sm mt-4 animate-pulse">Tap your pick 👆</p>
      )}
      {isHost && phase === 'submitting' && (
        <button
          onClick={forceSkipToReveal}
          disabled={submissions.length === 0}
          className="w-full mt-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Skip to results ({submissions.length}/{players.length}) →
        </button>
      )}
    </div>
  )
}
