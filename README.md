Live démo : [http://jakarnotator.jakarto.com](http://jakarnotator.jakarto.com)

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
docker-compose -p dev -f docker-compose.dev.yml up --build --force-recreate

# Production
JAKARNOTATOR_PORT_MAPPED=80 docker-compose -p prod -f docker-compose.yml up --build --force-recreate
```
