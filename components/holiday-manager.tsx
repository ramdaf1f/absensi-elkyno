import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

export function HolidayManager() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Manajemen Hari Libur</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="grid gap-2">
          <Label>Tanggal</Label>
          <Input type="date" name="date" required />
          <Label>Keterangan</Label>
          <Input name="description" placeholder="Contoh: Idul Fitri" required />
          <Button size="sm">Tambah Libur</Button>
        </form>
      </CardContent>
    </Card>
  )
}