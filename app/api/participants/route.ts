import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateRandomName } from '@/lib/names'

// POST /api/participants — join a room
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { roomCode, uuidToken, displayName } = body

    if (!roomCode || !uuidToken) {
      return NextResponse.json({ error: 'roomCode and uuidToken required' }, { status: 400 })
    }

    const supabase = supabaseAdmin()

    // Look up the room
    const { data: room, error: roomErr } = await supabase
      .from('ib_rooms')
      .select('id, status, plan')
      .eq('code', roomCode.toUpperCase())
      .single()

    if (roomErr || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    if (room.status === 'ended') {
      return NextResponse.json({ error: 'This session has ended' }, { status: 410 })
    }

    // Check if participant already joined this room (re-join support)
    const { data: existing } = await supabase
      .from('ib_participants')
      .select('*')
      .eq('room_id', room.id)
      .eq('uuid_token', uuidToken)
      .single()

    if (existing) {
      return NextResponse.json({ participant: existing, room })
    }

    // New participant — pick a name
    const name = displayName || generateRandomName()

    const { data: participant, error: partErr } = await supabase
      .from('ib_participants')
      .insert({
        room_id: room.id,
        display_name: name,
        uuid_token: uuidToken,
        is_host: false,
      })
      .select()
      .single()

    if (partErr) throw partErr

    return NextResponse.json({ participant, room }, { status: 201 })
  } catch (err) {
    console.error('POST /api/participants error:', err)
    return NextResponse.json({ error: 'Failed to join room' }, { status: 500 })
  }
}

// GET /api/participants?roomId=xxx — list all participants in a room
export async function GET(req: NextRequest) {
  const roomId = req.nextUrl.searchParams.get('roomId')
  if (!roomId) return NextResponse.json({ error: 'roomId required' }, { status: 400 })

  const supabase = supabaseAdmin()
  const { data: participants, error } = await supabase
    .from('ib_participants')
    .select('*')
    .eq('room_id', roomId)
    .order('joined_at', { ascending: true })

  if (error) return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })

  return NextResponse.json({ participants })
}
