import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
config();

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  console.log('Enabling vector extension...');
  await sql`CREATE EXTENSION IF NOT EXISTS vector`;
  console.log('Done!');
}

main().catch(console.error);
