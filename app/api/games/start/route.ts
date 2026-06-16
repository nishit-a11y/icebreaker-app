import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getGame } from '@/lib/games'
import { WYR_QUESTIONS, THIS_OR_THAT, FINISH_THE_SENTENCE_PROMPTS, WHO_IN_THE_ROOM_PROMPTS } from '@/lib/questions'

const BANK_SIZES: Record<string, number> = {
  'wyr': WYR_QUESTIONS.length,
  'this-or-that': THIS_OR_THAT.length,
  'finish-sentence': FINISH_THE_SENTENCE_PROMPTS.length,
  'who-in-the-room': WHO_IN_THE_ROOM_PROMPTS.length,
}

// POST /api/games/start — host starts a game session
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { roomId, gameId, hostId } = body

    if (!roomId || !gameId || !hostId) {
      return NextResponse.json({ error: 'roomId, gameId, hostId required' }, { status: 400 })
    }

    const game = getGame(gameId)
    if (!game) {
      return NextResponse.json({ error: 'Unknown game' }, { status: 400 })
    }

    const supabase = supabaseAdmin()

    // Verify room exists and host owns it
    const { data: room, error: roomErr } = await supabase
      .from('ib_rooms')
      .select('*')
      .eq('id', roomId)
      .eq('host_id', hostId)
      .single()

    if (roomErr || !room) {
      return NextResponse.json({ error: 'Room not found or unauthorized' }, { status: 403 })
    }

    // Create game session
    const { data: gameSession, error: gsErr } = await supabase
      .from('ib_game_sessions')
      .insert({
        room_id: roomId,
        game_id: gameId,
        engine: game.engine,
        phase: 'submitting',
        round_number: 1,
        config: {
          name: game.name,
          prompt: game.prompt,
          timerSeconds: game.timerSeconds,
          rounds: game.rounds,
          fields: game.fields,
          // Random start index for question banks — all clients use same index
          promptStartIndex: game.questionBank
            ? Math.floor(Math.random() * (BANK_SIZES[game.questionBank] ?? 30))
            : 0,
          scores: {},
          phaseStartedAt: new Date().toISOString(),
        },
      })
      .select()
      .single()

    if (gsErr) throw gsErr

    // Update room to active and point to this game session
    const { error: updateErr } = await supabase
      .from('ib_rooms')
      .update({
        status: 'active',
        current_game_id: gameSession.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', roomId)

    if (updateErr) throw updateErr

    return NextResponse.json({ gameSession }, { status: 201 })
  } catch (err) {
    console.error('POST /api/games/start error:', err)
    return NextResponse.json({ error: 'Failed to start game' }, { status: 500 })
  }
}
