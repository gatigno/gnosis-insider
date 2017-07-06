gnosis-insider

* command to run local tunnel
```
( while true; do lt -p 3000 -s gnosis; done; )
```

* runnning app with environment
```
pm2 start ecosystem.config.js --env production
```
