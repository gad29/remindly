module.exports = {
  apps: [{
    name: "remindly",
    script: "backend/server.js",
    cwd: __dirname,
    instances: 1,
    exec_mode: "fork",
    autorestart: true,
    max_memory_restart: "750M",
    env_production: {
      NODE_ENV: "production",
      PORT: 3001,
      DB_SYNC_ALTER: "false"
    }
  }]
};
