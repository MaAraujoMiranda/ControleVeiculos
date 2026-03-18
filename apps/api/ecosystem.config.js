// CONTROLE VEICULOS API - PM2 Configuration
// Otimizado para producao na VPS (porta 3600, 2 instancias)

module.exports = {
  apps: [
    {
      name: 'controle-veiculos-api',
      script: './dist/main.js',
      cwd: __dirname,

      // Modo cluster para alta disponibilidade
      exec_mode: 'cluster',
      instances: 2,

      // Estabilidade
      autorestart: true,
      min_uptime: 15000,
      exp_backoff_restart_delay: 100,
      restart_delay: 500,
      kill_timeout: 15000,

      // Memoria
      node_args: ['--max-old-space-size=512'],
      max_memory_restart: '600M',

      // Logs
      merge_logs: true,
      time: true,
      error_file: './logs/app_error.log',
      out_file: './logs/app_out.log',
      log_date_format: 'YYYY-MM-DD HH:mm Z',

      watch: false,
      ignore_watch: ['node_modules', 'logs', '.git', 'dist'],
      vizion: false,

      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || '3600',
        TZ: 'America/Sao_Paulo',

        // Database
        DATABASE_URL: process.env.DATABASE_URL,

        // Auth
        SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME,
        ADMIN_NAME: process.env.ADMIN_NAME,
        ADMIN_EMAIL: process.env.ADMIN_EMAIL,
        ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,

        // CORS
        CORS_ORIGIN: process.env.CORS_ORIGIN,

        // Logs
        LOG_LEVEL: process.env.LOG_LEVEL || 'info',
      },
    },
  ],
};
