import type { BuildRun, TestStatus } from '@testwatch/types';

// Deterministic fake builds so the dashboard works without a real Jenkins.
// Each test has a "personality" (healthy / broken / flaky) so the flakiness
// scores come out varied and recognizable.
const TESTS: { name: string; suite: string; file: string; pattern: TestStatus[] }[] = [
  { name: 'login redirects to dashboard', suite: 'auth.spec.ts', file: 'tests/auth.spec.ts',
    pattern: ['passed', 'passed', 'passed', 'passed', 'passed', 'passed'] },
  { name: 'logout clears session', suite: 'auth.spec.ts', file: 'tests/auth.spec.ts',
    pattern: ['passed', 'failed', 'passed', 'failed', 'passed', 'failed'] }, // flaky
  { name: 'checkout applies discount code', suite: 'checkout.spec.ts', file: 'tests/checkout.spec.ts',
    pattern: ['failed', 'failed', 'failed', 'failed', 'failed', 'failed'] }, // broken
  { name: 'cart updates quantity', suite: 'checkout.spec.ts', file: 'tests/checkout.spec.ts',
    pattern: ['passed', 'passed', 'failed', 'passed', 'passed', 'passed'] }, // occasional blip
  { name: 'search returns results', suite: 'search.spec.ts', file: 'tests/search.spec.ts',
    pattern: ['passed', 'passed', 'passed', 'failed', 'failed', 'passed'] },
];

export function getMockBuilds(count = 6): BuildRun[] {
  const now = Date.now();
  const builds: BuildRun[] = [];

  for (let i = 0; i < count; i++) {
    const tests = TESTS.map((t) => {
      const status = t.pattern[i] ?? 'passed';
      return {
        name: t.name,
        suiteName: t.suite,
        file: t.file,
        status,
        duration: Math.round(500 + Math.random() * 3000),
        errorMessage: status === 'failed' ? 'Timed out 30000ms waiting for locator' : undefined,
        errorStack: status === 'failed' ? 'at tests/' + t.file + ':42:10' : undefined,
      };
    });

    const anyFailed = tests.some((t) => t.status === 'failed');
    builds.push({
      buildNumber: 100 + i,
      jobName: 'e2e-playwright',
      timestamp: now - (count - i) * 3_600_000, // one hour apart, oldest first
      result: anyFailed ? 'UNSTABLE' : 'SUCCESS',
      tests,
    });
  }

  return builds;
}
