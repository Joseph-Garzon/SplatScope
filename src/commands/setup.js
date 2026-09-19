import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { resolveTournament } from '../startgg.js';
import { MIN_POLL_INTERVAL_SECONDS, DEFAULT_POLL_INTERVAL_SECONDS } from '../config.js';
import * as db from '../db.js';

export const data = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('Configure SplatScope to monitor a start.gg tournament (all of its events)')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addStringOption((opt) =>
    opt
      .setName('tournament')
      .setDescription('start.gg tournament URL or slug (e.g. https://www.start.gg/tournament/my-event)')
      .setRequired(true)
  )
  .addChannelOption((opt) =>
    opt
      .setName('channel')
      .setDescription('Channel to post match announcements in')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true)
  )
  .addIntegerOption((opt) =>
    opt
      .setName('poll-interval')
      .setDescription(`How often to check start.gg, in seconds (default ${DEFAULT_POLL_INTERVAL_SECONDS}, min ${MIN_POLL_INTERVAL_SECONDS})`)
      .setMinValue(MIN_POLL_INTERVAL_SECONDS)
      .setRequired(false)
  );

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const tournamentInput = interaction.options.getString('tournament', true);
  const channel = interaction.options.getChannel('channel', true);
  const pollInterval = interaction.options.getInteger('poll-interval') ?? DEFAULT_POLL_INTERVAL_SECONDS;

  let tournament;
  try {
    tournament = await resolveTournament(tournamentInput);
  } catch (err) {
    await interaction.editReply(`❌ Couldn't find that tournament: ${err.message}`);
    return;
  }

  const events = tournament.events ?? [];
  if (events.length === 0) {
    await interaction.editReply('❌ That tournament has no events set up yet on start.gg.');
    return;
  }

  db.upsertGuildConfig({
    guild_id: interaction.guildId,
    tournament_slug: tournament.slug,
    tournament_name: tournament.name,
    channel_id: channel.id,
    poll_interval_seconds: pollInterval,
    events,
  });

  const eventList = events.map((e) => `• ${e.name}`).join('\n');
  await interaction.editReply(
    `✅ SplatScope is now watching **${tournament.name}** and will post to ${channel} every ${pollInterval}s.\n\n` +
      `Watching ${events.length} event${events.length === 1 ? '' : 's'}:\n${eventList}`
  );
}
