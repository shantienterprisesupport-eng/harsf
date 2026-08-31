export const mcpServers = [
  { id: 'github', label: 'GitHub Repository', transport: 'MCP', permission: 'read/write via approval' },
  { id: 'local-git', label: 'Local Git', transport: 'MCP', permission: 'workspace-scoped' },
  { id: 'vector-db', label: 'Vector Memory', transport: 'MCP adapter', permission: 'project memory only' },
];

export const safetyPolicy = {
  autoAllowed: ['read repository', 'analyze code', 'run tests', 'draft plan'],
  humanApproval: ['all code changes', 'bug fixes', 'merge', 'deploy', 'secrets', 'destructive actions'],
};
