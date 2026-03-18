// CONTROLE VEICULOS WEB - PM2 Configuration
// Next.js standalone na porta 3200

module.exports = {
  apps: [
    {
      name: 'controle-veiculos-web',
      script: './.next/standalone/apps/web/server.js',
      cwd: __dirname,

      exec_mode: 'fork',
      instances: 1,

      autorestart: true,
      min_uptime: 15000,
      restart_delay: 500,
      kill_timeout: 15000,

      node_args: ['--max-old-space-size=512'],
      max_memory_restart: '600M',

      merge_logs: true,
      time: true,
      error_file: './logs/web_error.log',
      out_file: './logs/web_out.log',
      log_date_format: 'YYYY-MM-DD HH:mm Z',

      watch: false,
      vizion: false,

      env_production: {
        NODE_ENV: 'production',
        PORT: '3200',
        HOSTNAME: '0.0.0.0',
        TZ: 'America/Sao_Paulo',
        NEXT_PUBLIC_API_URL: 'https://api.mtscontroleveiculospro.com.br/api/v1',
      },
    },
  ],
};
