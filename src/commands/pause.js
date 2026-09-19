import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import * as db from '../db.js';

export const data = new SlashCommandBuilder()
  .setName('pause')
  .setDescription('Pause match announcements without losing your configuration')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction) {
  const config = db.getGuildConfig(interaction.guildId);
  if (!config) {
    await interaction.reply({ content: 'SplatScope isn\'t configured yet. Run `/setup` first.', ephemeral: true });
    return;
  }
  db.setGuildEnabled(interaction.guildId, false);
  await interaction.reply({ content: '⏸️ Paused. Run `/resume` to start watching again.', ephemeral: true });
}
