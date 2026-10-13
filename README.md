# Twitch Discord Ping

Watches one or more Twitch chats and posts to a Discord channel (and pings you) when a keyword is mentioned. Self-hosted, runs on your own PC or server.

- Reads chat anonymously, no Twitch login or API keys
- Any number of channels at once
- Global keywords, plus optional per-channel keywords
- Whole word, case-insensitive matching ("raid" will not match "afraid")
- Cooldown per keyword and channel so busy chats do not spam you
- Auto reconnects, handles Discord rate limits

## Quick start

Requires [Node.js](https://nodejs.org) 18 or newer.

```
git clone https://github.com/YOUR_USERNAME/twitch-discord-ping.git
cd twitch-discord-ping
npm install
npm run setup
```

No git? Click Code > Download ZIP on GitHub and unzip it instead.

`npm run setup` creates a `.env` file. Open it and fill in:

```
TWITCH_CHANNELS=alveussanctuary,alveusgg
KEYWORDS=giveaway,raid
DISCORD_WEBHOOK_URL=YOUR_WEBHOOK_URL_HERE
DISCORD_USER_ID=YOUR_USERID_HERE
```

Then run it:

```
npm start
```

You should see `Connected. Watching:` followed by your channels and keywords.

### Getting the Discord values

- **Webhook URL:** in your server, Channel Settings > Integrations > Webhooks > New Webhook > Copy Webhook URL.
- **User ID:** User Settings > Advanced > enable Developer Mode, then right click your name > Copy User ID. Leave `DISCORD_USER_ID` empty to post without pinging anyone.

## Configuration

Set these in `.env`:

| Variable | Description | Default |
| --- | --- | --- |
| `TWITCH_CHANNELS` | Comma separated channels to watch (no `#`) | required* |
| `KEYWORDS` | Comma separated keywords applied to every channel | required* |
| `DISCORD_WEBHOOK_URL` | Discord webhook URL | required |
| `DISCORD_USER_ID` | Discord user to ping | none |
| `COOLDOWN_SECONDS` | Min seconds between alerts for the same keyword and channel | `30` |
| `IGNORE_USERS` | Comma separated Twitch usernames to ignore (bots) | none |

*Not required if you define everything in `channels.json`.

### Different keywords per channel

Copy `channels.example.json` to `channels.json`:

```json
{
  "globalKeywords": ["giveaway"],
  "channels": {
    "alveussanctuary": ["raid", "pylon"],
    "maya": ["subathon"]
  }
}
```

Every channel gets the global keywords (from `.env` and `globalKeywords`) plus its own list. Channels from `TWITCH_CHANNELS` and `channels.json` are merged. Restart the bot after changing either file.

## Keep it running 24/7 on your own PC

Pick one.

### Windows: start.bat

Double click `start.bat`. It installs dependencies, creates `.env` on first run, and restarts the bot if it crashes. To start it at boot, press Win+R, run `shell:startup`, and drop a shortcut to `start.bat` there.

### PM2 (Windows, macOS, Linux)

```
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
```

Start on boot: on Linux and macOS run `pm2 startup` and follow the printed command. On Windows install `pm2-windows-startup`, then run `pm2-startup install`.

Useful commands: `pm2 logs twitch-discord-ping`, `pm2 restart twitch-discord-ping`, `pm2 stop twitch-discord-ping`.

### Docker

```
docker compose up -d --build
docker compose logs -f
```

Restarts automatically after crashes and reboots. Re-run `docker compose up -d --build` after editing `.env` or `channels.json`.

Also make sure the machine does not go to sleep (on Windows: Settings > System > Power > Screen and sleep).

## Hosting somewhere else

Any host that runs a long-lived Node or Docker process works: a VPS, Raspberry Pi, Oracle Cloud free tier, Fly.io, Railway. Set the `.env` values as environment variables on the host. Serverless or sleeping free tiers will not work, since the bot needs a constant connection.

## Troubleshooting

- **No alerts:** check the channel is live and chatting, the keyword is a whole word, and the cooldown has passed. Watch the console for `[match]` lines.
- **`Discord webhook failed: 404`:** the webhook URL is wrong or the webhook was deleted.
- **Pings show as plain text:** `DISCORD_USER_ID` is wrong or empty. It must be the numeric user ID, not your username.
- **`.env` not found on Windows:** Notepad may have saved `.env.txt`. Fix with `ren .env.txt .env`, or just run `npm run setup`.
- **Missing config error on start:** `DISCORD_WEBHOOK_URL` and at least one channel with keywords are required.

## Contributing

Issues and pull requests are welcome. Run `npm run check` before submitting.

## License

MIT
