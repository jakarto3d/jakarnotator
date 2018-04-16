```
cd jakarnotator
npm install

# for DEV :s
# On powershell:
$env:DEBUG='jakarnotator:*'; npm run dev
# On bash terminal:
DEBUG=jakarnotator:* npm run dev

# for PROD :
# On bash terminal:
SET DEBUG=jakarnotator:* & npm start
# On powershell:
$env:DEBUG='jakarnotator:*'; npm start
```