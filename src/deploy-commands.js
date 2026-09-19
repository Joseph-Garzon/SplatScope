import { REST, Routes } from 'discord.js';
import { DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_DEV_GUILD_ID } from './config.js';
import * as setup from './commands/setup.js';
import * as status from './commands/status.js';
import * as pause from './commands/pause.js';
import * as resume from './commands/resume.js';
import * as stop from './commands/stop.js';

const commands = [setup, status, pause, resume, stop].map((c) => c.data.toJSON());

const rest = new REST().setToken(DISCORD_TOKEN);

const route = DISCORD_DEV_GUILD_ID
  ? Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_DEV_GUILD_ID)
  : Routes.applicationCommands(DISCORD_CLIENT_ID);

const scope = DISCORD_DEV_GUILD_ID ? `guild ${DISCORD_DEV_GUILD_ID}` : 'globally';
console.log(`Registering ${commands.length} commands ${scope}...`);

await rest.put(route, { body: commands });

console.log('Done.');
