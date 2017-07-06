var getName = false;
var processName = "GNOSIS-";
for (const key in process.argv) {
  var value = process.argv[key];
  if(getName === true){
    processName += value;
  }
  if(value == '--name'){
    getName = true;
  }
}
module.exports = {
  apps : [
      {
        name: processName,
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
