
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getOfficeSettings, getHolidays } from "@/lib/db";
import { AppHeader } from "@/components/app-header";
import { OfficeSettingsForm } from "@/components/office-settings-form";
import { HolidayManager } from "@/components/holiday-manager";

export default async function AdminSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin" && user.role !== "superadmin") redirect("/absen");

  let officeSettings, holidays;
  try {
    [officeSettings, holidays] = await Promise.all([
      getOfficeSettings(),
      getHolidays(),
    ]);
  } catch (error) {
    console.error("Failed to fetch office settings or holidays for admin page:", error);
    redirect("/login?error=settings_fetch_failed");
  }

  return (
    <div className="flex flex-col gap-6">
      {/* <AppHeader user={user} showBrand={false} /> */}
      <div className="grid gap-4 lg:grid-cols-2 items-start">
        <OfficeSettingsForm office={officeSettings} />
        <HolidayManager holidays={holidays} />
      </div>
    </div>
  );
}
