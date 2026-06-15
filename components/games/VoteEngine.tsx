'use client'

/**
 * Vote Engine
 * Used by: Would You Rather, GIF Battle
 *
 * Phases: submitting → voting → reveal → ended
 * For WYR: pre-loaded questions, everyone votes simultaneously
 * For GIF Battle: participants submit a GIF URL, everyone votes for best
 */

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { GameSession, Submission, Participant } from '@/types'
import type { GameConfig } from '@/lib/games'

// Would You Rather questions bank
const WYR_QUESTIONS = [
  { a: 'Always be 10 minutes late', b: 'Always be 20 minutes early' },
  { a: 'Work from a beach with slow internet', b: 'Work from a windowless office with blazing fast internet' },
  { a: 'Never use social media again', b: 'Give up coffee/tea forever' },
  { a: 'Know when you\'ll die', b: 'Know how you\'ll die' },
  { a: 'Have a rewind button for your life', b: 'Have a pause button for your life' },
  { a: 'Only be able to whisper', b: 'Only be able to shout' },
  { a: 'Live in a world without music', b: 'Live in a world without movies' },
  { a: 'Have unlimited money but no free time', b: 'Have unlimited free time but barely enough money' },
  { a: 'Know all languages', b: 'Play all instruments' },
  { a: 'Travel to the past', b: 'Travel to the future' },
]

interface Props {
  session: GameSession
  game: GameConfig
  participant: Participant
  isHost: boolean
  roomId: string
}

