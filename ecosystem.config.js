module.exports = {
  apps : [
      {
        name: "GNOSIS-"+process.env.NODE_ENV,
        script: "./app.js",
        watch: true,
        env: {
            "NODE_ENV": "production"
        },
        env_staging: {
            "NODE_ENV": "staging",
        },
        env_dev: {
            "NODE_ENV": "dev",
        }
      }
  ]
}
