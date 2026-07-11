"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { loginAction, type LoginState } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, LogIn } from "lucide-react"

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      <LogIn className="size-4" />
      {pending ? "Memproses..." : "Masuk"}
    </Button>
  )
}

export function LoginForm() {
  const [state, formAction] = useActionState<LoginState, FormData>(loginAction, {})

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Masuk ke akun Anda</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="nama@perusahaan.com" autoComplete="email" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" placeholder="••••••••" autoComplete="current-password" required />
          </div>

          {state.error ? (
            <p className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              {state.error}
            </p>
          ) : null}

          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  )
}
