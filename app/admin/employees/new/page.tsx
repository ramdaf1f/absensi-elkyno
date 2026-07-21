import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { AppHeader } from "@/components/app-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AddEmployeeForm } from "../add-employee-form"

export default async function NewEmployeePage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (user.role !== "admin" && user.role !== "superadmin") redirect("/absen")

  return (
    <div className="flex flex-col gap-6">
      <AppHeader user={user} showBrand={false} />

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Data Karyawan Baru</CardTitle>
          <CardDescription>Lengkapi informasi akun dan profil karyawan.</CardDescription>
        </CardHeader>
        <CardContent>
          <AddEmployeeForm />
        </CardContent>
      </Card>
    </div>
  )
}
