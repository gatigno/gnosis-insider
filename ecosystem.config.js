module.exports = {
  apps : [
      {
        name: "GNOSIS",
        script: "./app.js",
        watch: true,
        env: {
            "PORT": 3000,
            "NODE_ENV": "production"
        },
        env_staging: {
            "PORT": 3001,
            "NODE_ENV": "staging",
        },
        env_dev: {
            "PORT": 3000,
            "NODE_ENV": "dev",
        }
      }
  ]
}
