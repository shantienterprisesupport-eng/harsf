export type AgentStatus = 'ready' | 'working' | 'waiting' | 'blocked';
export type Risk = 'low' | 'medium' | 'high' | 'critical';

export interface Provider {
  id: string;
  name: string;
  models: string[];
  status: 'adapter-ready' | 'research-only';
  env?: string;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
}

export interface WorkflowTask {
  id: string;
  title: string;
  agentId: string;
  risk: Risk;
  status: 'queued' | 'running' | 'approval' | 'approved' | 'rejected' | 'done';
  reason?: string;
}

export interface ChatMessage {
  id: string;
  author: 'human' | 'ceo';
  text: string;
}
