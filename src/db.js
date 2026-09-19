import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { DATABASE_PATH } from './config.js';

fs.mkdirSync(path.dirname(DATABASE_PATH), { recursive: true });

const db = new Database(DATABASE_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS guild_configs (
    guild_id TEXT PRIMARY KEY,
    tournament_slug TEXT NOT NULL,
    tournament_name TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    poll_interval_seconds INTEGER NOT NULL DEFAULT 60,
    enabled INTEGER NOT NULL DEFAULT 1,
    next_poll_at INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS guild_events (
    guild_id TEXT NOT NULL,
    event_id INTEGER NOT NULL,
    event_name TEXT NOT NULL,
    PRIMARY KEY (guild_id, event_id)
  );

  CREATE TABLE IF NOT EXISTS announced_sets (
    guild_id TEXT NOT NULL,
    set_id INTEGER NOT NULL,
    announced_at INTEGER NOT NULL,
    PRIMARY KEY (guild_id, set_id)
  );
`);

// events: [{ id, name }, ...] — every event in the tournament to watch.
const upsertGuildConfigTxn = db.transaction((config) => {
  const now = Date.now();
  db.prepare(`
    INSERT INTO guild_configs (
      guild_id, tournament_slug, tournament_name,
      channel_id, poll_interval_seconds, enabled, next_poll_at, created_at, updated_at
    ) VALUES (
      @guild_id, @tournament_slug, @tournament_name,
      @channel_id, @poll_interval_seconds, 1, 0, @now, @now
    )
    ON CONFLICT(guild_id) DO UPDATE SET
      tournament_slug = excluded.tournament_slug,
      tournament_name = excluded.tournament_name,
      channel_id = excluded.channel_id,
      poll_interval_seconds = excluded.poll_interval_seconds,
      enabled = 1,
      next_poll_at = 0,
      updated_at = @now
  `).run({ ...config, now });

  db.prepare('DELETE FROM guild_events WHERE guild_id = ?').run(config.guild_id);
  const insertEvent = db.prepare('INSERT INTO guild_events (guild_id, event_id, event_name) VALUES (?, ?, ?)');
  for (const event of config.events) {
    insertEvent.run(config.guild_id, event.id, event.name);
  }
});

export function upsertGuildConfig(config) {
  upsertGuildConfigTxn(config);
}

export function getGuildConfig(guildId) {
  return db.prepare('SELECT * FROM guild_configs WHERE guild_id = ?').get(guildId);
}

export function getGuildEvents(guildId) {
  return db.prepare('SELECT event_id, event_name FROM guild_events WHERE guild_id = ?').all(guildId);
}

export function getEnabledGuildConfigs() {
  return db.prepare('SELECT * FROM guild_configs WHERE enabled = 1').all();
}

export function setGuildEnabled(guildId, enabled) {
  db.prepare('UPDATE guild_configs SET enabled = ?, updated_at = ? WHERE guild_id = ?')
    .run(enabled ? 1 : 0, Date.now(), guildId);
}

export function deleteGuildConfig(guildId) {
  db.prepare('DELETE FROM guild_configs WHERE guild_id = ?').run(guildId);
  db.prepare('DELETE FROM guild_events WHERE guild_id = ?').run(guildId);
  db.prepare('DELETE FROM announced_sets WHERE guild_id = ?').run(guildId);
}

export function updateNextPollAt(guildId, nextPollAt) {
  db.prepare('UPDATE guild_configs SET next_poll_at = ? WHERE guild_id = ?').run(nextPollAt, guildId);
}

export function isSetAnnounced(guildId, setId) {
  return !!db.prepare('SELECT 1 FROM announced_sets WHERE guild_id = ? AND set_id = ?').get(guildId, setId);
}

export function markSetAnnounced(guildId, setId) {
  db.prepare(`
    INSERT OR IGNORE INTO announced_sets (guild_id, set_id, announced_at) VALUES (?, ?, ?)
  `).run(guildId, setId, Date.now());
}

export default db;
