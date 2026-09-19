import { Client, GatewayIntentBits, Events } from 'discord.js';
import { DISCORD_TOKEN } from './config.js';
import { startPoller } from './poller.js';
import * as setup from './commands/setup.js';
import * as status from './commands/status.js';
import * as pause from './commands/pause.js';
import * as resume from './commands/resume.js';
import * as stop from './commands/stop.js';

const commands = new Map([setup, status, pause, resume, stop].map((c) => [c.data.name, c]));

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (c) => {
  console.log(`Logged in as ${c.user.tag}`);
  startPoller(c);
});

client.on(Events.GuildCreate, async (guild) => {
  const channel =
    guild.systemChannel ??
    guild.channels.cache.find((ch) => ch.isTextBased() && ch.permissionsFor(guild.members.me)?.has('SendMessages'));

  if (!channel) return;
  await channel
    .send(
      '👋 Thanks for adding **SplatScope**! An admin can run `/setup` to tell me which start.gg tournament to watch, ' +
        'which channel to post announcements in, and how often to check for called matches.'
    )
    .catch(() => {});
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = commands.get(interaction.commandName);
      if (!command) return;
      await command.execute(interaction);
      return;
    }
  } catch (err) {
    console.error('[interaction] error handling interaction:', err);
    const errorMessage = '❌ Something went wrong handling that. Please try again.';
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: errorMessage, components: [] }).catch(() => {});
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true }).catch(() => {});
    }
  }
});

client.login(DISCORD_TOKEN);
