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

const sslMode = (process.env.DB_SSL_MODE || url.searchParams.get('sslmode') || '')
  .trim()
  .toLowerCase();

const isLocalHost = (hostname) =>
  ['localhost', '127.0.0.1', '::1'].includes(hostname);

const shouldUseSsl = () => {
  if (['disable', 'false', '0'].includes(sslMode)) {
    return false;
  }

  if (['require', 'verify-ca', 'verify-full', 'true', '1'].includes(sslMode)) {
    return true;
  }

  if (useSupabase) {
    return true;
  }

  return !isLocalHost(url.hostname);
};

const useSsl = shouldUseSsl();

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
