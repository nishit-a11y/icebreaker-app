import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// Lazy — avoid module-level init so next build doesn't throw when env vars are absent
const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!)

async function getSupabaseUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return null

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder'
  )
  const { data: { user } } = await supabase.auth.getUser(token)
  return user
}

export async function POST(req: NextRequest) {
  const user = await getSupabaseUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { plan } = await req.json()

  const priceId = plan === 'pro' ? process.env.STRIPE_PRO_PRICE_ID : process.env.STRIPE_TEAM_PRICE_ID

  if (!priceId) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

  const session = await getStripe().checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${req.nextUrl.origin}/host?upgraded=1`,
    cancel_url: `${req.nextUrl.origin}/pricing`,
    customer_email: user.email,
    metadata: { supabaseUserId: user.id },
    subscription_data: {
      metadata: { supabaseUserId: user.id },
    },
  })

  return NextResponse.json({ url: session.url })
}
