const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const rootDir = path.resolve(__dirname, '..', '..');

const candidateFiles = [
  path.join(rootDir, '.env.local'),
  path.join(rootDir, '.env'),
];

for (const envFile of candidateFiles) {
  if (!fs.existsSync(envFile)) {
    continue;
  }

  dotenv.config({ path: envFile });
}
