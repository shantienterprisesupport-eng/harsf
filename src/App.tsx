import { useEffect, useMemo, useState } from 'react';
import { Bot, Check, ChevronRight, CircleDot, GitBranch, Languages, Mic, Network, Send, ShieldCheck, Square, X } from 'lucide-react';
import { agents, buildLocalAssistantReply, decideTask, isAppDraftGoal, planGoal, summarizeWorkflow } from './core/orchestrator';
import { mcpServers } from './core/mcp';
import { providers } from './config/providers';
import type { ChatMessage, WorkflowTask } from './types';
import './index.css';
import './master-assistant.css';

type RecognitionCtor = new () => { lang: string; continuous: boolean; interimResults: boolean; start(): void; stop(): void; onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null; onend: (() => void) | null };

type GatewayHealth = {
  configured?: boolean;
  provider?: string;
  model?: string | null;
  providers?: string[];
  appDraftRunner?: boolean;
};

type GatewayReply = {
  text?: string;
  provider?: string;
  model?: string | null;
  error?: string;
};

type AppDraftReply = {
  ok?: boolean;
  status?: string;
  files?: string[];
  scope?: string;
  error?: string;
  details?: string;
};

const aiGatewayBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8787';
const aiGatewayUrl = `${aiGatewayBaseUrl}/api/ceo-chat`;
const appDraftUrl = `${aiGatewayBaseUrl}/api/app-draft`;

const quickJobs = [
  'HARSF ka current status check karo',
  'Naya app banao aur safe draft files ready karo',
  'L GenZ ke next build steps banao',
  'n8n automation ka plan banao',
];

