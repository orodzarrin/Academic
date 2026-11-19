import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { unsubKey } from '@/lib/accounts'
import {
  AUTH_READY,
  createSessionToken,
  findUserByEmail,
  newId,
  sessionCookie,
  type StoredUser,
  userIdKey,
  userKey,
} from '@/lib/auth'
import { STORE_READY, setJson } from '@/lib/store'
import { OAUTH_STATE_COOKIE } from '../route'

/*
 * Google sign-in callback: exchange the code for tokens, fetch the profile,
 * then sign the visitor in with the site's own session cookie.
 *
 * The user record is the same one email sign-up creates (lib/auth.ts):
 * an existing account for that email is reused, otherwise one is created
 * with digest emails off. OAuth users have no password — passwordHash is a
 * marker that verifyPassword can never match — so password sign-in stays
 * impossible for the account.
 *
 * Every failure path redirects to /login with an error the page explains in
 * plain language. Nothing here throws when the store or the Google keys are
 * missing: accounts simply are not switched on for this deployment yet.
 */

function loginError(request: Request, error: string) {
  return NextResponse.redirect(new URL(`/login?error=${error}`, request.url))
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const jar = await cookies()
  const expectedState = jar.get(OAUTH_STATE_COOKIE)?.value

  // The state value is one-time: clear it whatever happens next.
  const clearState = (response: NextResponse) => {
    response.cookies.set(OAUTH_STATE_COOKIE, '', { path: '/', maxAge: 0 })
    return response
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    return clearState(loginError(request, 'google_failed'))
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return clearState(loginError(request, 'google_not_configured'))
  }

  if (!STORE_READY || !AUTH_READY) {
    return clearState(loginError(request, 'accounts_not_configured'))
  }

  const redirectUri = new URL('/api/auth/google/callback', request.url).toString()

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
    cache: 'no-store',
  }).catch(() => null)
  if (!tokenResponse?.ok) {
    return clearState(loginError(request, 'google_failed'))
  }
  const tokens = (await tokenResponse.json().catch(() => null)) as {
    access_token?: string
  } | null
  if (!tokens?.access_token) {
    return clearState(loginError(request, 'google_failed'))
  }

  const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
    cache: 'no-store',
  }).catch(() => null)
  if (!profileResponse?.ok) {
    return clearState(loginError(request, 'google_failed'))
  }
  const profile = (await profileResponse.json().catch(() => null)) as {
    email?: string
    email_verified?: boolean
  } | null
  const email = profile?.email?.trim().toLowerCase()
  if (!email || profile?.email_verified === false) {
    return clearState(loginError(request, 'google_no_email'))
  }

  let user = await findUserByEmail(email)
  if (!user) {
    const created: StoredUser = {
      id: newId(),
      email,
      // No password for OAuth accounts: only `scrypt$...` hashes can
      // verify, so this marker can never sign in with a password.
      passwordHash: `oauth$${newId(32)}`,
      createdAt: new Date().toISOString(),
      // Alerts start off: nobody should receive email they did not switch on.
      digestEnabled: false,
      digestFrequency: 'weekly',
      unsubscribeToken: newId(20),
    }
    const saved = await setJson(userKey(created.email), created)
    const indexed = await setJson(userIdKey(created.id), created.email)
    await setJson(unsubKey(created.unsubscribeToken), created.id)
    if (!saved || !indexed) {
      return clearState(loginError(request, 'google_failed'))
    }
    user = created
  }

  const response = NextResponse.redirect(new URL('/account', request.url))
  response.cookies.set(sessionCookie.name, createSessionToken(user.id), sessionCookie.options)
  return clearState(response)
}
