import { loadCredentialTemplates } from './config/credentials';
import { createRun, registerAccounts, cleanupRun, assertDisposableTarget } from './support/account-lifecycle';

export default async function globalSetup() {
  // PR-122: reject unsafe targets before sending any registration request.
  assertDisposableTarget();
  const manifestPath = createRun(loadCredentialTemplates());
  // Workers inherit this path and read aliases instead of configured addresses.
  process.env.PW_RUN_MANIFEST = manifestPath;
  try {
    await registerAccounts(manifestPath);
  } catch (setupError) {
    // A failed setup cannot depend on global teardown being called later.
    try { await cleanupRun(manifestPath); }
    catch (cleanupError) {
      throw new AggregateError([setupError, cleanupError], 'Playwright setup and cleanup failed');
    }
    throw setupError;
  }
}
