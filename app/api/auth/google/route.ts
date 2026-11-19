import { NextResponse } from 'next/server'
import { newId } from '@/lib/auth'

/*
 * Start Google sign-in (OAuth 2.0 authorization code flow).
 *
 * Sends the visitor to Google's authorization page. The redirect URI is
 * built from this request's own origin, so it matches the callback route
 * below and the URI registered in Google Cloud exactly.
 *
 * No keys, no Google: without GOOGLE_CLIENT_ID the button in the profile
 * menu still has to do something honest, so it redirects back to /login
 * with an error the page explains instead of pretending a sign-in happened.
 */

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
export const OAUTH_STATE_COOKIE = 'sja_oauth_state'

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return NextResponse.redirect(new URL('/login?error=google_not_configured', request.url))
  }

  const redirectUri = new URL('/api/auth/google/callback', request.url).toString()
  const state = newId()
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  })

  const response = NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params}`)
  response.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600,
  })
  return response
}
