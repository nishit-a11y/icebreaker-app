'use client'

/**
 * Submit & Reveal Engine — Self-Playing Edition
 *
 * Games: Two Truths & One Lie, Finish the Sentence, Hot Take,
 *        Worst Advice Ever, Emoji Story
 *
 * Flow (no host buttons required):
 *   submitting  → everyone answers, auto-advances when all submit or 2min timeout
 *   guessing    → show one answer anonymously, 15s timer, everyone taps who said it
 *   reveal      → show author + scores, 4s auto-advance to next guessing round
 *   ended       → leaderboard
 *
 * Scoring:
 *   +2 for guessing correctly
 *   +1 for being the author nobody guessed (sneaky bonus)
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { FINISH_THE_SENTENCE_PROMPTS } from '@/lib/questions'
import type { GameSession, Submission, Participant } from '@/types'
import type { GameConfig } from '@/lib/games'

interface Props {
  session: GameSession
  game: GameConfig
  participant: Participant
  isHost: boolean
  roomId: string
  refreshSession?: () => Promise<void>
}

const GUESS_TIMER = 15   // seconds to guess
const REVEAL_PAUSE = 4   // seconds to show reveal before advancing
const SUBMIT_TIMEOUT = 120 // seconds max for submitting phase

// Pull the prompt for finish-sentence from the bank using stored index
function getPrompt(game: GameConfig, config: Record<string, unknown>): string {
  if (game.questionBank === 'finish-sentence') {
    const idx = (config.promptStartIndex as number ?? 0) % FINISH_THE_SENTENCE_PROMPTS.length
    return FINISH_THE_SENTENCE_PROMPTS[idx]
  }
  return (game.prompt ?? '') as string
}

// Elapsed seconds since a stored ISO timestamp
function elapsedSince(iso: string | undefined): number {
  if (!iso) return 0
  return Math.floor((Date.now() - new Date(iso as string).getTime()) / 1000)
}

export default function SubmitRevealEngine({ session, game, participant, isHost, roomId, refreshSession }: Props) {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [allParticipants, setAllParticipants] = useState<Participant[]>([])
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [mySubmission, setMySubmission] = useState<Submission | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [myGuess, setMyGuess] = useState<string | null>(null)   // participantId guessed
  const [timeLeft, setTimeLeft] = useState(GUESS_TIMER)
  const advancedRef = useRef(false)  // prevent double-advance from timer race

  const cfg = session.config as Record<string, unknown>
  const scores = (cfg.scores ?? {}) as Record<string, number>
  const currentIdx = (cfg.currentSubmissionIndex as number) ?? 0
  const phase = session.phase
  const prompt = getPrompt(game, cfg)

  // Non-host players (the ones who submit answers)
  const players = allParticipants.filter(p => !p.is_host)

  // ── Load participants + submissions ──────────────────────────────────────
  useEffect(() => {
    supabase.from('ib_participants').select('*').eq('room_id', roomId).order('joined_at')
      .then(({ data }) => { if (data) setAllParticipants(data) })

    const fetchSubs = async () => {
      const { data } = await supabase
        .from('ib_submissions')
        .select('*')
        .eq('game_session_id', session.id)
        .order('submitted_at', { ascending: true })
      if (data) {
        setSubmissions(data)
        const mine = data.find(s =>
          s.participant_id === participant.id && s.round_number !== -1
        )
        if (mine) setMySubmission(mine)

        // Check if I already guessed this round
        const myGuessRec = data.find(s =>
          s.participant_id === participant.id &&
          s.round_number === -1 &&
          (s.content as Record<string, unknown>).submissionIdx === currentIdx
        )
        if (myGuessRec) {
          setMyGuess((myGuessRec.content as Record<string, unknown>).guessedParticipantId as string)
        }
      }
    }
    fetchSubs()

    const channel = supabase
      .channel(`sre-${session.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'ib_submissions',
        filter: `game_session_id=eq.${session.id}`,
      }, (payload) => {
        setSubmissions(prev => [...prev, payload.new as Submission])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id, roomId, currentIdx])

  // ── Auto-advance: all players submitted → start guessing ─────────────────
  // Separate effect so it always has fresh submissions + players values,
  // avoiding the stale-closure bug in the realtime handler.
  useEffect(() => {
    if (phase !== 'submitting') return
    const answers = submissions.filter(s => s.round_number !== -1)
    // Count only non-host answers for the threshold — host answering should not trigger advance
    const nonHostAnswers = answers.filter(a => players.some(p => p.id === a.participant_id))
    if (nonHostAnswers.length >= players.length && players.length > 0 && !advancedRef.current) {
      advancedRef.current = true
      advanceToGuessing(answers, 0)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissions, players.length, phase])

  // Reset guess when phase or currentIdx changes
  useEffect(() => {
    setMyGuess(null)
    advancedRef.current = false
  }, [phase, currentIdx])

  // ── Guess countdown timer ─────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'guessing') return
    const phaseStart = cfg.phaseStartedAt as string | undefined
    const tick = () => {
      const elapsed = elapsedSince(phaseStart)
      const remaining = Math.max(0, GUESS_TIMER - elapsed)
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

  // ── Submitting phase timeout (120s fallback) ──────────────────────────────
  useEffect(() => {
    if (phase !== 'submitting') return
    const phaseStart = cfg.phaseStartedAt as string | undefined
    const elapsed = elapsedSince(phaseStart)
    const remaining = Math.max(0, SUBMIT_TIMEOUT - elapsed)
    if (remaining === 0) {
      const answers = submissions.filter(s => s.round_number !== -1)
      if (answers.length > 0 && !advancedRef.current) {
        advancedRef.current = true
        advanceToGuessing(answers, 0)
      }
      return
    }
    const id = setTimeout(() => {
      const answers = submissions.filter(s => s.round_number !== -1)
      if (answers.length > 0 && !advancedRef.current) {
        advancedRef.current = true
        advanceToGuessing(answers, 0)
      }
    }, remaining * 1000)
    return () => clearTimeout(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, cfg.phaseStartedAt])

  // ── Reveal auto-advance after REVEAL_PAUSE seconds ───────────────────────
  useEffect(() => {
    if (phase !== 'reveal') return
    const id = setTimeout(() => {
      if (advancedRef.current) return
      advancedRef.current = true
      const answers = submissions.filter(s => s.round_number !== -1)
      const nextIdx = currentIdx + 1
      if (nextIdx >= answers.length) {
        endGame()
      } else {
        goToNextGuessing(nextIdx)
      }
    }, REVEAL_PAUSE * 1000)
    return () => clearTimeout(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentIdx])

  // ── DB helpers ────────────────────────────────────────────────────────────
  const advanceToGuessing = useCallback(async (answers: Submission[], idx: number) => {
    await supabase.from('ib_game_sessions')
      .update({
        phase: 'guessing',
        config: { ...cfg, currentSubmissionIndex: idx, phaseStartedAt: new Date().toISOString() },
      })
      .eq('id', session.id)
      .eq('phase', 'submitting')  // idempotent — only one client wins
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id, cfg])

  // Host-only force start — no phase guard, bypasses advancedRef so it always works
  async function forceStartGuessing() {
    const currentAnswers = submissions.filter(s => s.round_number !== -1)
    if (currentAnswers.length === 0) return
    advancedRef.current = true
    await supabase.from('ib_game_sessions')
      .update({
        phase: 'guessing',
        config: { ...cfg, currentSubmissionIndex: 0, phaseStartedAt: new Date().toISOString() },
      })
      .eq('id', session.id)  // No phase guard — host override always applies
    // Explicit refetch: if DB was already in 'guessing' (auto-advance won the race but
    // the realtime event was missed), the update above is a no-op. The refetch syncs state.
    await refreshSession?.()
  }

  const goToNextGuessing = useCallback(async (idx: number) => {
    await supabase.from('ib_game_sessions')
      .update({
        phase: 'guessing',
        config: { ...cfg, currentSubmissionIndex: idx, phaseStartedAt: new Date().toISOString() },
      })
      .eq('id', session.id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id, cfg])

  const advanceToReveal = useCallback(async () => {
    // Calculate scores from guesses for this submission
    const answers = submissions.filter(s => s.round_number !== -1)
    const currentSub = answers[currentIdx]
    if (!currentSub) return

    const guessRecords = submissions.filter(s =>
      s.round_number === -1 &&
      (s.content as Record<string, unknown>).submissionIdx === currentIdx
    )

    const newScores = { ...scores }
    let anyCorrect = false
    for (const g of guessRecords) {
      const guessed = (g.content as Record<string, unknown>).guessedParticipantId as string
      // Two Truths: guess which field index is the lie
      if (game.id === 'two-truths') {
        const guessedField = (g.content as Record<string, unknown>).guessedFieldIndex as number
        const lieField = game.fields?.findIndex(f => f.isLie) ?? 2
        if (guessedField === lieField) {
          newScores[g.participant_id] = (newScores[g.participant_id] ?? 0) + 2
          anyCorrect = true
        }
      } else {
        if (guessed === currentSub.participant_id) {
          newScores[g.participant_id] = (newScores[g.participant_id] ?? 0) + 2
          anyCorrect = true
        }
      }
    }
    // Sneaky bonus: nobody guessed you
    if (!anyCorrect && currentSub.participant_id) {
      newScores[currentSub.participant_id] = (newScores[currentSub.participant_id] ?? 0) + 1
    }

    await supabase.from('ib_game_sessions')
      .update({
        phase: 'reveal',
        config: { ...cfg, currentSubmissionIndex: currentIdx, scores: newScores, phaseStartedAt: new Date().toISOString() },
      })
      .eq('id', session.id)
      .eq('phase', 'guessing')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id, cfg, submissions, currentIdx, scores, game])

  const endGame = useCallback(async () => {
    await supabase.from('ib_game_sessions').update({ phase: 'ended' }).eq('id', session.id)
    await supabase.from('ib_rooms').update({ status: 'waiting', current_game_id: null }).eq('id', roomId)
  }, [session.id, roomId])

  // ── Submit answer ─────────────────────────────────────────────────────────
  async function submitAnswer() {
    if (!game.fields?.some((_, i) => fieldValues[i]?.trim())) return
    setSubmitting(true)
    try {
      const content: Record<string, string> = {}
      game.fields?.forEach((f, i) => { content[`field_${i}`] = fieldValues[i] || '' })
      if (prompt) content.prompt = prompt

      const { data, error } = await supabase.from('ib_submissions').insert({
        game_session_id: session.id,
        participant_id: participant.id,
        content,
        round_number: 1,
      }).select().single()

      if (!error && data) setMySubmission(data)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Submit guess ──────────────────────────────────────────────────────────
  async function submitGuess(guessedParticipantId: string, guessedFieldIndex?: number) {
    if (myGuess) return
    setMyGuess(guessedParticipantId)
    await supabase.from('ib_submissions').insert({
      game_session_id: session.id,
      participant_id: participant.id,
      content: {
        type: 'guess',
        submissionIdx: currentIdx,
        guessedParticipantId,
        ...(guessedFieldIndex !== undefined ? { guessedFieldIndex } : {}),
      },
      round_number: -1,
    })
    // Check if everyone has guessed
    const totalGuessers = allParticipants.length // host can also guess
    const guessCount = submissions.filter(s =>
      s.round_number === -1 &&
      (s.content as Record<string, unknown>).submissionIdx === currentIdx
    ).length + 1 // +1 for this guess

    if (guessCount >= totalGuessers && !advancedRef.current) {
      advancedRef.current = true
      await advanceToReveal()
    }
  }

  // ── Derived data ──────────────────────────────────────────────────────────
  const answers = submissions.filter(s => s.round_number !== -1)
  const currentSub = answers[currentIdx]
  const currentAuthor = allParticipants.find(p => p.id === currentSub?.participant_id)
  const guessRecords = submissions.filter(s =>
    s.round_number === -1 &&
    (s.content as Record<string, unknown>).submissionIdx === currentIdx
  )
  const guessCount = guessRecords.length
  const totalGuessers = allParticipants.length

  // Sorted leaderboard
  const leaderboard = [...allParticipants]
    .filter(p => !p.is_host)
    .map(p => ({ ...p, score: scores[p.id] ?? 0 }))
    .sort((a, b) => b.score - a.score)

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  // ── SUBMITTING ────────────────────────────────────────────────────────────
  if (phase === 'submitting') {
    // Only count non-host answers — host submitting should not affect the threshold
    const submitCount = answers.filter(a => players.some(p => p.id === a.participant_id)).length
    const totalPlayers = players.length
    const allAnswered = submitCount >= totalPlayers && totalPlayers > 0

    if (mySubmission) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-white mb-2">Submitted!</h2>
          {prompt && (
            <p className="text-yellow-300/80 text-sm mb-4 max-w-xs">"{prompt}"</p>
          )}
          <p className={`text-sm mb-4 ${allAnswered ? 'text-green-400 font-semibold' : 'text-white/50'}`}>
            {allAnswered ? 'All players answered! ✓' : `${submitCount} of ${totalPlayers} answered`}
          </p>
          <div className="flex gap-1.5 flex-wrap justify-center max-w-xs mb-6">
            {players.map((p) => {
              const submitted = answers.some(s => s.participant_id === p.id)
              return (
                <div
                  key={p.id}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${submitted ? 'bg-green-400' : 'bg-white/20'}`}
                />
              )
            })}
          </div>
          {allAnswered && <p className="text-white/60 text-sm animate-pulse mb-3">🚀 Starting game…</p>}
          {isHost && (
            <button
              onClick={forceStartGuessing}
              disabled={answers.length === 0}
              className={`font-bold px-6 py-3 rounded-xl transition-colors text-sm disabled:opacity-30 disabled:cursor-not-allowed ${
                allAnswered
                  ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                  : 'bg-yellow-400 hover:bg-yellow-300 text-gray-900'
              }`}
            >
              {allAnswered ? 'Start game now →' : `Start game now (${submitCount}/${totalPlayers}) →`}
            </button>
          )}
          {!isHost && !allAnswered && (
            <p className="text-white/30 text-xs">Game starts automatically when everyone answers</p>
          )}
        </div>
      )
    }

    return (
      <div className="max-w-lg mx-auto px-6 py-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">{game.emoji}</div>
          <h2 className="text-2xl font-bold text-white">{game.name}</h2>
          {prompt && (
            <div className="mt-4 bg-yellow-400/10 border border-yellow-400/30 rounded-xl px-5 py-3 text-yellow-300 font-semibold text-sm">
              "{prompt}"
            </div>
          )}
        </div>

        <div className="space-y-4">
          {game.fields?.map((field, i) => (
            <div key={i}>
              <label className="block text-white/70 text-sm font-medium mb-1.5">{field.label}</label>
              <textarea
                value={fieldValues[i] || ''}
                onChange={e => setFieldValues(prev => ({ ...prev, [i]: e.target.value }))}
                placeholder={field.placeholder}
                rows={2}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-yellow-300 resize-none"
              />
            </div>
          ))}
        </div>

        <button
          onClick={submitAnswer}
          disabled={submitting || !game.fields?.some((_, i) => fieldValues[i]?.trim())}
          className="w-full mt-6 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-gray-900 font-bold py-4 rounded-xl transition-colors"
        >
          {submitting ? 'Submitting…' : 'Submit ✓'}
        </button>

        {isHost && (
          <button
            onClick={forceStartGuessing}
            disabled={answers.length === 0}
            className="w-full mt-2 text-white/40 hover:text-white/70 disabled:opacity-30 text-sm py-2 transition-colors disabled:cursor-not-allowed"
          >
            Skip & start with {answers.length} answer{answers.length !== 1 ? 's' : ''} →
          </button>
        )}

        <p className="text-center text-white/30 text-xs mt-3">
          {submitCount} of {totalPlayers} answered
        </p>
      </div>
    )
  }

  // ── GUESSING ──────────────────────────────────────────────────────────────
  if (phase === 'guessing') {
    const timerPct = (timeLeft / GUESS_TIMER) * 100
    const timerColor = timeLeft <= 5 ? 'bg-red-500' : timeLeft <= 10 ? 'bg-yellow-400' : 'bg-green-400'
    const answerCount = answers.length

    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="text-center mb-4">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-1">
            {currentIdx + 1} of {answerCount}
          </p>
          <h2 className="text-lg font-bold text-white">{game.name}</h2>
        </div>

        {/* Timer bar */}
        <div className="h-2 bg-white/10 rounded-full mb-4 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${timerColor}`}
            style={{ width: `${timerPct}%` }}
          />
        </div>
        <p className="text-center text-white font-bold text-2xl mb-4">{timeLeft}s</p>

        {/* The anonymous answer */}
        {currentSub && (
          <div className="bg-white/10 border border-white/20 rounded-2xl p-5 mb-5">
            <p className="text-white/40 text-xs uppercase tracking-widest mb-3">Who said this?</p>
            {prompt && (
              <p className="text-yellow-300/70 text-xs mb-2 italic">"{prompt}"</p>
            )}
            {game.fields?.map((field, i) => {
              const val = (currentSub.content as Record<string, string>)[`field_${i}`]
              if (!val) return null

              // Two Truths: each field is a tappable lie-guess
              if (game.id === 'two-truths') {
                const isGuessed = myGuess !== null &&
                  (currentSub.content as Record<string, unknown>)[`field_${i}`] !== undefined
                return (
                  <button
                    key={i}
                    onClick={() => !myGuess && submitGuess(currentSub.participant_id, i)}
                    disabled={!!myGuess}
                    className={`w-full text-left rounded-xl px-4 py-3 mb-2 border transition-colors text-sm ${
                      myGuess !== null && (submissions.find(s =>
                        s.participant_id === participant.id && s.round_number === -1 &&
                        (s.content as Record<string, unknown>).guessedFieldIndex === i
                      )) ? 'border-yellow-400 bg-yellow-400/10 text-white' :
                      myGuess ? 'border-white/10 bg-white/5 text-white/60' :
                      'border-white/20 bg-white/5 text-white hover:bg-white/15 hover:border-white/40 cursor-pointer'
                    }`}
                  >
                    <span className="text-white/40 text-xs mr-2">{['A', 'B', 'C'][i]}</span>
                    {val}
                  </button>
                )
              }

              return (
                <p key={i} className="text-white text-base font-medium leading-relaxed">{val}</p>
              )
            })}
          </div>
        )}

        {/* Name grid — tap who you think said it (not shown for Two Truths) */}
        {game.id !== 'two-truths' && (
          <div>
            <p className="text-white/50 text-xs text-center mb-3">
              {myGuess ? `You guessed! (${guessCount}/${totalGuessers} in)` : 'Tap who you think said it'}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {players.map(p => {
                const isMe = p.id === participant.id
                const isGuessed = myGuess === p.id
                return (
                  <button
                    key={p.id}
                    onClick={() => !myGuess && submitGuess(p.id)}
                    disabled={!!myGuess || isMe}
                    className={`py-3 px-4 rounded-xl text-sm font-medium transition-all border ${
                      isGuessed ? 'bg-purple-500 border-purple-400 text-white scale-95' :
                      isMe ? 'bg-white/5 border-white/10 text-white/30 cursor-default' :
                      myGuess ? 'bg-white/5 border-white/10 text-white/50' :
                      'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/40 cursor-pointer'
                    }`}
                  >
                    {p.display_name}
                    {isMe && <span className="text-white/30 text-xs ml-1">(you)</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {game.id === 'two-truths' && myGuess && (
          <p className="text-center text-white/50 text-sm mt-2">
            Locked in! ({guessCount}/{totalGuessers} guessed)
          </p>
        )}
      </div>
    )
  }

  // ── REVEAL ────────────────────────────────────────────────────────────────
  if (phase === 'reveal') {
    const latestScores = (session.config as Record<string, unknown>).scores as Record<string, number> ?? {}
    const correctGuessers = guessRecords.filter(g => {
      if (game.id === 'two-truths') {
        const lieIdx = game.fields?.findIndex(f => f.isLie) ?? 2
        return (g.content as Record<string, unknown>).guessedFieldIndex === lieIdx
      }
      return (g.content as Record<string, unknown>).guessedParticipantId === currentSub?.participant_id
    })

    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="text-center mb-4">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-1">
            {currentIdx + 1} of {answers.length}
          </p>
          <p className="text-green-400 text-sm font-semibold">Revealed!</p>
        </div>

        {currentSub && currentAuthor && (
          <div className="bg-white/10 border border-white/20 rounded-2xl p-5 mb-5">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-lg">
                {currentAuthor.display_name[0]}
              </div>
              <div>
                <p className="text-white font-bold">{currentAuthor.display_name}</p>
                <p className="text-white/40 text-xs">said this 👇</p>
              </div>
            </div>

            {game.fields?.map((field, i) => {
              const val = (currentSub.content as Record<string, string>)[`field_${i}`]
              if (!val) return null
              const isLie = game.id === 'two-truths' && field.isLie
              return (
                <div key={i} className={`mb-2 rounded-lg px-3 py-2 ${isLie ? 'bg-red-500/20 border border-red-500/40' : ''}`}>
                  {game.fields!.length > 1 && (
                    <p className="text-white/40 text-xs mb-0.5">
                      {field.label} {isLie ? '🎭 THE LIE' : ''}
                    </p>
                  )}
                  <p className="text-white text-sm">{val}</p>
                </div>
              )
            })}
          </div>
        )}

        {/* Who guessed right */}
        {correctGuessers.length > 0 ? (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-4">
            <p className="text-green-400 text-xs font-bold uppercase tracking-widest mb-2">
              🎯 Got it right (+2 pts)
            </p>
            <div className="flex flex-wrap gap-2">
              {correctGuessers.map(g => {
                const guesser = allParticipants.find(p => p.id === g.participant_id)
                return guesser ? (
                  <span key={g.id} className="bg-green-500/20 text-green-300 text-sm px-3 py-1 rounded-full">
                    {guesser.display_name}
                  </span>
                ) : null
              })}
            </div>
          </div>
        ) : (
          currentSub && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mb-4">
              <p className="text-purple-400 text-sm font-semibold">
                😏 Nobody guessed {currentAuthor?.display_name}! +1 sneaky point
              </p>
            </div>
          )
        )}

        {/* Mini scores */}
        <div className="grid grid-cols-3 gap-2">
          {leaderboard.slice(0, 6).map((p, i) => (
            <div key={p.id} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-center">
              <p className="text-white/40 text-xs">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</p>
              <p className="text-white text-xs font-medium truncate">{p.display_name.split(' ')[0]}</p>
              <p className="text-purple-400 font-bold text-sm">{latestScores[p.id] ?? 0}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-white/30 text-xs mt-4">Next answer in {REVEAL_PAUSE}s…</p>
      </div>
    )
  }

  // ── ENDED — Leaderboard ───────────────────────────────────────────────────
  if (phase === 'ended') {
    const finalScores = (session.config as Record<string, unknown>).scores as Record<string, number> ?? {}
    const ranked = [...players]
      .map(p => ({ ...p, score: finalScores[p.id] ?? 0 }))
      .sort((a, b) => b.score - a.score)

    const medals = ['🥇', '🥈', '🥉']

    return (
      <div className="max-w-lg mx-auto px-6 py-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎉</div>
          <h2 className="text-2xl font-bold text-white">That's a wrap!</h2>
          <p className="text-white/50 text-sm mt-1">Final scores</p>
        </div>

        <div className="space-y-3 mb-8">
          {ranked.map((p, i) => {
            const isMe = p.id === participant.id
            return (
              <div
                key={p.id}
                className={`flex items-center gap-4 rounded-2xl px-5 py-4 border transition-all ${
                  i === 0 ? 'bg-yellow-400/10 border-yellow-400/40' :
                  isMe ? 'bg-purple-500/10 border-purple-500/40' :
                  'bg-white/5 border-white/10'
                }`}
              >
                <span className="text-2xl w-8 text-center">{medals[i] ?? `#${i + 1}`}</span>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold truncate ${i === 0 ? 'text-yellow-300' : 'text-white'}`}>
                    {p.display_name}
                    {isMe && <span className="text-white/40 font-normal text-xs ml-1">(you)</span>}
                  </p>
                </div>
                <span className={`text-2xl font-black ${i === 0 ? 'text-yellow-400' : 'text-white'}`}>
                  {p.score}
                </span>
              </div>
            )
          })}
        </div>

        {isHost && (
          <a
            href="/host"
            className="block w-full text-center bg-purple-500 hover:bg-purple-400 text-white font-bold py-4 rounded-xl transition-colors"
          >
            Play another game
          </a>
        )}
        {!isHost && (
          <p className="text-center text-white/40 text-sm">Waiting for host to start another game…</p>
        )}
      </div>
    )
  }

  return null
}
