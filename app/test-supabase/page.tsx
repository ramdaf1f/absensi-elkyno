// app/test-supabase/page.tsx
import { getUserByEmail } from "@/lib/db" // Atau di mana pun letak getUserByEmail lu
import bcrypt from "bcryptjs"

export default async function TestLoginSimulationPage() {
  const testEmail = "admin@example.com"
  const inputPassword = "admin123" // Password asli yang lu ketik di form
  
  let step1 = "Belum dimulai"
  let step2 = "Belum dimulai"
  let step3 = "Belum dimulai"
  let userFetched: any = null
  let isMatch = false
  let errorMessage = ""

  try {
    // Langkah 1: Ambil data user berdasarkan email
    step1 = `Mencoba mencari user dengan email: "${testEmail}"...`
    userFetched = await getUserByEmail(testEmail)
    
    if (!userFetched) {
      step1 = `❌ Gagal: User dengan email "${testEmail}" TIDAK DITEMUKAN di database!`
    } else {
      step1 = `✅ Sukses: User ditemukan!`
      
      // Langkah 2: Cek apakah kolom password_hash ada nilainya
      step2 = "Memeriksa ketersediaan kolom password_hash..."
      const hashInDb = userFetched.password_hash || userFetched.passwordHash
      
      if (!hashInDb) {
        step2 = `❌ Gagal: Kolom password_hash bernilai UNDEFINED atau KOSONG di objek user. (Isi objek user: ${JSON.stringify(userFetched)})`
      } else {
        step2 = `✅ Sukses: password_hash ditemukan (${hashInDb})`
        
        // Langkah 3: Tes Bcrypt secara manual
        step3 = `Mencoba mencocokkan password asli "${inputPassword}" dengan hash database menggunakan Bcrypt...`
        isMatch = await bcrypt.compare(inputPassword, hashInDb)
        
        if (isMatch) {
          step3 = "✅ SUKSES! Password cocok 100%!"
        } else {
          step3 = "❌ GAGAL: Bcrypt menyatakan password TIDAK COCOK!"
        }
      }
    }
  } catch (error: any) {
    errorMessage = error.message || JSON.stringify(error)
  }

  return (
    <div style={{ padding: '30px', fontFamily: 'monospace', lineHeight: '1.6' }}>
      <h2 style={{ color: '#1a56db' }}>Simulasi Login Back-End Test (admin@example.com)</h2>
      
      {errorMessage && (
        <div style={{ padding: '15px', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '15px' }}>
          <strong>Error Sistem:</strong>
          <pre>{errorMessage}</pre>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
        <div style={{ padding: '10px', background: '#f3f4f6', borderRadius: '5px' }}>
          <strong>Langkah 1 (Ambil User):</strong> {step1}
        </div>
        <div style={{ padding: '10px', background: '#f3f4f6', borderRadius: '5px' }}>
          <strong>Langkah 2 (Cek Kolom Hash):</strong> {step2}
        </div>
        <div style={{ padding: '10px', background: '#f3f4f6', borderRadius: '5px' }}>
          <strong>Langkah 3 (Verifikasi Bcrypt):</strong> {step3}
        </div>
      </div>

      <div style={{ background: '#1e293b', color: '#38bdf8', padding: '15px', borderRadius: '8px' }}>
        <strong>Isi Objek User yang Dikembalikan dari DB:</strong>
        <pre>{JSON.stringify(userFetched, null, 2)}</pre>
      </div>
    </div>
  )
}