export default function App() {
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [sending, setSending] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [gatewayReady, setGatewayReady] = useState<boolean | null>(null);
  const [appDraftRunnerReady, setAppDraftRunnerReady] = useState(false);
  const [activeProvider, setActiveProvider] = useState('');
  const [activeModel, setActiveModel] = useState('');
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', author: 'ceo', text: 'Namaste! Main aapka HARSF Master AI Assistant hoon. Hindi, Hinglish, Odia ya English mein kaam bolo. App build, bug fix, automation, repo planning aur project coordination ke liye workflow banaunga. Naya app bolne par safe local draft files bhi bana sakta hoon. Payment, API key, destructive action, merge ya deploy se pehle aapka approval lunga.' },
  ]);

  useEffect(() => {
    fetch(`${aiGatewayBaseUrl}/health`)
      .then((response) => response.json())
      .then((data: GatewayHealth) => {
        setGatewayReady(Boolean(data.configured));
        setAppDraftRunnerReady(Boolean(data.appDraftRunner));
        setActiveProvider(data.provider && data.provider !== 'none' ? data.provider : '');
        setActiveModel(data.model || '');
      })
      .catch(() => setGatewayReady(false));
  }, []);

  const pending = useMemo(() => tasks.filter((task) => task.status === 'approval').length, [tasks]);
  const workflowStatus = useMemo(() => summarizeWorkflow(tasks, gatewayReady), [tasks, gatewayReady]);
  const connectionLabel = gatewayReady
    ? `Master Assistant connected${activeProvider ? ` · ${activeProvider}${activeModel ? ` / ${activeModel}` : ''}` : ''}${appDraftRunnerReady ? ' · App Builder ready' : ''}`
    : 'Local planning active · model provider not connected';

  async function askAiCeo(goal: string, planned: WorkflowTask[]) {
    try {
      const history = messages.slice(-10).map((message) => ({
        role: message.author === 'human' ? 'user' : 'assistant',
        content: message.text,
      }));
      const plan = planned.map((task) => ({
        title: task.title.split(':')[0],
        agentId: task.agentId,
        risk: task.risk,
        status: task.status,
      }));

      const response = await fetch(aiGatewayUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: goal, history, plan }),
      });
      const result = await response.json() as GatewayReply;
      if (response.ok && result.text) {
        setGatewayReady(true);
        if (result.provider) setActiveProvider(result.provider);
        if (result.model) setActiveModel(result.model);
        return result.text;
      }

      setGatewayReady(false);
      return buildLocalAssistantReply(goal, planned, result.error || `Gateway HTTP ${response.status}`);
    } catch {
      setGatewayReady(false);
      return buildLocalAssistantReply(goal, planned, 'gateway reachable nahi hai');
    }
  }

  async function buildAppDraft(goal: string) {
    try {
      const response = await fetch(appDraftUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `Build a safe app draft for this request: ${goal}` }),
      });
      const result = await response.json() as AppDraftReply;
      if (!response.ok || !result.ok) {
        const reason = result.error || `App builder HTTP ${response.status}`;
        return `BLOCKED: App draft abhi complete nahi hua. ${reason}${result.details ? `\n${result.details}` : ''}`;
      }

      const files = Array.isArray(result.files) ? result.files.slice(0, 20) : [];
      const fileSummary = files.length ? `\nFiles:\n${files.map((file) => `• ${file}`).join('\n')}` : '';
      return `DONE: Safe app draft bana diya.${fileSummary}\nNEXT: Draft review ke baad tracked repo change, run, merge ya deploy ke liye Human CEO approval lagega.`;
    } catch {
      return 'BLOCKED: App draft runner tak connection nahi ho paaya. HARSF gateway/local checkout check karo.';
    }
  }

  async function submit(explicitGoal?: string) {
    const goal = (explicitGoal ?? input).trim();
    if (!goal || sending) return;
    const planned = planGoal(goal);
    setMessages((old) => [...old, { id: crypto.randomUUID(), author: 'human', text: goal }]);
    setTasks(planned);
    setInput('');
    setSending(true);
    setDrafting(false);

    const reply = await askAiCeo(goal, planned);
    setMessages((old) => [...old, { id: crypto.randomUUID(), author: 'ceo', text: reply }]);

    if (isAppDraftGoal(goal)) {
      setDrafting(true);
      const draftReply = await buildAppDraft(goal);
      setMessages((old) => [...old, { id: crypto.randomUUID(), author: 'ceo', text: draftReply }]);
      setDrafting(false);
    }

    setSending(false);
  }

  function voice() {
    const Ctor = (window as typeof window & { webkitSpeechRecognition?: RecognitionCtor; SpeechRecognition?: RecognitionCtor }).SpeechRecognition ?? (window as typeof window & { webkitSpeechRecognition?: RecognitionCtor }).webkitSpeechRecognition;
    if (!Ctor) {
      setMessages((old) => [...old, { id: crypto.randomUUID(), author: 'ceo', text: 'Is browser mein voice input available nahi hai. Text box mein likh sakte hain.' }]);
      return;
    }
    const recognition = new Ctor();
    recognition.lang = 'hi-IN';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => setInput(event.results[0][0].transcript);
    recognition.onend = () => setListening(false);
    setListening(true);
    recognition.start();
  }

  function decision(id: string, approved: boolean) {
    setTasks((old) => old.map((task) => task.id === id ? decideTask(task, approved) : task));
  }

  return <main>
    <header className="topbar">
      <div className="brand"><span className="brandmark"><Bot size={22}/></span><div><strong>HARSF</strong><small>Master AI Assistant V2</small></div></div>
      <div className="human"><ShieldCheck size={16}/> Human CEO Control</div>
    </header>

    <section className="hero">
      <div className="eyebrow"><CircleDot size={13}/> {gatewayReady === null ? 'Checking model connection…' : connectionLabel}</div>
      <h1>Kaam bolo. Assistant<br/><span>samjhega, reply karega, app draft banayega.</span></h1>
      <p>Voice ya text se command do. Naya app request safe local draft builder ko route hota hai; protected actions par final approval aapka rahega.</p>
      <div className="quick-jobs">{quickJobs.map((job) => <button key={job} disabled={sending} onClick={() => void submit(job)}>{job}</button>)}</div>
    </section>

    <section className="status-board" aria-label="Assistant status">
      <div className="status-card"><span>DONE</span><strong>{workflowStatus.done}</strong></div>
      <div className="status-card"><span>DOING</span><strong>{drafting ? 'Building safe app draft' : sending ? 'Master AI is thinking' : workflowStatus.doing}</strong></div>
      <div className="status-card"><span>BLOCKED</span><strong>{workflowStatus.blocked}</strong></div>
      <div className="status-card"><span>NEXT</span><strong>{workflowStatus.next}</strong></div>
    </section>

    <div className="layout">
      <section className="chat panel">
        <div className="panel-title"><div><h2>Master Assistant Chat</h2><p><Languages size={14}/> Odia · Hindi · Hinglish · English</p></div><span className="live">{gatewayReady ? (appDraftRunnerReady ? 'AI + BUILDER LIVE' : 'AI LIVE') : 'LOCAL PLAN'}</span></div>
        <div className="messages">{messages.map((m) => <div key={m.id} className={`message ${m.author}`}><span>{m.author === 'ceo' ? 'MASTER AI' : 'YOU'}</span>{m.text}</div>)}{sending && <div className="message ceo"><span>MASTER AI</span>{drafting ? 'App ke safe draft files bana raha hoon…' : 'Kaam samajh raha hoon…'}</div>}</div>
        <div className="composer">
          <textarea aria-label="Task command" value={input} disabled={sending} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void submit(); } }} placeholder="Jaise: Mere liye simple booking app banao…"/>
          <button className={`voice ${listening ? 'active' : ''}`} disabled={sending} aria-label="Voice input" onClick={voice}>{listening ? <Square size={18}/> : <Mic size={20}/>}</button>
          <button className="send" disabled={sending} aria-label="Send" onClick={() => void submit()}><Send size={20}/></button>
        </div>
      </section>

      <aside className="stack">
        <section className="panel approval">
          <div className="panel-title"><div><h2>Human Approval Gate</h2><p>Payment, keys, tracked code, delete, merge & deploy</p></div><b>{pending}</b></div>
          <div className="task-list">{tasks.length === 0 ? <div className="empty"><ShieldCheck/><p>No pending decisions</p><small>Protected action se pehle assistant yahin approval mangega.</small></div> : tasks.map((task) => <div className="task" key={task.id}><div><span className={`status ${task.status}`}>{task.status}</span><strong>{task.title.split(':')[0]}</strong><small>{agents.find(a => a.id === task.agentId)?.name}</small></div>{task.status === 'approval' && <div className="actions"><button aria-label="Reject" onClick={() => decision(task.id, false)}><X size={15}/></button><button aria-label="Approve" className="approve" onClick={() => decision(task.id, true)}><Check size={15}/></button></div>}</div>)}</div>
        </section>

        <section className="panel connections"><div className="panel-title"><div><h2>Connected System</h2><p>Safe adapter architecture</p></div><Network size={20}/></div>{mcpServers.map((server) => <div className="connection" key={server.id}><GitBranch size={16}/><div><strong>{server.label}</strong><small>{server.permission}</small></div><ChevronRight size={15}/></div>)}</section>
      </aside>
    </div>

    <section className="ecosystem"><div><p className="eyebrow">MODEL ROUTER</p><h2>One assistant layer, many AI providers</h2></div><div className="provider-grid">{providers.map((p) => <div className="provider" key={p.id}><span>{p.name.slice(0, 2).toUpperCase()}</span><div><strong>{p.name}</strong><small>{p.models.join(' · ')}</small></div><i className={p.status === 'adapter-ready' ? 'ready' : ''}>{p.status === 'adapter-ready' ? 'adapter' : 'research'}</i></div>)}</div></section>

    <footer><span>Master Assistant V2</span><span>App Builder + Automation Orchestrator</span><span>Human-in-the-Loop by default</span><span>No secrets stored in UI</span></footer>
  </main>;
}
