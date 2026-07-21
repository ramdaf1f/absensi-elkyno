import { redirect } from "next/navigation"
import { AdminHeader } from "@/components/admin-header"
import { AdminSidebar } from "@/components/admin-sidebar"
import { getCurrentUser } from "@/lib/auth"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-muted/30 dark:bg-muted/40">
      <div className="flex min-h-screen flex-col md:flex-row">
      <AdminSidebar user={user} />
        <main className="flex-1 overflow-auto bg-muted/30 p-4 sm:p-5 md:p-6 dark:bg-muted/40">
          <AdminHeader />
          {children}
        </main>
      </div>
    </div>
  )
}