import 'dotenv/config';
import prisma from '../lib/prisma.js';

const RETRY_LIMIT = 5;
const RETRY_DELAY = 3000;


export const connectDb = async (attempt = 1): Promise<void> => {
    try {
        await prisma.$connect();

        await prisma.$queryRaw`SELECT 1`;
        console.log("Database connnected successfully");
    } catch (err) {
        if (attempt < RETRY_LIMIT) {
            console.log(`Retrying in ${RETRY_DELAY} ms`);
            setTimeout(() => connectDb(attempt + 1),  RETRY_DELAY);
        } else {
            console.log("Failed to connect to database");
            process.exit(1);
        }
    }
}