export default function VoteEngine({ session, game, participant, isHost, roomId }: Props) {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [myVote, setMyVote] = useState<string | null>(null)
  const [gifUrl, setGifUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [mySubmission, setMySubmission] = useState<Submission | null>(null)

  const round = session.round_number
  const totalRounds = game.rounds || 5
  const wyrQ = WYR_QUESTIONS[(round - 1) % WYR_QUESTIONS.length]

  useEffect(() => {
    const fetchSubs = async () => {
      const { data } = await supabase
        .from('ib_submissions')
        .select('*')
        .eq('game_session_id', session.id)
        .eq('round_number', round)
      if (data) {
        setSubmissions(data)
        const mine = data.find(s => s.participant_id === participant.id)
        if (mine) {
          setMySubmission(mine)
          if (mine.votes?.length) setMyVote(mine.content.choice as string)
        }
      }
    }
    fetchSubs()

    const channel = supabase
      .channel(`vote-${session.id}-${round}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ib_submissions', filter: `game_session_id=eq.${session.id}` }, () => {
        fetchSubs()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [session.id, round, participant.id])

  async function vote(choice: string) {
    if (myVote) return
    setMyVote(choice)
    await supabase.from('ib_submissions').insert({
      game_session_id: session.id,
      participant_id: participant.id,
      content: { choice },
      round_number: round,
    })
  }

  async function submitGif() {
    if (!gifUrl.trim() || mySubmission) return
    setSubmitting(true)
    const { data } = await supabase.from('ib_submissions').insert({
      game_session_id: session.id,
      participant_id: participant.id,
      content: { gif_url: gifUrl.trim() },
      round_number: round,
    }).select().single()
    if (data) setMySubmission(data)
    setSubmitting(false)
  }

  async function voteForGif(submissionId: string) {
    if (myVote === submissionId) return
    setMyVote(submissionId)
    // Add participant id to votes array
    const sub = submissions.find(s => s.id === submissionId)
    const newVotes = [...(sub?.votes || []), participant.id]
    await supabase.from('ib_submissions').update({ votes: newVotes }).eq('id', submissionId)
  }

  async function nextRound() {
    if (round >= totalRounds) {
      await supabase.from('ib_game_sessions').update({ phase: 'ended' }).eq('id', session.id)
      await supabase.from('ib_rooms').update({ status: 'waiting', current_game_id: null }).eq('id', roomId)
    } else {
      await supabase.from('ib_game_sessions').update({
        round_number: round + 1,
        phase: 'submitting',
      }).eq('id', session.id)
    }
  }

  async function advanceToVoting() {
    await supabase.from('ib_game_sessions').update({ phase: 'voting' }).eq('id', session.id)
  }

  async function advanceToReveal() {
    await supabase.from('ib_game_sessions').update({ phase: 'reveal' }).eq('id', session.id)
  }

  const voteCountA = submissions.filter(s => (s.content as Record<string,string>).choice === 'A').length
  const voteCountB = submissions.filter(s => (s.content as Record<string,string>).choice === 'B').length
  const totalVotes = voteCountA + voteCountB

  // ── Would You Rather ────────────────────────────────────────────────────
  if (game.id === 'would-you-rather') {
    const phase = session.phase

    return (
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="text-center mb-6">
          <div className="text-3xl mb-1">{game.emoji}</div>
          <h2 className="text-lg font-bold text-white">{game.name}</h2>
          <p className="text-white/40 text-sm">Round {round} of {totalRounds}</p>
        </div>

        <div className="bg-white/10 border border-white/20 rounded-2xl p-2 mb-6">
          <p className="text-center text-white/60 text-sm py-2">Would you rather...</p>
          <div className="grid grid-cols-2 gap-2">
            {['A', 'B'].map((opt, i) => {
              const text = i === 0 ? wyrQ.a : wyrQ.b
              const count = i === 0 ? voteCountA : voteCountB
              const pct = totalVotes ? Math.round((count / totalVotes) * 100) : 0
              const chosen = myVote === opt

              return (
                <button
                  key={opt}
                  onClick={() => !myVote && !isHost && vote(opt)}
                  disabled={!!myVote || isHost || phase === 'reveal'}
                  className={`relative rounded-xl p-5 text-center transition-all ${
                    chosen ? 'bg-purple-500 border-purple-400 border' :
                    myVote || phase === 'reveal' ? 'bg-white/5 border border-white/10' :
                    'bg-white/5 border border-white/10 hover:bg-white/15 hover:border-white/30 cursor-pointer'
                  }`}
                >
                  <div className="font-bold text-xs text-white/50 mb-2">{opt}</div>
                  <p className="text-white font-medium text-sm leading-snug">{text}</p>
                  {(myVote || phase === 'reveal') && (
                    <div className="mt-3">
                      <div className="text-2xl font-black text-white">{pct}%</div>
                      <div className="text-white/40 text-xs">{count} vote{count !== 1 ? 's' : ''}</div>
                      <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {!isHost && !myVote && phase !== 'reveal' && (
          <p className="text-center text-white/40 text-sm">Tap your choice</p>
        )}
        {!isHost && myVote && (
          <p className="text-center text-white/60 text-sm">Voted! Waiting for results...</p>
        )}

        {isHost && (
          <div className="flex gap-3">
            {phase === 'submitting' && (
              <button onClick={advanceToReveal} className="flex-1 bg-purple-500 hover:bg-purple-400 text-white font-bold py-3 rounded-xl transition-colors">
                Show results →
              </button>
            )}
            {phase === 'reveal' && (
              <button onClick={nextRound} className="flex-1 bg-purple-500 hover:bg-purple-400 text-white font-bold py-3 rounded-xl transition-colors">
                {round >= totalRounds ? 'End game 🎉' : `Next round →`}
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── GIF Battle ───────────────────────────────────────────────────────────
  const phase = session.phase

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="text-center mb-6">
        <div className="text-3xl mb-1">{game.emoji}</div>
        <h2 className="text-lg font-bold text-white">{game.name}</h2>
        <p className="text-white/60 text-sm mt-1">Find the best GIF for the prompt</p>
      </div>

      {/* GIF Submission phase */}
      {phase === 'submitting' && !isHost && !mySubmission && (
        <div className="space-y-4">
          <p className="text-center text-yellow-300 font-semibold">Find a GIF on Giphy and paste the URL here</p>
          <input
            type="url"
            value={gifUrl}
            onChange={e => setGifUrl(e.target.value)}
            placeholder="https://media.giphy.com/..."
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-yellow-300"
          />
          <button onClick={submitGif} disabled={submitting || !gifUrl.trim()} className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-gray-900 font-bold py-4 rounded-xl transition-colors">
            {submitting ? 'Submitting...' : 'Submit GIF ✓'}
          </button>
        </div>
      )}

      {phase === 'submitting' && !isHost && mySubmission && (
        <div className="text-center">
          <p className="text-white/60 mb-4">Your GIF is in! Waiting for others...</p>
          <img src={(mySubmission.content as Record<string,string>).gif_url} alt="Your GIF" className="max-h-40 mx-auto rounded-xl" />
        </div>
      )}

      {phase === 'submitting' && isHost && (
        <div className="text-center">
          <p className="text-white/60 mb-2">{submissions.length} GIFs submitted</p>
          <button onClick={advanceToVoting} disabled={submissions.length === 0} className="bg-purple-500 hover:bg-purple-400 disabled:opacity-40 text-white font-bold px-8 py-3 rounded-xl transition-colors">
            Start voting →
          </button>
        </div>
      )}

      {/* Voting phase */}
      {phase === 'voting' && (
        <div>
          <p className="text-center text-white/60 text-sm mb-4">Vote for the best GIF!</p>
          <div className="grid grid-cols-2 gap-3">
            {submissions.map(sub => (
              <button
                key={sub.id}
                onClick={() => !isHost && voteForGif(sub.id)}
                disabled={isHost}
                className={`rounded-xl overflow-hidden border-2 transition-all ${
                  myVote === sub.id ? 'border-yellow-400 scale-95' : 'border-transparent hover:border-white/40'
                }`}
              >
                <img src={(sub.content as Record<string,string>).gif_url} alt="GIF" className="w-full h-32 object-cover" />
              </button>
            ))}
          </div>
          {isHost && (
            <button onClick={advanceToReveal} className="w-full mt-4 bg-purple-500 hover:bg-purple-400 text-white font-bold py-3 rounded-xl transition-colors">
              Show winner →
            </button>
          )}
        </div>
      )}

      {/* Reveal */}
      {phase === 'reveal' && (
        <div>
          <p className="text-center text-yellow-300 font-bold text-lg mb-4">🏆 Results</p>
          <div className="space-y-3">
            {submissions
              .sort((a, b) => (b.votes?.length || 0) - (a.votes?.length || 0))
              .map((sub, i) => (
                <div key={sub.id} className={`flex items-center gap-3 rounded-xl p-3 border ${i === 0 ? 'border-yellow-400 bg-yellow-400/10' : 'border-white/10 bg-white/5'}`}>
                  <span className="text-xl">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                  <img src={(sub.content as Record<string,string>).gif_url} alt="" className="w-16 h-12 object-cover rounded-lg" />
                  <span className="text-white/60 text-sm">{sub.votes?.length || 0} votes</span>
                </div>
              ))}
          </div>
          {isHost && (
            <button onClick={nextRound} className="w-full mt-4 bg-green-500 hover:bg-green-400 text-white font-bold py-3 rounded-xl transition-colors">
              End game 🎉
            </button>
          )}
        </div>
      )}
    </div>
  )
}
