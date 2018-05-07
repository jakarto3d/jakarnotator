Need redis server on.
Grafana and Prometheus are also required.

```
cd jakarnotator
npm install

# for DEV :s
# On bash terminal:
DEBUG=jakarnotator:* npm run dev
# On powershell:
$env:DEBUG='jakarnotator:*'; npm run dev

# for PROD :
# On bash terminal:
PORT=80 DEBUG=jakarnotator:* npm start
# On powershell:
$env:PORT='80';$env:DEBUG='jakarnotator:*'; npm start
```

# with docker
```
# Development
docker-compose -f docker-compose.dev.yml up --build --force-recreate

# Production
docker-compose -f docker-compose.yml up --build --force-recreate
```
