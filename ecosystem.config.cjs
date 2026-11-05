module.exports = {
  apps: [
    {
      name: 'cognipulse-backend',
      script: 'src/index.js',
      cwd: './backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'cognipulse-web',
      script: 'server.js',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 5002
      }
    }
  ]
};

