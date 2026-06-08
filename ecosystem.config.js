const APP_DIR = process.env.APP_DIR || '/ControleVeiculos';

module.exports = {
  apps: [
    {
      name: 'controle-veiculos-api',
      script: './dist/main.js',
      cwd: `${APP_DIR}/apps/api`,

      exec_mode: 'cluster',
      instances: Number(process.env.API_INSTANCES || 2),

      autorestart: true,
      min_uptime: 15000,
      max_restarts: 10,
      exp_backoff_restart_delay: 100,
      restart_delay: 500,
      kill_timeout: 15000,

      node_args: ['--max-old-space-size=512'],
      max_memory_restart: '600M',

      merge_logs: true,
      time: true,
      error_file: `${APP_DIR}/logs/api_error.log`,
      out_file: `${APP_DIR}/logs/api_out.log`,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      watch: false,
      vizion: false,

      env_production: {
        NODE_ENV: 'production',
        API_PORT: process.env.API_PORT || '3600',
        PORT: process.env.API_PORT || process.env.PORT || '3600',
        TZ: 'America/Sao_Paulo',
        LOG_LEVEL: process.env.LOG_LEVEL || 'info',
        HTTP_ACCESS_LOGS: process.env.HTTP_ACCESS_LOGS || 'true',
      },
    },
    {
      name: 'controle-veiculos-web',
      script: './.next/standalone/apps/web/server.js',
      cwd: `${APP_DIR}/apps/web`,

      exec_mode: 'fork',
      instances: 1,

      autorestart: true,
      min_uptime: 15000,
      max_restarts: 10,
      restart_delay: 500,
      kill_timeout: 15000,

      node_args: ['--max-old-space-size=512'],
      max_memory_restart: '600M',

      merge_logs: true,
      time: true,
      error_file: `${APP_DIR}/logs/web_error.log`,
      out_file: `${APP_DIR}/logs/web_out.log`,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      watch: false,
      vizion: false,

      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.WEB_PORT || '3200',
        HOSTNAME: '0.0.0.0',
        TZ: 'America/Sao_Paulo',
        NEXT_PUBLIC_API_URL:
          process.env.NEXT_PUBLIC_API_URL ||
          'https://api.mtscontroleveiculospro.com.br/api/v1',
      },
    },
  ],
};
