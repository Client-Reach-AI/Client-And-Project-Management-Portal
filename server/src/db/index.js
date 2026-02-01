import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import dns from 'node:dns';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const url = new URL(connectionString);
const useSupabase = url.hostname.includes('supabase.co');
const useSsl = useSupabase || url.searchParams.get('sslmode') === 'require';

let host = url.hostname;

if (useSupabase) {
  try {
    const [ipv4] = await dns.promises.resolve4(url.hostname);
    if (ipv4) {
      host = ipv4;
    }
  } catch (error) {
    // Fall back to hostname if IPv4 lookup fails.
  }
}

const pool = new Pool({
  host,
  port: url.port ? Number(url.port) : 5432,
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.replace(/^\//, ''),
  ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
});

export const db = drizzle(pool);
