import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import * as db from '../db.js';

export const data = new SlashCommandBuilder()
  .setName('resume')
  .setDescription('Resume match announcements after a /pause')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction) {
  const config = db.getGuildConfig(interaction.guildId);
  if (!config) {
    await interaction.reply({ content: 'SplatScope isn\'t configured yet. Run `/setup` first.', ephemeral: true });
    return;
  }
  db.setGuildEnabled(interaction.guildId, true);
  await interaction.reply({ content: '🟢 Resumed watching for called matches.', ephemeral: true });
}
