const path = require('path');
const dotenv = require('dotenv');
const { execSync } = require('child_process');

module.exports = async () => {
  dotenv.config({ path: path.resolve(__dirname, '../.env.test'), quiet: true });

  execSync('npx prisma migrate deploy', {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
    env: process.env,
  });
};
