import { prisma } from "../db.js";

prisma.$connect()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Database connection is ready. Run `prisma db push` to sync the schema.");
  })
  .catch(async (error) => {
    await prisma.$disconnect();
    console.error("Could not connect database", error);
    process.exit(1);
  });
