import { useEffect, useState } from 'react';
import type { TestHistory } from '@testwatch/types';

interface ProjectInfo {
  id: string;
  name: string;
  type: string;
}

interface TestsResponse {
  projectName: string;
  buildCount: number;
  testCount: number;
  flakyCount: number;
  tests: TestHistory[];
}

// Map a flakiness score to a badge color (CSS variables defined in styles.css).
function scoreColor(score: number): string {
  if (score >= 70) return 'var(--score-red)';
  if (score >= 40) return 'var(--score-orange)';
  if (score > 0) return 'var(--score-yellow)';
  return 'var(--score-green)';
}

export function App() {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [data, setData] = useState<TestsResponse | null>(null);

  // Runs once on mount: load the project list.
  useEffect(() => {
    fetch('/api/projects')
      .then((res) => res.json())
      .then((body) => setProjects(body.projects));
  }, []);

  // Runs whenever selectedId changes: load that project's tests.
  useEffect(() => {
    if (!selectedId) return;
    fetch(`/api/projects/${selectedId}/tests`)
      .then((res) => res.json())
      .then((data) => setData(data));
  }, [selectedId]);

  return (
    <div className="layout">
      <aside className="sidebar">
        <p className="brand">testwatch</p>
        <p className="brand-sub">flaky test intelligence</p>

        <p className="nav-label">Projects</p>
        {projects.map((p) => (
          <button
            key={p.id}
            className={`project-btn${p.id === selectedId ? ' active' : ''}`}
            onClick={() => setSelectedId(p.id)}
          >
            <span>{p.name}</span>
            <span className="arrow">→</span>
          </button>
        ))}
      </aside>

      <main className="main">
        {!data ? (
          <p className="placeholder">Select a project to see its flaky tests.</p>
        ) : (
          <>
            <h1 className="title">{data.projectName}</h1>
            <p className="summary">
              <strong>{data.testCount}</strong> tests ·{' '}
              <strong>{data.flakyCount}</strong> flaky ·{' '}
              <strong>{data.buildCount}</strong> builds
            </p>

            <table>
              <thead>
                <tr>
                  <th>Score</th>
                  <th>Test</th>
                  <th>Suite</th>
                  <th>Last run</th>
                </tr>
              </thead>
              <tbody>
                {data.tests.map((t) => (
                  <tr key={`${t.suiteName}::${t.name}`}>
                    <td>
                      <span
                        className="badge"
                        style={{ background: scoreColor(t.flakinessScore) }}
                      >
                        {t.flakinessScore}
                      </span>
                    </td>
                    <td className="test-name">{t.name}</td>
                    <td className="muted-cell">{t.suiteName}</td>
                    <td>
                      <span className={`status ${t.lastStatus}`}>
                        {t.lastStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </main>
    </div>
  );
}
