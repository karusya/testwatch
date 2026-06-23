import type { Project } from '@testwatch/types'

export const projects: Project[] = [
   {
    id: 'demo',
    name: 'Demo (mock data)',
    source: { type: 'mock' },
  },
]

export function getProjectById(id: string): Project | undefined {
  return projects.find((p) => p.id === id);
}