import { REST, Routes } from 'discord.js';
import { DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_DEV_GUILD_IDS } from './config.js';
import * as setup from './commands/setup.js';
import * as status from './commands/status.js';
import * as pause from './commands/pause.js';
import * as resume from './commands/resume.js';
import * as stop from './commands/stop.js';

const commands = [setup, status, pause, resume, stop].map((c) => c.data.toJSON());

const rest = new REST().setToken(DISCORD_TOKEN);

if (DISCORD_DEV_GUILD_IDS.length > 0) {
  for (const guildId of DISCORD_DEV_GUILD_IDS) {
    console.log(`Registering ${commands.length} commands to guild ${guildId}...`);
    await rest.put(Routes.applicationGuildCommands(DISCORD_CLIENT_ID, guildId), { body: commands });
  }
} else {
  console.log(`Registering ${commands.length} commands globally...`);
  await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), { body: commands });
}

console.log('Done.');
