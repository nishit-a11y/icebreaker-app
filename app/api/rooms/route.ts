import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateRoomCode } from '@/lib/names'

// POST /api/rooms — create a new room (host only, Clerk user)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { hostId, plan = 'free' } = body

    if (!hostId) {
      return NextResponse.json({ error: 'hostId required' }, { status: 400 })
    }

    const supabase = supabaseAdmin()

    // Generate unique code (retry if collision)
    let code = generateRoomCode()
    let attempts = 0
    while (attempts < 10) {
      const { data: existing } = await supabase
        .from('ib_rooms')
        .select('id')
        .eq('code', code)
        .single()
      if (!existing) break
      code = generateRoomCode()
      attempts++
    }

    const { data: room, error } = await supabase
      .from('ib_rooms')
      .insert({ code, host_id: hostId, plan, status: 'waiting' })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ room }, { status: 201 })
  } catch (err) {
    console.error('POST /api/rooms error:', err)
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 })
  }
}

// GET /api/rooms?code=WOLF-42 — fetch room by code
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 })

  const supabase = supabaseAdmin()
  const { data: room, error } = await supabase
    .from('ib_rooms')
    .select('*')
    .eq('code', code.toUpperCase())
    .single()

  if (error || !room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }

  return NextResponse.json({ room })
}
