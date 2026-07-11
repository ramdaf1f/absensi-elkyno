import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { listEmployees } from "@/lib/db"
import { AppHeader } from "@/components/app-header"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PlusCircle } from "lucide-react"
import Link from "next/link"
import { EmployeeViewToggle } from "./employee-view-toggle"

export default async function EmployeesPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (user.role !== "admin") redirect("/absen")

  const employees = (await listEmployees()).map((employee) => ({
    id: employee.id,
    name: employee.name,
    email: employee.email,
    position: employee.position,
    phone: employee.phone,
    employee_id: employee.employee_id,
    status: employee.status,
  }))

  return (
    <div className="flex flex-col gap-6">
      <AppHeader user={user} subtitle="Manajemen Karyawan" />

      <div className="flex justify-end">
        <Link href="/admin/employees/new" className={buttonVariants()}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Tambah Karyawan
        </Link>
      </div>

      {employees.length > 0 ? (
        <EmployeeViewToggle employees={employees} />
      ) : (
        <Card className="mt-4">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Belum ada data karyawan. Silakan tambahkan karyawan baru.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
