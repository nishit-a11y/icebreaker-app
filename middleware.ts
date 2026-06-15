/**
 * Middleware — passthrough while Clerk credentials aren't configured.
 *
 * Once you've set CLERK_SECRET_KEY and NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY in
 * Vercel environment variables, replace this file with:
 *
 *   import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
 *   const isHostRoute = createRouteMatcher(['/host(.*)', '/admin(.*)'])
 *   export default clerkMiddleware(async (auth, req) => {
 *     if (isHostRoute(req)) { await auth.protect() }
 *   })
 *   export const config = { matcher: ['/((?!_next|...).*)','/(api|trpc)(.*)'] }
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default function middleware(_req: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
