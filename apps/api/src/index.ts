import Fastify from 'fastify';
import cors from '@fastify/cors';
import { createJenkinsClient } from './jenkins.ts';
import { computeHistory } from './flakiness.ts';
import { getMockBuilds } from './mock.ts';
import { projects, getProjectById } from './projects.ts';
import type { BuildRun, Project } from '@testwatch/types';

const PORT = Number(process.env.PORT ?? 3001);

// Given a project, fetch its builds (jenkins or mock).
async function loadBuildsFor(project: Project): Promise<BuildRun[]> {
  if (project.source.type === 'mock') {
    return getMockBuilds();
  }
  // jenkins: read credentials from the env vars the project names.
  const user = process.env[project.source.userEnv!] ?? '';
  const token = process.env[project.source.tokenEnv!] ?? '';
  const client = createJenkinsClient(project.source.baseUrl!, user, token);
  return client.getBuilds(project.source.jobName!);
}

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

app.get('/health', async () => ({ ok: true }));

// List projects for the UI sidebar.
app.get('/api/projects', async () => ({
  projects: projects.map((p) => ({ id: p.id, name: p.name, type: p.source.type })),
}));

// Scored test history for ONE project.
app.get<{ Params: { id: string } }>('/api/projects/:id/tests', async (req, reply) => {
  const project = getProjectById(req.params.id);
  if (!project) return reply.code(404).send({ error: 'project not found' });

  const builds = await loadBuildsFor(project);
  const tests = computeHistory(builds);

  // Most-flaky first — that's what a developer wants on top.
  tests.sort((a, b) => b.flakinessScore - a.flakinessScore);

  return {
    projectId: project.id,
    projectName: project.name,
    buildCount: builds.length,
    testCount: tests.length,
    flakyCount: tests.filter((t) => t.flakinessScore >= 40).length,
    tests,
  };
});

await app.listen({ port: PORT, host: '0.0.0.0' });
console.log(`testwatch API on http://localhost:${PORT}`);
