import fs from 'fs';
import path from 'path';

export interface TestAccount {
  email: string;
  password: string;
  fullName: string;
}

export interface Credentials {
  players: Record<string, TestAccount>;
  admins: Record<string, TestAccount>;
}

const CREDENTIALS_PATH = path.resolve(__dirname, '../credentials.json');

export function loadCredentialTemplates(): Credentials {
  const credentialPath = process.env.PW_CREDENTIALS_FILE ? path.resolve(process.env.PW_CREDENTIALS_FILE) : CREDENTIALS_PATH;
  if (!fs.existsSync(credentialPath)) {
    throw new Error(`Missing ${credentialPath}. Copy credentials.example.json to credentials.json; use disposable test templates only.`);
  }
  const templates = JSON.parse(fs.readFileSync(credentialPath, 'utf-8'));
  if (!templates.players || !templates.admins) throw new Error('Credential templates need players and admins groups');
  return templates;
}

function readRunCredentials(): Credentials {
  const manifestPath = process.env.PW_RUN_MANIFEST;
  if (!manifestPath) throw new Error('PR-122: no run manifest; execute specs through Playwright global setup');
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8')).credentials;
}

// Lazy getters allow test discovery without provisioning or reading private
// credentials. During execution workers use aliases created by setup.
export const credentials: Credentials = {
  get players() { return readRunCredentials().players; },
  get admins() { return readRunCredentials().admins; },
};
