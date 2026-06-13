import type {
  BuildRun,
  TestResult,
  TestStatus,
  JenkinsJob,
  JenkinsTestReport,
} from '@testwatch/types';

function mapStatus(status: string): TestStatus {
  switch (status) {
    case 'FAILED':
    case 'REGRESSION':
      return 'failed';
    case 'SKIPPED':
      return 'skipped';
    default:
      // PASSED, FIXED, and anything unexpected count as passing.
      return 'passed';
  }
}

export function createJenkinsClient(BASE_URL: string, user: string, token: string) {
  const auth = `Basic ${Buffer.from(`${user}:${token}`).toString('base64')}`;
  const headers = { Authorization: auth };

  async function getTestReport(jobName: string, buildNumber: number): Promise<TestResult[]> {
    const response = await fetch(
      `${BASE_URL}/job/${encodeURIComponent(jobName)}/${buildNumber}/testReport/api/json`,
      { headers }
    );
    // A build with no published test report returns 404 — treat that as "no tests".
    if (response.status === 404) {
      return [];
    }
    if (!response.ok) {
      throw new Error(
        `Failed to fetch test report for job ${jobName} and build ${buildNumber}: ${response.statusText}`
      );
    }
    const report = (await response.json()) as JenkinsTestReport;
    return (report.suites ?? []).flatMap((suite) =>
      suite.cases.map((c) => ({
        name: c.name,
        suiteName: suite.name,
        file: c.className,
        status: mapStatus(c.status),
        duration: c.duration,
        errorMessage: c.errorDetails ?? undefined,
        errorStack: c.errorStackTrace ?? undefined,
      }))
    );
  }

  async function getBuilds(jobName: string): Promise<BuildRun[]> {
    const response = await fetch(
      `${BASE_URL}/job/${encodeURIComponent(jobName)}/api/json?tree=builds[number,timestamp,result]`,
      { headers }
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch builds for job ${jobName}: ${response.statusText}`);
    }
    const job = (await response.json()) as JenkinsJob;
    const summaries = job.builds ?? [];

    return Promise.all(
      summaries.map(async (build) => ({
        buildNumber: build.number,
        jobName,
        timestamp: build.timestamp,
        result: build.result ?? 'ABORTED',
        tests: await getTestReport(jobName, build.number),
      }))
    );
  }

  return { getBuilds, getTestReport };
}
