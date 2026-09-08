import { useEffect, useMemo, useState } from 'react';
import { Bot, Check, ChevronRight, CircleDot, GitBranch, Languages, Mic, Network, Send, ShieldCheck, Square, X } from 'lucide-react';
import { agents, decideTask, planGoal, summarizeWorkflow } from './core/orchestrator';
import { mcpServers } from './core/mcp';
import { providers } from './config/providers';
import type { ChatMessage, WorkflowTask } from './types';
import './index.css';

type RecognitionCtor = new () => { lang: string; continuous: boolean; interimResults: boolean; start(): void; stop(): void; onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null; onend: (() => void) | null };

const aiGatewayBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8787';
const aiGatewayUrl = `${aiGatewayBaseUrl}/api/ceo-chat`;

const quickJobs = [
  'HARSF ka current status check karo',
  'L GenZ ke next build steps banao',
  'n8n automation ka plan banao',
];

export default function App() {
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [gatewayReady, setGatewayReady] = useState<boolean | null>(null);
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', author: 'ceo', text: 'Namaste! Main aapka HARSF Master AI Assistant hoon. Hindi, Hinglish, Odia ya English mein kaam bolo. Main task samajhkar workflow banaunga, status dikhata rahunga, aur payment, API key, code change, delete, merge ya deploy se pehle aapka approval lunga.' },
  ]);

  useEffect(() => {
    fetch(`${aiGatewayBaseUrl}/health`)
      .then((response) => response.json())
      .then((data: { configured?: boolean }) => setGatewayReady(Boolean(data.configured)))
      .catch(() => setGatewayReady(false));
  }, []);

  const pending = useMemo(() => tasks.filter((task) => task.status === 'approval').length, [tasks]);
  const workflowStatus = useMemo(() => summarizeWorkflow(tasks, gatewayReady), [tasks, gatewayReady]);

  async function askAiCeo(goal: string, fallback: string) {
    try {
      const response = await fetch(aiGatewayUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: goal }),
      });
      const result = await response.json() as { text?: string };
      return response.ok && result.text ? result.text : fallback;
    } catch {
      return fallback;
    }
  }

  async function submit(explicitGoal?: string) {
    const goal = (explicitGoal ?? input).trim();
    if (!goal) return;
    const planned = planGoal(goal);
    const approvals = planned.filter((task) => task.status === 'approval').length;
    const fallback = `Goal samajh gaya. ${planned.length} steps ka workflow ready hai.${approvals ? ` ${approvals} protected actions aapke approval ke bina execute nahi honge.` : ''}`;
    setMessages((old) => [...old, { id: crypto.randomUUID(), author: 'human', text: goal }]);
    setTasks(planned);
    setInput('');
    const reply = await askAiCeo(goal, fallback);
    setMessages((old) => [...old, { id: crypto.randomUUID(), author: 'ceo', text: reply }]);
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
      <div className="brand"><span className="brandmark"><Bot size={22}/></span><div><strong>HARSF</strong><small>Master AI Assistant V1</small></div></div>
      <div className="human"><ShieldCheck size={16}/> Human CEO Control</div>
    </header>

    <section className="hero">
      <div className="eyebrow"><CircleDot size={13}/> {gatewayReady === null ? 'Checking AI connection…' : gatewayReady ? 'Master Assistant connected' : 'Planning mode — AI key not connected'}</div>
      <h1>Kaam bolo. Assistant<br/><span>plan aur coordinate karega.</span></h1>
      <p>Voice ya text se command do. Protected actions par final approval hamesha aapka rahega.</p>
      <div className="quick-jobs">{quickJobs.map((job) => <button key={job} onClick={() => void submit(job)}>{job}</button>)}</div>
    </section>

    <section className="status-board" aria-label="Assistant status">
      <div className="status-card"><span>DONE</span><strong>{workflowStatus.done}</strong></div>
      <div className="status-card"><span>DOING</span><strong>{workflowStatus.doing}</strong></div>
      <div className="status-card"><span>BLOCKED</span><strong>{workflowStatus.blocked}</strong></div>
      <div className="status-card"><span>NEXT</span><strong>{workflowStatus.next}</strong></div>
    </section>

    <div className="layout">
      <section className="chat panel">
        <div className="panel-title"><div><h2>Master Assistant Chat</h2><p><Languages size={14}/> Odia · Hindi · Hinglish · English</p></div><span className="live">{gatewayReady ? 'AI READY' : 'PLAN MODE'}</span></div>
        <div className="messages">{messages.map((m) => <div key={m.id} className={`message ${m.author}`}><span>{m.author === 'ceo' ? 'MASTER AI' : 'YOU'}</span>{m.text}</div>)}</div>
        <div className="composer">
          <textarea aria-label="Task command" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void submit(); } }} placeholder="Jaise: L GenZ booking module ka next kaam karo…"/>
          <button className={`voice ${listening ? 'active' : ''}`} aria-label="Voice input" onClick={voice}>{listening ? <Square size={18}/> : <Mic size={20}/>}</button>
          <button className="send" aria-label="Send" onClick={() => void submit()}><Send size={20}/></button>
        </div>
      </section>

      <aside className="stack">
        <section className="panel approval">
          <div className="panel-title"><div><h2>Human Approval Gate</h2><p>Payment, keys, code, delete, merge & deploy</p></div><b>{pending}</b></div>
          <div className="task-list">{tasks.length === 0 ? <div className="empty"><ShieldCheck/><p>No pending decisions</p><small>Protected action se pehle assistant yahin approval mangega.</small></div> : tasks.map((task) => <div className="task" key={task.id}><div><span className={`status ${task.status}`}>{task.status}</span><strong>{task.title.split(':')[0]}</strong><small>{agents.find(a => a.id === task.agentId)?.name}</small></div>{task.status === 'approval' && <div className="actions"><button aria-label="Reject" onClick={() => decision(task.id, false)}><X size={15}/></button><button aria-label="Approve" className="approve" onClick={() => decision(task.id, true)}><Check size={15}/></button></div>}</div>)}</div>
        </section>

        <section className="panel connections"><div className="panel-title"><div><h2>Connected System</h2><p>Safe adapter architecture</p></div><Network size={20}/></div>{mcpServers.map((server) => <div className="connection" key={server.id}><GitBranch size={16}/><div><strong>{server.label}</strong><small>{server.permission}</small></div><ChevronRight size={15}/></div>)}</section>
      </aside>
    </div>

    <section className="ecosystem"><div><p className="eyebrow">MODEL ROUTER</p><h2>One assistant layer, many AI providers</h2></div><div className="provider-grid">{providers.map((p) => <div className="provider" key={p.id}><span>{p.name.slice(0, 2).toUpperCase()}</span><div><strong>{p.name}</strong><small>{p.models.join(' · ')}</small></div><i className={p.status === 'adapter-ready' ? 'ready' : ''}>{p.status === 'adapter-ready' ? 'adapter' : 'research'}</i></div>)}</div></section>

    <footer><span>Master Assistant V1</span><span>Human-in-the-Loop by default</span><span>No secrets stored in UI</span></footer>
  </main>;
}
