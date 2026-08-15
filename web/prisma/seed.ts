import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@nexara.dev";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin already exists: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash("Admin123!", 12);
  await prisma.user.create({
    data: {
      name: "Nexara Admin",
      email,
      passwordHash,
      role: "ADMIN",
      avatarColor: "#7c5cff",
    },
  });

  console.log(`Seeded admin account -> email: ${email} / password: Admin123!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
