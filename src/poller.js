import { SCHEDULER_TICK_MS } from './config.js';
import * as db from './db.js';
import { fetchReadyToAnnounceSets, StartggError } from './startgg.js';
import { buildAnnouncement } from './announce.js';

async function pollGuild(client, config) {
  const events = db.getGuildEvents(config.guild_id);
  if (events.length === 0) return;

  let guild = null;
  let channel = null;

  for (const event of events) {
    let sets;
    try {
      sets = await fetchReadyToAnnounceSets(event.event_id);
    } catch (err) {
      if (err instanceof StartggError) {
        console.error(`[poller] start.gg error for guild ${config.guild_id} event ${event.event_id}: ${err.message}`);
        continue;
      }
      throw err;
    }

    const newSets = sets.filter((set) => !db.isSetAnnounced(config.guild_id, set.id));
    if (newSets.length === 0) continue;

    if (!guild) {
      guild = await client.guilds.fetch(config.guild_id).catch(() => null);
      if (!guild) {
        console.warn(`[poller] guild ${config.guild_id} no longer accessible, skipping`);
        return;
      }
      channel = await guild.channels.fetch(config.channel_id).catch(() => null);
      if (!channel || !channel.isTextBased()) {
        console.warn(`[poller] channel ${config.channel_id} in guild ${config.guild_id} not usable, skipping`);
        return;
      }
    }

    for (const set of newSets) {
      try {
        const announcement = buildAnnouncement(guild, set);
        await channel.send(announcement);
        db.markSetAnnounced(config.guild_id, set.id);
      } catch (err) {
        console.error(`[poller] failed to announce set ${set.id} in guild ${config.guild_id}:`, err);
      }
    }
  }
}

export function startPoller(client) {
  setInterval(async () => {
    const now = Date.now();
    const configs = db.getEnabledGuildConfigs().filter((c) => c.next_poll_at <= now);

    for (const config of configs) {
      db.updateNextPollAt(config.guild_id, now + config.poll_interval_seconds * 1000);
      pollGuild(client, config).catch((err) => {
        console.error(`[poller] unexpected error polling guild ${config.guild_id}:`, err);
      });
    }
  }, SCHEDULER_TICK_MS);

  console.log('[poller] scheduler started');
}
