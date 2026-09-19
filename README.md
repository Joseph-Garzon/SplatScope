# SplatScope

A Discord bot that watches a start.gg tournament event and posts an announcement
the moment a match is called to a station — pinging `@everyone` and both teams'
roles so nobody misses their set.

## How it works

- An admin runs `/setup` in their server, giving SplatScope a start.gg tournament
  URL/slug and a channel to post in. SplatScope automatically watches **every
  event** in that tournament (Singles, Doubles, etc.) — no need to pick one.
- SplatScope polls start.gg for sets in the `CALLED` state (station assigned,
  both entrants locked in) across all of those events.
- The first time it sees a qualifying set, it posts an announcement and
  remembers the set ID so it's never announced twice.
- Team pings work by matching each entrant's start.gg name **exactly** (case/
  whitespace insensitive) to a Discord role of the same name — e.g. an entrant
  named "Team Foo" needs a role called `@Team Foo` in the server.

## One-time setup

### 1. Create the Discord bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) → **New Application**.
2. Under **Bot**, click **Reset Token** to get your bot token (save it — you'll need it below). Turn off "Public Bot" if you don't want strangers adding it.
3. Under **OAuth2 → URL Generator**, check scopes `bot` and `applications.commands`, and under bot permissions check: **Send Messages**, **Mention Everyone**, **View Channel**, **Embed Links**.
4. Open the generated URL to invite the bot to your server.
5. Grab your **Application ID** from the **General Information** page — that's `DISCORD_CLIENT_ID`.

### 2. Get a start.gg API token

1. Log into start.gg, go to **[Developer Settings](https://start.gg/admin/profile/developer)**.
2. Click **Create new token**, name it (e.g. "SplatScope"), and copy the token immediately — start.gg only shows it once, and it expires after 1 year.
3. This one token is shared by the whole bot (whoever hosts SplatScope needs a start.gg account with access to view the tournaments you want to track — private/members-only tournaments may need the token owner to have access).

### 3. Configure and run the bot

```bash
npm install
cp .env.example .env
# fill in DISCORD_TOKEN, DISCORD_CLIENT_ID, STARTGG_API_TOKEN in .env
```

While developing, set `DISCORD_DEV_GUILD_ID` in `.env` to your test server's ID so
slash commands register instantly instead of waiting up to an hour for the
global rollout. Leave it blank in production.

Register the slash commands, then start the bot:

```bash
npm run deploy-commands
npm start
```

### 4. Configure a server

In the Discord server, an admin (needs **Manage Server** permission) runs:

```
/setup tournament:<start.gg URL or slug> channel:#matches poll-interval:60
```

All events in the tournament are watched automatically. Before matches start
pinging out, make sure roles named **exactly** like each team/entrant on
start.gg exist in the server.

Other commands:
- `/status` — show the current configuration
- `/pause` / `/resume` — temporarily stop/start announcements
- `/stop` — remove the configuration entirely

## Notes & limits

- start.gg's API allows ~80 requests/60s; SplatScope shares one rate-limited
  queue across every server and event it's monitoring (one request per event
  per poll), so `poll-interval` (default 60s, minimum 30s) is a lower bound,
  not a guarantee, for tournaments with many events or servers watching many
  large events at once.
- Data (which sets were already announced, per-server config) is stored in a
  local SQLite file at `DATABASE_PATH` (default `./data/splatscope.sqlite`).
