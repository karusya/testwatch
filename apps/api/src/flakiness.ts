import type { BuildRun, TestHistory, TestStatus } from '@testwatch/types';

/**
 * Pivot build-centric data into test-centric history, then score each test.
 *
 * Input:  builds, each containing many test results
 * Output: tests, each containing its run history + a flakiness score (0-100)
 */
export function computeHistory(builds: BuildRun[]): TestHistory[] {
  // Process builds oldest → newest so each test's `runs` array is chronological.
  // Transitions (pass→fail) only mean something in time order.
  const ordered = [...builds].sort((a, b) => a.timestamp - b.timestamp);

  // key = "suiteName::testName" so two tests with the same name in different
  // suites don't collide.
  const byTest = new Map<string, TestHistory>();

  for (const build of ordered) {
    for (const test of build.tests) {
      const key = `${test.suiteName}::${test.name}`;

      let history = byTest.get(key);
      if (!history) {
        history = {
          name: test.name,
          suiteName: test.suiteName,
          file: test.file,
          runs: [],
          flakinessScore: 0, // filled in after we've collected all runs
          lastStatus: test.status,
          lastSeen: build.timestamp,
        };
        byTest.set(key, history);
      }

      history.runs.push({
        buildNumber: build.buildNumber,
        timestamp: build.timestamp,
        status: test.status,
        errorMessage: test.errorMessage,
      });

      // Because we iterate oldest → newest, the last write wins = most recent.
      history.lastStatus = test.status;
      history.lastSeen = build.timestamp;
    }
  }

  for (const history of byTest.values()) {
    history.flakinessScore = scoreFlakiness(history.runs.map((r) => r.status));
  }

  return [...byTest.values()];
}

/**
 * Score 0-100 from a chronological list of statuses.
 *  - failRate:       how often it failed (broken tests score here)
 *  - transitionRate: how often it flipped result (flaky tests score here)
 * We weight them equally, so a test that flips constantly AND fails half the
 * time scores near 100, while a test that always fails scores ~50 (broken, not
 * flaky) and one that always passes scores 0.
 */
export function scoreFlakiness(statuses: TestStatus[]): number {
  // Skipped runs carry no pass/fail signal — drop them.
  const relevant = statuses.filter((s) => s !== 'skipped');

  // Need at least 2 runs to talk about flakiness.
  if (relevant.length < 2) {
    return relevant[0] === 'failed' ? 50 : 0;
  }

  const failures = relevant.filter((s) => s === 'failed').length;
  const failRate = failures / relevant.length;

  let transitions = 0;
  for (let i = 1; i < relevant.length; i++) {
    if (relevant[i] !== relevant[i - 1]) transitions++;
  }
  const transitionRate = transitions / (relevant.length - 1);

  return Math.round((failRate * 0.5 + transitionRate * 0.5) * 100);
}
