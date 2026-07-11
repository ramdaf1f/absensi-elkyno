import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { getOfficeSettings } from "@/lib/db"
import { OfficeSettingsForm } from "@/components/office-settings-form"
import { AppHeader } from "@/components/app-header"
import { HolidayManager } from "@/components/holiday-manager"

export default async function SettingsPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (user.role !== "admin") redirect("/absen")

  const office = await getOfficeSettings()

  return (
    <div className="flex flex-col gap-6">
      <AppHeader user={user} subtitle="Pengaturan Kantor" />
      <div className="grid lg:grid-cols-2 gap-6">
        <OfficeSettingsForm office={office} />
        <HolidayManager />
      </div>
    </div>
  )
}

