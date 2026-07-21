"use client"
import { useState, useActionState, useMemo } from "react"
import { useFormStatus } from "react-dom" // Import useFormStatus dari react-dom
import { Button } from "@/components/ui/button" // Button tetap diimpor dari ui/button
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { updateEmployee, type EmployeeUpdateState } from "@/lib/actions"
import type { User } from "@/lib/types" // Assuming types are in lib/types.ts
import { AlertCircle, CheckCircle2, LoaderCircle } from "lucide-react"
import { Search } from "lucide-react" // Added Search icon
function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
      {pending ? "Menyimpan..." : "Simpan"}
    </Button>
  )
}

export function EmployeeList({ employees }: { employees: User[] }) {
  const [editing, setEditing] = useState<User | null>(null)
  const [searchTerm, setSearchTerm] = useState<string>("") // State for search term
  const [sortOrder, setSortOrder] = useState<string>("name-asc") // State for sort order
  const [state, formAction] = useActionState<EmployeeUpdateState, FormData>(
    async (_prevState, formData) => {
      if (!editing) return { error: "No employee selected for editing." }
      const result = await updateEmployee(_prevState, editing.id, formData)
      if (result.success) {
        setEditing(null) // Close modal on success
      }
      return result
    },
    {},
  )

  const filteredAndSortedEmployees = useMemo(() => {
    let currentEmployees = [...employees]

    // Filter logic
    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase()
      currentEmployees = currentEmployees.filter(
        (emp) =>
          emp.name.toLowerCase().includes(lowerCaseSearchTerm) ||
          (emp.position && emp.position.toLowerCase().includes(lowerCaseSearchTerm)) ||
          (emp.phone && emp.phone.includes(lowerCaseSearchTerm)) ||
          (emp.employee_id && emp.employee_id.toLowerCase().includes(lowerCaseSearchTerm))
      )
    }

    // Sort logic
    currentEmployees.sort((a, b) => {
      if (sortOrder === "name-asc") {
        return a.name.localeCompare(b.name)
      } else if (sortOrder === "name-desc") {
        return b.name.localeCompare(a.name)
      } else if (sortOrder === "status-active-first") {
        if (a.status === "active" && b.status !== "active") return -1
        if (a.status !== "active" && b.status === "active") return 1
        return a.name.localeCompare(b.name) // Secondary sort by name
      }
      return 0
    })

    return currentEmployees
  }, [employees, searchTerm, sortOrder])

  return (
    <div className="flex flex-col gap-4"> {/* Wrapper for search/sort and grid */}
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative w-full sm:w-auto flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Cari karyawan (nama, jabatan, ID, telp)..."
            className="pl-9 pr-3 py-2 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex-shrink-0 w-full sm:w-auto">
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 w-full"
          >
            <option value="name-asc">Nama (A-Z)</option>
            <option value="name-desc">Nama (Z-A)</option>
            <option value="status-active-first">Status (Aktif dulu)</option>
            {/* <option value="diligence-desc">Paling Rajin</option> */} {/* Placeholder for future */}
            {/* <option value="diligence-asc">Paling Sering Bolos</option> */} {/* Placeholder for future */}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"> {/* Changed to 3 columns */}
        {filteredAndSortedEmployees.length === 0 ? (
          <p className="col-span-full text-center text-muted-foreground">Tidak ada karyawan yang ditemukan.</p>
        ) : (
          filteredAndSortedEmployees.map((emp) => (
            <Card key={emp.id} className={emp.status === 'inactive' ? 'opacity-60' : ''}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex flex-col">
                  <p className="font-bold">{emp.name} {emp.status === 'inactive' ? '(Non-Aktif)' : ''}</p>
                  <p className="text-xs text-muted-foreground">{emp.position || 'Staff'}</p>
                  {emp.employee_id && <p className="text-xs text-muted-foreground">ID: {emp.employee_id}</p>}
                  {emp.phone && <p className="text-xs text-muted-foreground">Telp: {emp.phone}</p>}
                  {emp.salary !== null && emp.salary !== undefined && <p className="text-xs text-muted-foreground">Gaji: Rp{emp.salary.toLocaleString('id-ID')}</p>}
                </div>
                <div>
                  <Button
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditing(emp);
                    }}
                  >
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[9999]">
          <form
            action={formAction}
            className="bg-white p-6 rounded-lg w-full max-w-sm grid gap-4"
          >
            <h2 className="font-bold text-lg">Edit {editing.name}</h2>
            <Input name="name" defaultValue={editing.name ?? ''} placeholder="Nama Lengkap" required />
            <Input name="employee_id" defaultValue={editing.employee_id ?? ''} placeholder="ID Pegawai" />
            <Input name="position" defaultValue={editing.position ?? ''} placeholder="Jabatan" />
            <Input name="department" defaultValue={editing.department ?? ''} placeholder="Departemen" />
            <Input name="phone" defaultValue={editing.phone ?? ''} placeholder="Nomor HP" />
            <Input name="salary" type="number" step="any" defaultValue={editing.salary ?? ''} placeholder="Gaji (contoh: 5000000)" />
            <div className="grid grid-cols-2 gap-2">
              <Input name="checkInWindowStart" type="time" defaultValue={editing.checkInWindowStart ?? '06:00'} aria-label="Mulai absen datang" />
              <Input name="checkInWindowEnd" type="time" defaultValue={editing.checkInWindowEnd ?? '10:00'} aria-label="Akhir absen datang" />
              <Input name="standardCheckInTime" type="time" defaultValue={editing.standardCheckInTime ?? '08:00'} aria-label="Jam masuk standar" />
              <Input name="checkOutWindowStart" type="time" defaultValue={editing.checkOutWindowStart ?? '15:00'} aria-label="Mulai absen pulang" />
              <Input name="checkOutWindowEnd" type="time" defaultValue={editing.checkOutWindowEnd ?? '23:00'} aria-label="Akhir absen pulang" />
            </div>
            <select name="status" defaultValue={editing.status ?? 'active'} className="border p-2 rounded">
              <option value="active">Aktif</option>
              <option value="inactive">Non-Aktif</option>
            </select>
            <div className="flex gap-2">
              <SubmitButton />
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Batal</Button>
            </div>

            {state.error ? (
              <p className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                {state.error}
              </p>
            ) : null}
            {state.success ? (
              <p className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
                <CheckCircle2 className="size-4" />
                {state.success}
              </p>
            ) : null}
          </form>
        </div>
      )}
    </div>
  )
}
