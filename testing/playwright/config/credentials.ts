import fs from 'fs';
import path from 'path';

interface TestAccount {
  email: string;
  password: string;
  fullName: string;
}

interface Credentials {
  players: Record<string, TestAccount>;
  admins: Record<string, TestAccount>;
}

const CREDENTIALS_PATH = path.resolve(__dirname, '../credentials.json');

// credentials.json is gitignored (real accounts/passwords, never committed) -
// see credentials.example.json for the shape a fresh clone needs to fill in.
if (!fs.existsSync(CREDENTIALS_PATH)) {
  throw new Error(
    `Missing ${CREDENTIALS_PATH}. Copy credentials.example.json to credentials.json ` +
      'and fill in real test account details before running specs that log in.'
  );
}

export const credentials: Credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf-8'));
