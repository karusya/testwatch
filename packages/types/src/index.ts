// 1. A single test result from one build
export type TestStatus = 'passed' | 'failed' | 'skipped'
export interface TestResult {
 
  name: string;
  suiteName: string;
  file: string;
  status: TestStatus;
  duration: number;
  errorMessage?: string;
  errorStack?: string;
}

// 2. One Jenkins build with its tests
export interface BuildRun {

  buildNumber: number;
  jobName: string;
  timestamp: number;
  result: 'SUCCESS' | 'FAILURE' | 'UNSTABLE' | 'ABORTED';
  tests: TestResult[];
}

// Raw shapes returned by the Jenkins remote API (only the fields we consume).
export interface JenkinsBuildSummary {
  number: number;
  timestamp: number;
  result: BuildRun['result'] | null;
}

export interface JenkinsJob {
  builds?: JenkinsBuildSummary[];
}

export interface JenkinsTestCase {
  name: string;
  className: string;
  status: string; // PASSED | FAILED | SKIPPED | FIXED | REGRESSION
  duration: number;
  errorDetails?: string | null;
  errorStackTrace?: string | null;
}

export interface JenkinsTestSuite {
  name: string;
  cases: JenkinsTestCase[];
}

export interface JenkinsTestReport {
  suites?: JenkinsTestSuite[];
}

// 3. One test's history across builds — this is what flakiness is computed from
export interface TestHistory {

    name: string;
    flakinessScore: number;
    lastStatus: TestStatus;
    lastSeen: number;
    suiteName: string;
    file: string;
    runs: {
        buildNumber: number;
        timestamp: number;
        status: TestStatus;
        errorMessage?: string;
    }[];

}

export interface ProjectSource {
  type: 'jenkins' | 'mock'
  baseUrl?: string      // jenkins only
  jobName?: string      // jenkins only
  userEnv?: string      // name of env var holding the username
  tokenEnv?: string     // name of env var holding the API token
}

export interface Project {
  id: string            // url-safe slug, e.g. "web-e2e"
  name: string          // display name, e.g. "Web E2E Tests"
  source: ProjectSource
}