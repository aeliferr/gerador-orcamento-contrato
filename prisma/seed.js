const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const bcrypt = require('bcryptjs');
const hashedPassword = bcrypt.hashSync('admin');
console.log(hashedPassword);

async function main() {
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      fullName: "Administrador",
      role: 'admin',
    },
  })

  await prisma.user.upsert({
    where: { username: 'vendor' },
    update: {},
    create: {
      username: 'vendor',
      password: hashedPassword,
      fullName: "Vendedor",
      role: 'vendor',
    },
  })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })