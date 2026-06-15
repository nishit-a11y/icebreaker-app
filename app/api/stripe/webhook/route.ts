import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase'

// Lazy — avoid module-level init so next build doesn't throw when env vars are absent
const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!)

// Map Stripe price IDs to plan names
function planFromPriceId(priceId: string): 'free' | 'team' | 'pro' {
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return 'pro'
  if (priceId === process.env.STRIPE_TEAM_PRICE_ID) return 'team'
  return 'free'
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const db = supabaseAdmin()

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const customerId = sub.customer as string
      const priceId = sub.items.data[0]?.price.id
      const plan = planFromPriceId(priceId)
      const isActive = sub.status === 'active' || sub.status === 'trialing'

      // Find Supabase user by Stripe customer ID (stored in user_metadata)
      const supabaseUserId = sub.metadata?.supabaseUserId
      if (supabaseUserId) {
        await db.auth.admin.updateUserById(supabaseUserId, {
          user_metadata: {
            plan: isActive ? plan : 'free',
            stripeSubscriptionId: sub.id,
            stripeCustomerId: customerId,
          },
        })
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const customerId = sub.customer as string
      const supabaseUserId = sub.metadata?.supabaseUserId

      if (supabaseUserId) {
        await db.auth.admin.updateUserById(supabaseUserId, {
          user_metadata: { plan: 'free', stripeCustomerId: customerId },
        })
        // Downgrade any active rooms to free
        await db.from('ib_rooms').update({ plan: 'free' }).eq('host_id', supabaseUserId).eq('status', 'waiting')
      }
      break
    }

    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const supabaseUserId = session.metadata?.supabaseUserId
      const customerId = session.customer as string

      if (supabaseUserId && customerId) {
        await db.auth.admin.updateUserById(supabaseUserId, {
          user_metadata: {
            stripeCustomerId: customerId,
          },
        })
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
