module.exports = {
  apps: [
    {
      name: "twitch-discord-ping",
      script: "index.js",
      autorestart: true,
      restart_delay: 5000,
    },
  ],
};
