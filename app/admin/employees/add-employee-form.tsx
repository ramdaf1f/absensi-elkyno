"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { createEmployeeAction, type EmployeeCreateState } from "@/lib/actions"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, LoaderCircle } from "lucide-react"
import Link from "next/link"

const initialState: EmployeeCreateState = {}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending && <LoaderCircle className="mr-2 size-4 animate-spin" />}
      {pending ? "Menyimpan..." : "Simpan Karyawan"}
    </Button>
  )
}

export function AddEmployeeForm() {
  const [state, formAction] = useActionState(createEmployeeAction, initialState)

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Nama Lengkap</Label>
          <Input id="name" name="name" placeholder="cth: John Doe" required />
          {state?.errors?.name && <p className="text-sm text-destructive">{state.errors.name[0]}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="cth: john.doe@example.com" required />
          {state?.errors?.email && <p className="text-sm text-destructive">{state.errors.email[0]}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" required />
        {state?.errors?.password && <p className="text-sm text-destructive">{state.errors.password[0]}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="employee_id">ID Karyawan (Opsional)</Label>
          <Input id="employee_id" name="employee_id" placeholder="cth: EMP001" />
          {state?.errors?.employee_id && <p className="text-sm text-destructive">{state.errors.employee_id[0]}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="position">Posisi (Opsional)</Label>
          <Input id="position" name="position" placeholder="cth: Software Engineer" />
          {state?.errors?.position && <p className="text-sm text-destructive">{state.errors.position[0]}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="department">Departemen (Opsional)</Label>
        <Input id="department" name="department" placeholder="cth: Operasional / HR / Finance" />
        {state?.errors?.department && <p className="text-sm text-destructive">{state.errors.department[0]}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">No. Telepon (Opsional)</Label>
          <Input id="phone" name="phone" type="tel" placeholder="cth: 08123456789" />
          {state?.errors?.phone && <p className="text-sm text-destructive">{state.errors.phone[0]}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="salary">Gaji (Opsional)</Label>
          <Input id="salary" name="salary" type="number" placeholder="cth: 5000000" />
          {state?.errors?.salary && <p className="text-sm text-destructive">{state.errors.salary[0]}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select name="status" defaultValue="active">
          <SelectTrigger>
            <SelectValue placeholder="Pilih status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="inactive">Tidak Aktif</SelectItem>
          </SelectContent>
        </Select>
        {state?.errors?.status && <p className="text-sm text-destructive">{state.errors.status[0]}</p>}
      </div>

      <div className="rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold">Window Absensi Personal</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Dipakai server untuk menentukan kapan tombol dan submit absen boleh aktif.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="checkInWindowStart">Mulai Absen Datang</Label>
            <Input id="checkInWindowStart" name="checkInWindowStart" type="time" defaultValue="06:00" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="checkInWindowEnd">Akhir Absen Datang</Label>
            <Input id="checkInWindowEnd" name="checkInWindowEnd" type="time" defaultValue="10:00" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="standardCheckInTime">Jam Masuk Standar</Label>
            <Input id="standardCheckInTime" name="standardCheckInTime" type="time" defaultValue="08:00" required />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="checkOutWindowStart">Mulai Absen Pulang</Label>
                <Input id="checkOutWindowStart" name="checkOutWindowStart" type="time" defaultValue="15:00" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkOutWindowEnd">Akhir Absen Pulang</Label>
                <Input id="checkOutWindowEnd" name="checkOutWindowEnd" type="time" defaultValue="23:00" required />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
        <Link href="/admin/employees" className={buttonVariants({ variant: "outline", className: "w-full sm:w-auto" })}>Batal</Link>
        <SubmitButton />
      </div>
    </form>
  )
}


