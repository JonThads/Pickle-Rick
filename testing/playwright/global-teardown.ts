import { cleanupRun } from './support/account-lifecycle';

export default async function globalTeardown() {
  // PR-122 / BR-08: absent ownership evidence means no deletion authority.
  // Never reconstruct a deletion list from credentials.json.
  const manifestPath = process.env.PW_RUN_MANIFEST;
  if (manifestPath) await cleanupRun(manifestPath);
}
