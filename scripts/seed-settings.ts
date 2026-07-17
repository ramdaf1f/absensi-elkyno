import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log("Upserting default office settings...")
  
  const settings = await prisma.officeSetting.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: "Kantor Pusat",
      latitude: -6.2087600,
      longitude: 106.8456000,
      radius_m: 50, // 50 meters default radius
    }
  })
  
  console.log("Default office settings initialized:", settings)
}

main()
  .catch((e) => {
    console.error("Error seeding settings:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
