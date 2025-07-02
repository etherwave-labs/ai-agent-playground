import { logger, type IAgentRuntime, type Project, type ProjectAgent } from '@elizaos/core';
import rag from './rag.ts';
import discordPlugin from '@elizaos/plugin-discord';
import getRagPlugin from './getRagPlugin.ts';
import { character } from './character.ts';

export const projectAgent: ProjectAgent = {
  character,
  plugins: [rag, getRagPlugin],
};
const project: Project = {
  agents: [projectAgent],
};

// Export test suites for the test runner
//export { testSuites } from './__tests__/e2e';
export { character } from './character.ts';

export default project;
