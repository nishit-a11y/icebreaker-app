'use client'

/**
 * Round Robin Engine
 * Used by: Hot Seat, Recommendation Round
 *
 * Each participant takes a turn "on stage."
 * For Hot Seat: team submits questions → subject picks one → answers
 * For Recommendation Round: each person shares their pick
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
  participants: Participant[]
  roomId: string
}

export default function RoundRobinEngine({ session, game, participant, isHost, participants, roomId }: Props) {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [mySubmission, setMySubmission] = useState<Submission | null>(null)

  const players = participants.filter(p => !p.is_host)
  const currentSubjectId = session.current_subject_id
  const currentSubject = players.find(p => p.id === currentSubjectId) || players[0]
  const isMyTurn = currentSubject?.id === participant.id
  const currentPlayerIndex = players.findIndex(p => p.id === currentSubject?.id)

  useEffect(() => {
    const fetchSubs = async () => {
      const { data } = await supabase
        .from('ib_submissions')
        .select('*')
        .eq('game_session_id', session.id)
        .eq('round_number', session.round_number)
      if (data) {
        setSubmissions(data)
        const mine = data.find(s => s.participant_id === participant.id)
        if (mine) setMySubmission(mine)
      }
    }
    fetchSubs()

    const channel = supabase
      .channel(`rr-${session.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ib_submissions', filter: `game_session_id=eq.${session.id}` }, fetchSubs)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [session.id, session.round_number, participant.id])

  async function submitResponse() {
    if (!game.fields?.some((_, i) => fieldValues[i])) return
    setSubmitting(true)
    const content: Record<string, string> = {}
    game.fields?.forEach((f, i) => { content[`field_${i}`] = fieldValues[i] || '' })

    const { data } = await supabase.from('ib_submissions').insert({
      game_session_id: session.id,
      participant_id: participant.id,
      content,
      round_number: session.round_number,
    }).select().single()
    if (data) setMySubmission(data)
    setFieldValues({})
    setSubmitting(false)
  }

  async function nextPerson() {
    const nextIndex = currentPlayerIndex + 1
    if (nextIndex >= players.length) {
      // All done
      await supabase.from('ib_game_sessions').update({ phase: 'ended' }).eq('id', session.id)
      await supabase.from('ib_rooms').update({ status: 'waiting', current_game_id: null }).eq('id', roomId)
    } else {
      await supabase.from('ib_game_sessions').update({
        current_subject_id: players[nextIndex].id,
        round_number: session.round_number + 1,
      }).eq('id', session.id)
      setMySubmission(null)
      setSubmissions([])
    }
  }

  const phase = session.phase

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {players.map((p, i) => (
          <div key={p.id} className={`flex-shrink-0 flex flex-col items-center gap-1`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              p.id === currentSubject?.id ? 'bg-purple-500 text-white scale-110 ring-2 ring-purple-300' :
              i < currentPlayerIndex ? 'bg-green-500/30 text-green-300' : 'bg-white/10 text-white/50'
            }`}>
              {i < currentPlayerIndex ? '✓' : p.display_name[0]}
            </div>
            <span className="text-white/40 text-[10px] truncate max-w-[3rem]">{p.display_name.split(' ')[0]}</span>
          </div>
        ))}
      </div>

      {/* Current person spotlight */}
      <div className="text-center mb-8">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-3 shadow-lg ${
          isMyTurn ? 'bg-gradient-to-br from-yellow-400 to-orange-400 shadow-yellow-400/30' : 'bg-gradient-to-br from-purple-400 to-pink-400 shadow-purple-400/30'
        }`}>
          {currentSubject?.display_name[0]}
        </div>
        <h2 className="text-2xl font-bold text-white">{currentSubject?.display_name}</h2>
        {isMyTurn && <p className="text-yellow-400 font-semibold text-sm mt-1">That's you! 🎤</p>}
      </div>

      {/* Hot Seat: others submit questions, subject picks */}
      {game.id === 'hot-seat' && (
        <div>
          {/* Non-subject non-host players submit questions */}
          {!isMyTurn && !isHost && !mySubmission && (
            <div>
              <p className="text-white/60 text-sm text-center mb-4">Submit a question for {currentSubject?.display_name}</p>
              <textarea
                value={fieldValues[0] || ''}
                onChange={e => setFieldValues({ 0: e.target.value })}
                placeholder="Ask them anything..."
                rows={3}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-yellow-300 resize-none"
              />
              <button
                onClick={submitResponse}
                disabled={submitting || !fieldValues[0]?.trim()}
                className="w-full mt-3 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-gray-900 font-bold py-3 rounded-xl transition-colors"
              >
                Submit question
              </button>
            </div>
          )}

          {!isMyTurn && !isHost && mySubmission && (
            <p className="text-center text-white/60">Question submitted! Waiting for {currentSubject?.display_name} to pick one...</p>
          )}

          {isMyTurn && (
            <div>
              <p className="text-white/60 text-sm text-center mb-4">Pick a question to answer ({submissions.length} submitted)</p>
              {submissions.length === 0 ? (
                <p className="text-center text-white/40">Waiting for questions...</p>
              ) : (
                <div className="space-y-3">
                  {submissions.map(sub => (
                    <div key={sub.id} className="bg-white/10 border border-white/20 rounded-xl px-4 py-3">
                      <p className="text-white">{(sub.content as Record<string,string>).field_0}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Host view: observe + advance */}
          {isHost && (
            <div>
              <p className="text-white/60 text-sm text-center mb-4">
                {submissions.length} question{submissions.length !== 1 ? 's' : ''} submitted for {currentSubject?.display_name}
              </p>
              {submissions.length > 0 && (
                <div className="space-y-2 mb-4">
                  {submissions.map(sub => (
                    <div key={sub.id} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                      <p className="text-white/70 text-sm">{(sub.content as Record<string,string>).field_0}</p>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={nextPerson}
                disabled={submissions.length === 0}
                className="w-full mt-2 bg-purple-500 hover:bg-purple-400 disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-colors"
              >
                {currentPlayerIndex >= players.length - 1 ? 'End game 🎉' : 'Next person →'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Recommendation Round */}
      {game.id === 'recommendation-round' && (
        <div>
          {isMyTurn && !mySubmission && (
            <div>
              <p className="text-yellow-400 font-semibold text-sm text-center mb-4">It's your turn to share a recommendation!</p>
              <div className="space-y-3">
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
                onClick={submitResponse}
                disabled={submitting || !game.fields?.some((_, i) => fieldValues[i]?.trim())}
                className="w-full mt-4 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-gray-900 font-bold py-4 rounded-xl transition-colors"
              >
                Share recommendation ✓
              </button>
            </div>
          )}

          {isMyTurn && mySubmission && (
            <div className="text-center">
              <p className="text-white/60 mb-4">Shared! The host will advance to the next person.</p>
              <div className="bg-white/10 border border-white/20 rounded-xl p-4 text-left">
                {game.fields?.map((field, i) => (
                  <div key={i} className="mb-2">
                    <p className="text-white/50 text-xs">{field.label}</p>
                    <p className="text-white">{(mySubmission.content as Record<string,string>)[`field_${i}`]}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isMyTurn && (
            <div className="text-center">
              {mySubmission ? (
                <div className="bg-white/10 border border-white/20 rounded-xl p-4 mb-4 text-left">
                  <p className="text-white/40 text-xs mb-2">You shared:</p>
                  {game.fields?.map((field, i) => (
                    <div key={i} className="mb-2">
                      <p className="text-white/50 text-xs">{field.label}</p>
                      <p className="text-white">{(mySubmission.content as Record<string,string>)[`field_${i}`]}</p>
                    </div>
                  ))}
                </div>
              ) : null}
              <p className="text-white/60 text-sm">Listening to {currentSubject?.display_name}...</p>
            </div>
          )}

          {/* Host controls */}
          {isHost && submissions.some(s => s.participant_id === currentSubject?.id) && (
            <button onClick={nextPerson} className="w-full mt-4 bg-purple-500 hover:bg-purple-400 text-white font-bold py-3 rounded-xl transition-colors">
              {currentPlayerIndex >= players.length - 1 ? 'End game 🎉' : `Next: ${players[currentPlayerIndex + 1]?.display_name} →`}
            </button>
          )}
          {isHost && !submissions.some(s => s.participant_id === currentSubject?.id) && (
            <p className="text-center text-white/40 text-sm mt-4">Waiting for {currentSubject?.display_name} to share...</p>
          )}
        </div>
      )}
    </div>
  )
}
