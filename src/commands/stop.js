import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import * as db from '../db.js';

export const data = new SlashCommandBuilder()
  .setName('stop')
  .setDescription('Remove SplatScope\'s tournament configuration for this server entirely')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction) {
  const config = db.getGuildConfig(interaction.guildId);
  if (!config) {
    await interaction.reply({ content: 'Nothing to remove — SplatScope isn\'t configured.', ephemeral: true });
    return;
  }
  db.deleteGuildConfig(interaction.guildId);
  await interaction.reply({ content: '🗑️ Configuration removed. Run `/setup` any time to start watching a tournament again.', ephemeral: true });
}
