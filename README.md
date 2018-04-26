Need redis server on.

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
docker build -t jakarnotator .
docker run -it --rm -p 8082:8080 -v ${PWD}/jakarnotator/public/data:/app/public/data jakarnotator

# Prometheus
# http://localhost:9090

# Graphana (user: admin, password: admin)
# http://localhost:3000/d/rHeAsGMik/jakarnotator_dashboard?orgId=1
```