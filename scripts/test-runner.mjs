import { createServer } from 'vite';

async function run() {
  console.log('\n🚀 Starting CityPulse Civic Dashboard Automated Test Suite...\n');

  const vite = await createServer({
    server: { middlewareMode: true, watch: null },
    appType: 'custom',
    logLevel: 'error',
    optimizeDeps: { noDiscovery: true },
  });

  try {
    const { runPhaseTests } = await vite.ssrLoadModule('/src/tests/phases.test.ts');
    await runPhaseTests();
    console.log('\n✨ All Phase 1 and Phase 2 tests passed successfully!\n');
    await vite.close();
    process.exitCode = 0;
  } catch (err) {
    console.error('\n❌ Test Suite Failed:', err);
    await vite.close();
    process.exitCode = 1;
  }
}

run();
