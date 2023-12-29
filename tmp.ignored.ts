import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient()

const result = await prisma.$queryRaw`
EXPLAIN QUERY PLAN
SELECT * FROM item WHERE code = 99
`

console.log(result)
