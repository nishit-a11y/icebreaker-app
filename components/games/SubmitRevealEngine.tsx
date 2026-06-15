'use client'

/**
 * Submit & Reveal Engine
 * Used by: Two Truths & One Lie, Finish the Sentence, Hot Take, Worst Advice Ever
 *
 * Phases:
 *   submitting → (host advances) → reveal → ended
 *
 * Participants submit their answers anonymously.
 * Host reveals one-by-one, team votes on Two Truths lie-guessing.
 */

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { GameSession, Submission, Participant } from '@/types'
import type { GameConfig } from '@/lib/games'

interface Props {
  session: GameSession
  game: GameConfig
  participant: Participant
  isHost: boolean
  roomId: string
}

export default function SubmitRevealEngine({ session, game, participant, isHost, roomId }: Props) {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [mySubmission, setMySubmission] = useState<Submission | null>(null)
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [voted, setVoted] = useState<string | null>(null)
  const [revealIndex, setRevealIndex] = useState(0)

  // Load submissions in realtime
  useEffect(() => {
    const fetchSubs = async () => {
      const { data } = await supabase
        .from('ib_submissions')
        .select('*')
        .eq('game_session_id', session.id)
        .order('submitted_at', { ascending: true })
      if (data) {
        setSubmissions(data)
        const mine = data.find(s => s.participant_id === participant.id)
        if (mine) setMySubmission(mine)
      }
    }
    fetchSubs()

    const channel = supabase
      .channel(`submissions-${session.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ib_submissions',
        filter: `game_session_id=eq.${session.id}`,
      }, (payload) => {
        setSubmissions(prev => [...prev, payload.new as Submission])
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'ib_submissions',
        filter: `game_session_id=eq.${session.id}`,
      }, (payload) => {
        setSubmissions(prev => prev.map(s => s.id === (payload.new as Submission).id ? payload.new as Submission : s))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [session.id, participant.id])

  async function submitAnswers() {
    if (!game.fields?.some((_, i) => fieldValues[i])) return
    setSubmitting(true)
    try {
      const content: Record<string, string> = {}
      game.fields?.forEach((f, i) => { content[`field_${i}`] = fieldValues[i] || '' })
      if (game.prompt) content.prompt = game.prompt

      const { data, error } = await supabase.from('ib_submissions').insert({
        game_session_id: session.id,
        participant_id: participant.id,
        content,
        is_lie: false, // will be set by host during reveal for Two Truths
        round_number: session.round_number,
      }).select().single()

      if (!error && data) setMySubmission(data)
    } finally {
      setSubmitting(false)
    }
  }

  async function voteForLie(submissionId: string, fieldIndex: number) {
    if (voted || !mySubmission) return
    const key = `${submissionId}-${fieldIndex}`
    setVoted(key)

    await supabase.from('ib_submissions')
      .update({ votes: [...(submissions.find(s => s.id === submissionId)?.votes || []), participant.id] })
      .eq('id', submissionId)
  }

  async function advancePhase() {
    const nextPhase = session.phase === 'submitting' ? 'reveal' : 'ended'
    await supabase.from('ib_game_sessions')
      .update({ phase: nextPhase })
      .eq('id', session.id)

    if (nextPhase === 'ended') {
      await supabase.from('ib_rooms').update({ status: 'waiting', current_game_id: null }).eq('id', roomId)
    }
  }

  const phase = session.phase

  // ── Submitting phase ─────────────────────────────────────────────────────
  if (phase === 'submitting') {
    if (isHost) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <div className="text-6xl mb-4">{game.emoji}</div>
          <h2 className="text-2xl font-bold text-white mb-2">{game.name}</h2>
          <p className="text-white/60 mb-8">{game.description}</p>

          <div className="bg-white/10 border border-white/20 rounded-2xl p-6 mb-8 w-full max-w-md">
            <p className="text-white/50 text-sm mb-2">Players submitting...</p>
            <div className="text-5xl font-bold text-white">{submissions.length}</div>
            <p className="text-white/40 text-xs mt-1">of team submitted</p>

            {/* Submission list (names hidden) */}
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {submissions.map((_, i) => (
                <div key={i} className="w-3 h-3 rounded-full bg-green-400" />
              ))}
            </div>
          </div>

          {game.prompt && (
            <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-xl px-6 py-4 mb-6 text-yellow-300 font-semibold text-lg max-w-md">
              "{game.prompt}"
            </div>
          )}

          <button
            onClick={advancePhase}
            disabled={submissions.length === 0}
            className="bg-purple-500 hover:bg-purple-400 disabled:opacity-40 text-white font-bold px-8 py-4 rounded-xl text-lg transition-colors"
          >
            Reveal answers →
          </button>
        </div>
      )
    }

    // Participant submit view
    if (mySubmission) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-white mb-2">Submitted!</h2>
          <p className="text-white/60">Waiting for everyone else...</p>
          <div className="flex gap-1 mt-6">
            {[0,1,2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: `${i*150}ms` }} />
            ))}
          </div>
        </div>
      )
    }

    return (
      <div className="max-w-lg mx-auto px-6 py-8">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">{game.emoji}</div>
          <h2 className="text-2xl font-bold text-white">{game.name}</h2>
          {game.prompt && (
            <div className="mt-4 bg-yellow-400/10 border border-yellow-400/30 rounded-xl px-5 py-3 text-yellow-300 font-semibold">
              "{game.prompt}"
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
          onClick={submitAnswers}
          disabled={submitting || !game.fields?.some((_, i) => fieldValues[i]?.trim())}
          className="w-full mt-6 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-gray-900 font-bold py-4 rounded-xl transition-colors"
        >
          {submitting ? 'Submitting...' : 'Submit ✓'}
        </button>
      </div>
    )
  }

  // ── Reveal phase ──────────────────────────────────────────────────────────
  if (phase === 'reveal') {
    const current = submissions[revealIndex]

    return (
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">{game.emoji}</div>
          <h2 className="text-xl font-bold text-white">{game.name}</h2>
          <p className="text-white/40 text-sm mt-1">{revealIndex + 1} of {submissions.length}</p>
        </div>

        {current && (
          <div className="bg-white/10 border border-white/20 rounded-2xl p-6 mb-6">
            {/* Anonymous until reveal */}
            <p className="text-white/50 text-xs uppercase tracking-widest mb-4">Someone said...</p>

            {game.fields?.map((field, i) => (
              <div key={i} className="mb-4">
                <p className="text-white/50 text-xs mb-1">{field.label}</p>
                {/* For Two Truths voting: each field is a clickable option */}
                {game.id === 'two-truths' && !isHost ? (
                  <button
                    onClick={() => voteForLie(current.id, i)}
                    disabled={!!voted}
                    className={`w-full text-left bg-white/5 hover:bg-white/15 border rounded-xl px-4 py-3 text-white transition-colors ${
                      voted === `${current.id}-${i}` ? 'border-yellow-400 bg-yellow-400/10' : 'border-white/20'
                    }`}
                  >
                    {(current.content as Record<string, string>)[`field_${i}`]}
                  </button>
                ) : (
                  <p className="text-white text-lg font-medium bg-white/5 border border-white/20 rounded-xl px-4 py-3">
                    {(current.content as Record<string, string>)[`field_${i}`]}
                  </p>
                )}
              </div>
            ))}

            {game.id === 'two-truths' && !isHost && !voted && (
              <p className="text-yellow-400 text-sm text-center mt-2">👆 Tap the one you think is the lie!</p>
            )}
          </div>
        )}

        {isHost && (
          <div className="flex gap-3">
            {revealIndex > 0 && (
              <button
                onClick={() => setRevealIndex(i => i - 1)}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                ← Previous
              </button>
            )}
            {revealIndex < submissions.length - 1 ? (
              <button
                onClick={() => setRevealIndex(i => i + 1)}
                className="flex-1 bg-purple-500 hover:bg-purple-400 text-white font-bold py-3 rounded-xl transition-colors"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={advancePhase}
                className="flex-1 bg-green-500 hover:bg-green-400 text-white font-bold py-3 rounded-xl transition-colors"
              >
                End game 🎉
              </button>
            )}
          </div>
        )}

        {!isHost && (
          <p className="text-center text-white/40 text-sm">Host is revealing answers on screen</p>
        )}
      </div>
    )
  }

  // ── Ended ─────────────────────────────────────────────────────────────────
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
