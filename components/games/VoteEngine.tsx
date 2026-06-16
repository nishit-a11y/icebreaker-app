'use client'

/**
 * Vote Engine — Self-Playing Edition
 *
 * Games: Would You Rather, Who in the Room?
 *
 * Flow (no host buttons):
 *   Each round: 20s countdown → everyone votes → auto-reveal → 5s pause → next round
 */

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { WYR_QUESTIONS, WHO_IN_THE_ROOM_PROMPTS } from '@/lib/questions'
import type { GameSession, Submission, Participant } from '@/types'
import type { GameConfig } from '@/lib/games'

interface Props {
  session: GameSession
  game: GameConfig
  participant: Participant
  isHost: boolean
  roomId: string
}

const VOTE_TIMER = 20
const REVEAL_PAUSE = 5

function elapsedSince(iso: string | undefined): number {
  if (!iso) return 0
  return Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
}

export default function VoteEngine({ session, game, participant, isHost, roomId }: Props) {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [allParticipants, setAllParticipants] = useState<Participant[]>([])
  const [myVote, setMyVote] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(VOTE_TIMER)
  const [revealCountdown, setRevealCountdown] = useState(REVEAL_PAUSE)
  const advancedRef = useRef(false)

  const cfg = session.config as Record<string, unknown>
  const phase = session.phase
  const round = session.round_number
  const totalRounds = (cfg.rounds as number) ?? (game.rounds ?? 7)
  const promptStartIndex = (cfg.promptStartIndex as number) ?? 0

  const questionIndex = (promptStartIndex + round - 1) % (
    game.id === 'would-you-rather' ? WYR_QUESTIONS.length : WHO_IN_THE_ROOM_PROMPTS.length
  )
  const wyrQ = WYR_QUESTIONS[questionIndex]
  const witrPrompt = WHO_IN_THE_ROOM_PROMPTS[questionIndex]

  const players = allParticipants.filter(p => !p.is_host)

  useEffect(() => {
    supabase.from('ib_participants').select('*').eq('room_id', roomId).order('joined_at')
      .then(({ data }) => { if (data) setAllParticipants(data) })
  }, [roomId])

  useEffect(() => {
    setMyVote(null)
    advancedRef.current = false

    const fetchSubs = async () => {
      const { data } = await supabase
        .from('ib_submissions').select('*')
        .eq('game_session_id', session.id)
        .eq('round_number', round)
      if (data) {
        setSubmissions(data)
        const mine = data.find(s => s.participant_id === participant.id)
        if (mine) setMyVote((mine.content as Record<string,string>).choice ?? mine.id)
      }
    }
    fetchSubs()

    const ch = supabase.channel(`vote-${session.id}-${round}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ib_submissions', filter: `game_session_id=eq.${session.id}` }, fetchSubs)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [session.id, round, participant.id])

  // Vote countdown
  useEffect(() => {
    if (phase !== 'submitting') return
    const phaseStart = cfg.phaseStartedAt as string | undefined
    const tick = () => {
      const elapsed = elapsedSince(phaseStart)
      const remaining = Math.max(0, VOTE_TIMER - elapsed)
      setTimeLeft(remaining)
      if (remaining === 0 && !advancedRef.current) {
        advancedRef.current = true
        advanceToReveal()
      }
    }
    tick()
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, cfg.phaseStartedAt])

  // Reveal auto-advance
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
    const id = setInterval(tick, 500)
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
  }

  async function nextRound() {
    if (round >= totalRounds) {
      await supabase.from('ib_game_sessions').update({ phase: 'ended' }).eq('id', session.id)
      await supabase.from('ib_rooms').update({ status: 'waiting', current_game_id: null }).eq('id', roomId)
    } else {
      await supabase.from('ib_game_sessions')
        .update({ phase: 'submitting', round_number: round + 1, config: { ...cfg, phaseStartedAt: new Date().toISOString() } })
        .eq('id', session.id).eq('phase', 'reveal')
    }
  }

  async function vote(choice: string) {
    if (myVote) return
    setMyVote(choice)
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

  const timerPct = (timeLeft / VOTE_TIMER) * 100
  const timerColor = timeLeft <= 5 ? 'bg-red-500' : timeLeft <= 10 ? 'bg-yellow-400' : 'bg-purple-400'

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

  // ══════════════════════════════════════════════════════════════════════════
  // WOULD YOU RATHER
  // ══════════════════════════════════════════════════════════════════════════
  if (game.id === 'would-you-rather') {
    const voteA = submissions.filter(s => (s.content as Record<string,string>).choice === 'A').length
    const voteB = submissions.filter(s => (s.content as Record<string,string>).choice === 'B').length
    const total = voteA + voteB
    const showResults = phase === 'reveal' || !!myVote

    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-white/40 text-xs">Round {round}/{totalRounds}</span>
          <span className="text-white/40 text-xs">{game.emoji} {game.name}</span>
        </div>

        {phase === 'submitting' && (
          <>
            <div className="h-1.5 bg-white/10 rounded-full mb-1 overflow-hidden">
              <div className={`h-full rounded-full transition-all ${timerColor}`} style={{ width: `${timerPct}%` }} />
            </div>
            <p className="text-right text-white/40 text-xs mb-4">{timeLeft}s</p>
          </>
        )}
        {phase === 'reveal' && (
          <p className="text-center text-white/40 text-xs mb-4">Next in {revealCountdown}s…</p>
        )}

        <p className="text-center text-white/60 text-sm mb-3 font-medium">Would you rather…</p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {(['A', 'B'] as const).map((opt, i) => {
            const text = i === 0 ? wyrQ.a : wyrQ.b
            const count = i === 0 ? voteA : voteB
            const pct = total ? Math.round((count / total) * 100) : 0
            const chosen = myVote === opt
            const winning = showResults && count === Math.max(voteA, voteB) && total > 0

            return (
              <button
                key={opt}
                onClick={() => phase === 'submitting' && !myVote && vote(opt)}
                disabled={!!myVote || phase === 'reveal'}
                className={`relative rounded-2xl p-5 text-center transition-all border-2 ${
                  chosen ? 'bg-purple-500/30 border-purple-400' :
                  winning && showResults ? 'bg-white/10 border-white/30' :
                  showResults ? 'bg-white/5 border-white/10' :
                  'bg-white/5 border-white/15 hover:bg-white/15 hover:border-white/40 cursor-pointer'
                }`}
              >
                <div className="text-xs font-bold text-white/40 mb-2">{opt}</div>
                <p className="text-white text-sm font-medium leading-snug">{text}</p>
                {showResults && (
                  <div className="mt-3">
                    <p className="text-2xl font-black text-white">{pct}%</p>
                    <p className="text-white/40 text-xs">{count} vote{count !== 1 ? 's' : ''}</p>
                    <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${chosen ? 'bg-purple-400' : 'bg-white/30'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}
                {chosen && <div className="absolute top-2 right-2 text-xs text-purple-300">✓</div>}
              </button>
            )
          })}
        </div>

        {!myVote && phase === 'submitting' && <p className="text-center text-white/40 text-sm">Tap your choice</p>}
        {myVote && phase === 'submitting' && <p className="text-center text-white/50 text-sm">Voted! {submissions.length}/{players.length} in</p>}
        {isHost && phase === 'submitting' && submissions.length > 0 && (
          <button
            onClick={forceSkipToReveal}
            className="w-full mt-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
          >
            Skip to results ({submissions.length}/{players.length}) →
          </button>
        )}
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // WHO IN THE ROOM?
  // ══════════════════════════════════════════════════════════════════════════
  const voteCounts: Record<string, number> = {}
  for (const sub of submissions) {
    const c = (sub.content as Record<string,string>).choice
    if (c) voteCounts[c] = (voteCounts[c] ?? 0) + 1
  }
  const maxVotes = Math.max(0, ...Object.values(voteCounts))
  const showResults = phase === 'reveal' || !!myVote
  const sortedPlayers = showResults
    ? [...players].sort((a, b) => (voteCounts[b.id] ?? 0) - (voteCounts[a.id] ?? 0))
    : players

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-white/40 text-xs">Round {round}/{totalRounds}</span>
        <span className="text-white/40 text-xs">{game.emoji} {game.name}</span>
      </div>

      {phase === 'submitting' && (
        <>
          <div className="h-1.5 bg-white/10 rounded-full mb-1 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${timerColor}`} style={{ width: `${timerPct}%` }} />
          </div>
          <p className="text-right text-white/40 text-xs mb-4">{timeLeft}s</p>
        </>
      )}
      {phase === 'reveal' && (
        <p className="text-center text-white/40 text-xs mb-4">Next in {revealCountdown}s…</p>
      )}

      <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-2xl px-5 py-5 mb-5 text-center">
        <p className="text-white/40 text-xs uppercase tracking-widest mb-2">Most likely to…</p>
        <p className="text-white font-bold text-lg leading-snug">{witrPrompt}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {sortedPlayers.map(p => {
          const isMe = p.id === participant.id
          const isChosen = myVote === p.id
          const voteCount = voteCounts[p.id] ?? 0
          const isWinner = showResults && voteCount === maxVotes && maxVotes > 0

          return (
            <button
              key={p.id}
              onClick={() => phase === 'submitting' && !myVote && !isMe && vote(p.id)}
              disabled={!!myVote || isMe || phase === 'reveal'}
              className={`rounded-xl px-4 py-3 text-sm font-medium border transition-all flex items-center justify-between gap-2 ${
                isWinner && showResults ? 'bg-yellow-400/15 border-yellow-400/40 text-white' :
                isChosen ? 'bg-purple-500/30 border-purple-400 text-white' :
                isMe ? 'bg-white/5 border-white/10 text-white/30 cursor-default' :
                myVote || phase === 'reveal' ? 'bg-white/5 border-white/10 text-white/60' :
                'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/40 cursor-pointer'
              }`}
            >
              <span className="truncate">{isWinner && showResults ? '👑 ' : ''}{p.display_name}{isMe ? ' (you)' : ''}</span>
              {showResults && voteCount > 0 && (
                <span className={`text-xs font-bold flex-shrink-0 ${isWinner ? 'text-yellow-400' : 'text-white/50'}`}>{voteCount}</span>
              )}
            </button>
          )
        })}
      </div>

      {!myVote && phase === 'submitting' && <p className="text-center text-white/40 text-sm mt-4">Tap who fits best</p>}
      {myVote && phase === 'submitting' && <p className="text-center text-white/50 text-sm mt-4">Voted! {submissions.length}/{players.length} in</p>}
      {isHost && phase === 'submitting' && submissions.length > 0 && (
        <button
          onClick={forceSkipToReveal}
          className="w-full mt-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
        >
          Skip to results ({submissions.length}/{players.length}) →
        </button>
      )}
    </div>
  )
}
