import "dotenv/config";
import fs from "node:fs";
import tmi from "tmi.js";

const clean = (s) => s.trim().toLowerCase().replace(/^#/, "");
const list = (v) => (v || "").split(",").map(clean).filter(Boolean);

const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
const pingUserId = (process.env.DISCORD_USER_ID || "").trim();
const cooldownMs = Number(process.env.COOLDOWN_SECONDS || 30) * 1000;
const ignoreUsers = list(process.env.IGNORE_USERS);

// Optional per-channel config (see channels.example.json)
let fileCfg = {};
if (fs.existsSync("channels.json")) {
  try {
    fileCfg = JSON.parse(fs.readFileSync("channels.json", "utf8"));
  } catch (e) {
    console.error("channels.json is not valid JSON:", e.message);
    process.exit(1);
  }
}

// Global keywords apply to every channel
const globalKeywords = [
  ...list(process.env.KEYWORDS),
  ...(fileCfg.globalKeywords || []).map(clean),
];

// channel -> Set of keywords
const channelKeywords = new Map();
for (const ch of list(process.env.TWITCH_CHANNELS)) {
  channelKeywords.set(ch, new Set(globalKeywords));
}
for (const [name, extra] of Object.entries(fileCfg.channels || {})) {
  const ch = clean(name);
  const set = channelKeywords.get(ch) || new Set(globalKeywords);
  for (const kw of extra || []) set.add(clean(kw));
  channelKeywords.set(ch, set);
}

if (!webhookUrl) {
  console.error("Missing DISCORD_WEBHOOK_URL in .env");
  process.exit(1);
}
if (!channelKeywords.size) {
  console.error("No channels configured. Set TWITCH_CHANNELS in .env or use channels.json");
  process.exit(1);
}
for (const [ch, set] of channelKeywords) {
  if (!set.size) {
    console.error(`Channel ${ch} has no keywords. Set KEYWORDS or add some in channels.json`);
    process.exit(1);
  }
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Whole word, case-insensitive match
const matchers = new Map();
for (const [ch, set] of channelKeywords) {
  matchers.set(
    ch,
    [...set].map((kw) => ({
      kw,
      re: new RegExp(
        `(^|[^\\p{L}\\p{N}_])${escapeRegex(kw)}($|[^\\p{L}\\p{N}_])`,
        "iu"
      ),
    }))
  );
}

const lastSent = new Map();

async function sendToDiscord(kw, channel, user, message) {
  const trimmed = message.length > 300 ? message.slice(0, 297) + "..." : message;
  const mention = pingUserId ? `<@${pingUserId}> ` : "";
  const body = {
    username: "Twitch Keyword Alert",
    content: `${mention}**${kw}** in #${channel} | ${user}: ${trimmed}`,
    allowed_mentions: pingUserId ? { users: [pingUserId] } : { parse: [] },
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.status === 429) {
      const data = await res.json().catch(() => ({}));
      const wait = Math.ceil((data.retry_after || 1) * 1000);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    if (!res.ok) {
      console.error(`Discord webhook failed: ${res.status} ${await res.text()}`);
    }
    return;
  }
}

const client = new tmi.Client({
  options: { skipUpdatingEmotesets: true },
  connection: { reconnect: true, secure: true },
  channels: [...channelKeywords.keys()],
});

client.on("connected", () => {
  console.log("Connected. Watching:");
  for (const [ch, set] of channelKeywords) {
    console.log(`  #${ch}: ${[...set].join(", ")}`);
  }
});

client.on("disconnected", (reason) => console.warn("Disconnected:", reason));

client.on("message", (channel, tags, message, self) => {
  if (self) return;
  const chan = clean(channel);
  const username = (tags.username || "").toLowerCase();
  if (ignoreUsers.includes(username)) return;

  const user = tags["display-name"] || tags.username || "unknown";

  for (const { kw, re } of matchers.get(chan) || []) {
    if (!re.test(message)) continue;

    const key = `${chan}:${kw}`;
    const now = Date.now();
    if (now - (lastSent.get(key) || 0) < cooldownMs) continue;
    lastSent.set(key, now);

    console.log(`[match] #${chan} "${kw}" from ${user}`);
    sendToDiscord(kw, chan, user, message).catch((e) =>
      console.error("Send error:", e.message)
    );
    break; // one alert per message
  }
});

client.connect().catch((e) => {
  console.error("Twitch connect error:", e);
  process.exit(1);
});

const shutdown = () => {
  client.disconnect().catch(() => {});
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
