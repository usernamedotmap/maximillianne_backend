

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
	transactionOptions: {
		maxWait: 5_000,
		timeout: 10_000,
	},
});

export default prisma;