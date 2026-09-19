import 'dotenv/config';

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const DISCORD_TOKEN = required('DISCORD_TOKEN');
export const DISCORD_CLIENT_ID = required('DISCORD_CLIENT_ID');
export const DISCORD_DEV_GUILD_ID = process.env.DISCORD_DEV_GUILD_ID || null;
export const STARTGG_API_TOKEN = required('STARTGG_API_TOKEN');
export const DATABASE_PATH = process.env.DATABASE_PATH || './data/splatscope.sqlite';

// Minimum seconds between polls for a single guild. Keeps any one tournament
// from dominating the shared start.gg rate limit budget (80 req / 60s).
export const MIN_POLL_INTERVAL_SECONDS = 30;
export const DEFAULT_POLL_INTERVAL_SECONDS = 60;

// How often the central scheduler wakes up to check which guilds are due for a poll.
export const SCHEDULER_TICK_MS = 15_000;
