import fs from "node:fs";

const fallback = `TWITCH_CHANNELS=alveussanctuary,maya
KEYWORDS=giveaway,raid
DISCORD_WEBHOOK_URL=
DISCORD_USER_ID=
COOLDOWN_SECONDS=30
IGNORE_USERS=nightbot,streamelements
`;

if (fs.existsSync(".env")) {
  console.log(".env already exists, leaving it alone.");
  process.exit(0);
}

const template = fs.existsSync(".env.example")
  ? fs.readFileSync(".env.example", "utf8")
  : fallback;

fs.writeFileSync(".env", template);
console.log("Created .env");
console.log("Next: open it, set DISCORD_WEBHOOK_URL (and your channels/keywords), then run: npm start");
