import { SlashCommandBuilder } from 'discord.js';
import * as db from '../db.js';

export const data = new SlashCommandBuilder()
  .setName('status')
  .setDescription('Show SplatScope\'s current tournament-watch configuration for this server');

export async function execute(interaction) {
  const config = db.getGuildConfig(interaction.guildId);
  if (!config) {
    await interaction.reply({ content: 'SplatScope isn\'t configured yet. Run `/setup` to get started.', ephemeral: true });
    return;
  }

  const events = db.getGuildEvents(interaction.guildId);
  const eventList = events.map((e) => `• ${e.event_name}`).join('\n') || '_none_';

  const lines = [
    `**Tournament:** ${config.tournament_name}`,
    `**Channel:** <#${config.channel_id}>`,
    `**Poll interval:** ${config.poll_interval_seconds}s`,
    `**Status:** ${config.enabled ? '🟢 watching' : '⏸️ paused'}`,
    `**Events watched (${events.length}):**\n${eventList}`,
  ];

  await interaction.reply({ content: lines.join('\n'), ephemeral: true });
}
