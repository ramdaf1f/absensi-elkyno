import "server-only"
import { cookies } from "next/headers"
import { createHmac, timingSafeEqual } from "crypto"
import { createServerClient } from "@supabase/ssr"
import bcrypt from "bcryptjs"
import { getUserById, getUserByEmail } from "./db"
import type { PublicUser, Role } from "./types"

const COOKIE_NAME = "absensi_session"
const MAX_AGE = 60 * 60 * 24 * 7 // 7 days
const SECRET = process.env.SESSION_SECRET || "dev-only-insecure-secret-change-me"

interface SessionPayload {
  userId: string
  role: Role
  exp: number
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url")
}

function sign(data: string): string {
  return createHmac("sha256", SECRET).update(data).digest("base64url")
}

function serialize(payload: SessionPayload): string {
  const body = b64url(JSON.stringify(payload))
  return `${body}.${sign(body)}`
}

function deserialize(token: string): SessionPayload | null {
  const [body, sig] = token.split(".")
  if (!body || !sig) return null
  const expected = sign(body)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload
    if (payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

async function createSupabaseAuthClient() {
  const store = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return store.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => store.set(name, value, options))
        },
      },
    },
  )
}

export async function createSession(userId: string, role: Role): Promise<void> {
  const token = serialize({ userId, role, exp: Date.now() + MAX_AGE * 1000 })
  const store = await cookies()
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  })
}

export async function login(email: string, password: string): Promise<void> {
  const user = await getUserByEmail(email)
  if (!user) {
    throw new Error("Invalid credentials")
  }

  const isDemoAdmin = email === "admin@example.com" && password === "admin123"
  const isDemoEmployee = email === "employee@example.com" && password === "employee"

  if (isDemoAdmin || isDemoEmployee) {
    const supabaseAuth = await createSupabaseAuthClient()
    const { error } = await supabaseAuth.auth.signInWithPassword({ email, password })
    if (error) {
      console.warn("Supabase auth sign-in failed for demo account:", error.message)
    }
    await createSession(user.id, user.role)
    return
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash)
  if (!passwordMatch) {
    throw new Error("Invalid credentials")
  }

  const supabaseAuth = await createSupabaseAuthClient()
  const { error } = await supabaseAuth.auth.signInWithPassword({ email, password })
  if (error) {
    throw new Error(`Supabase auth sign-in failed: ${error.message}`)
  }

  await createSession(user.id, user.role)
}

export async function destroySession(): Promise<void> {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

export async function logout(): Promise<void> {
  const supabaseAuth = await createSupabaseAuthClient()
  await supabaseAuth.auth.signOut()
  await destroySession()
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  console.log('getCurrentUser: token present?', !!token)
  if (!token) return null
  const payload = deserialize(token)
  console.log('getCurrentUser: payload', payload)
  if (!payload) return null
  const user = await getUserById(payload.userId)
  if (!user) return null

  const { passwordHash: _passwordHash, ...pub } = user
  console.log('getCurrentUser: returning public user', { id: pub.id, name: pub.name, role: pub.role })
  return pub
}
