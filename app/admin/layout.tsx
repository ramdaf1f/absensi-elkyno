import { AdminHeader } from "@/components/admin-header"
import { AdminSidebar } from "@/components/admin-sidebar"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30 dark:bg-muted/40">
      <div className="flex min-h-screen flex-col md:flex-row">
        <AdminSidebar />
        <main className="flex-1 overflow-auto bg-muted/30 p-4 sm:p-5 md:p-6 dark:bg-muted/40">
          <AdminHeader />
          {children}
        </main>
      </div>
    </div>
  )
}