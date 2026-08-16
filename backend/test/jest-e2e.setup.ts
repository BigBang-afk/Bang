import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({
  path: path.resolve(__dirname, '../.env.test'),
  quiet: true,
} as dotenv.DotenvConfigOptions);
