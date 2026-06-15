import { createClient } from '@supabase/supabase-js'

// ?? fallbacks ensure next build doesn't throw when env vars are absent;
// real values must be set in Vercel env vars for the app to function.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder',
  { realtime: { params: { eventsPerSecond: 10 } } }
)

// Server-side client with service role (for API routes)
export const supabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder',
    { auth: { persistSession: false } }
  )
