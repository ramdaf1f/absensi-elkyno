import "server-only"
import { cookies } from "next/headers"
import { createHmac, timingSafeEqual } from "crypto"
import { getUserById } from "./db"
import { getUserByEmail } from "./db" // Import getUserByEmail
import type { PublicUser, Role } from "./types"
import bcrypt from "bcryptjs" // Import bcryptjs

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
  const passwordMatch = await bcrypt.compare(password, user.passwordHash)
  if (!passwordMatch) {
    throw new Error("Invalid credentials")
  }
  await createSession(user.id, user.role)
}

export async function destroySession(): Promise<void> {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

export async function logout(): Promise<void> {
  await destroySession()
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  if (!token) return null
  const payload = deserialize(token)
  if (!payload) return null
  const user = await getUserById(payload.userId)
  if (!user) return null
  const { passwordHash: _passwordHash, ...pub } = user
  return pub
}
