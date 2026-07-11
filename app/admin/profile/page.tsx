import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { AppHeader } from "@/components/app-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export default async function ProfilePage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  return (
    <div className="flex flex-col gap-6">
      <AppHeader user={user} subtitle="Profil Admin" />
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Informasi Akun</CardTitle>
            <CardDescription>Ubah detail informasi profil Anda.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>Nama Lengkap</Label>
              <Input defaultValue={user.name} />
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input defaultValue={user.email} disabled />
            </div>
            <Button className="w-full">Simpan Perubahan</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ubah Password</CardTitle>
            <CardDescription>Pastikan password baru Anda kuat.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>Password Baru</Label>
              <Input type="password" placeholder="••••••••" />
            </div>
            <div className="grid gap-2">
              <Label>Konfirmasi Password</Label>
              <Input type="password" placeholder="••••••••" />
            </div>
            <Button variant="outline">Perbarui Password</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}