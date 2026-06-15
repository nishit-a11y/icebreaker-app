import { createClient } from '@supabase/supabase-js'

// Supabase project: eskoops-shared-db (orkouauktvolyrwjxeav)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://orkouauktvolyrwjxeav.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ya291YXVrdHZvbHlyd2p4ZWF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5MDMyMzksImV4cCI6MjA5NTQ3OTIzOX0.dqr9woMtIQ8vOP65GMQRW6lfUWNgj4y8ilCu3T8660I'

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  { realtime: { params: { eventsPerSecond: 10 } } }
)

// Server-side client with service role (for API routes)
export const supabaseAdmin = () =>
  createClient(
    SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder',
    { auth: { persistSession: false } }
  )
