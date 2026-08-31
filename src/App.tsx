import { useMemo, useState } from 'react';
import { Bot, Check, ChevronRight, CircleDot, GitBranch, Languages, Mic, Network, Send, ShieldCheck, Square, X } from 'lucide-react';
import { agents, decideTask, planGoal } from './core/orchestrator';
import { mcpServers } from './core/mcp';
import { providers } from './config/providers';
import type { ChatMessage, WorkflowTask } from './types';
import './index.css';

type RecognitionCtor = new () => { lang: string; continuous: boolean; interimResults: boolean; start(): void; stop(): void; onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null; onend: (() => void) | null };

export default function App() {
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', author: 'ceo', text: 'Namaste! Apna app idea Hindi, Hinglish, Odia ya English mein bolo. Main team ko plan assign karunga; code aur bug-fix par final approval aapka rahega.' },
  ]);
  const pending = useMemo(() => tasks.filter((task) => task.status === 'approval').length, [tasks]);

  function submit() {
    const goal = input.trim();
    if (!goal) return;
    const planned = planGoal(goal);
    setMessages((old) => [...old, { id: crypto.randomUUID(), author: 'human', text: goal }, { id: crypto.randomUUID(), author: 'ceo', text: `Goal samajh gaya. ${planned.length} tasks banaye; ${planned.filter(t => t.status === 'approval').length} decisions aapke approval mein hain.` }]);
    setTasks(planned);
    setInput('');
  }

  function voice() {
    const Ctor = (window as typeof window & { webkitSpeechRecognition?: RecognitionCtor; SpeechRecognition?: RecognitionCtor }).SpeechRecognition ?? (window as typeof window & { webkitSpeechRecognition?: RecognitionCtor }).webkitSpeechRecognition;
    if (!Ctor) { setMessages((old) => [...old, { id: crypto.randomUUID(), author: 'ceo', text: 'Is browser mein voice input available nahi hai. Text box mein likh sakte hain.' }]); return; }
    const recognition = new Ctor();
    recognition.lang = 'hi-IN'; recognition.continuous = false; recognition.interimResults = false;
    recognition.onresult = (event) => setInput(event.results[0][0].transcript);
    recognition.onend = () => setListening(false);
    setListening(true); recognition.start();
  }

  function decision(id: string, approved: boolean) {
    setTasks((old) => old.map((task) => task.id === id ? decideTask(task, approved) : task));
  }

  return <main>
    <header className="topbar"><div className="brand"><span className="brandmark"><Bot size={22}/></span><div><strong>HARSF</strong><small>Autonomous AI Company</small></div></div><div className="human"><ShieldCheck size={16}/> Human CEO Control</div></header>
    <section className="hero"><div className="eyebrow"><CircleDot size={13}/> AI CEO online</div><h1>Idea bolo. AI company<br/><span>plan aur build karegi.</span></h1><p>Simple language se multi-agent software workflow — every code decision stays under your approval.</p></section>

    <div className="layout">
      <section className="chat panel">
        <div className="panel-title"><div><h2>CEO Chat</h2><p><Languages size={14}/> Odia · Hindi · Hinglish · English</p></div><span className="live">LIVE</span></div>
        <div className="messages">{messages.map((m) => <div key={m.id} className={`message ${m.author}`}><span>{m.author === 'ceo' ? 'AI CEO' : 'YOU'}</span>{m.text}</div>)}</div>
        <div className="composer"><textarea aria-label="App idea" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }} placeholder="Jaise: Mere liye ek local shop inventory app banao…"/><button className={`voice ${listening ? 'active' : ''}`} aria-label="Voice input" onClick={voice}>{listening ? <Square size={18}/> : <Mic size={20}/>}</button><button className="send" aria-label="Send" onClick={submit}><Send size={20}/></button></div>
      </section>

      <aside className="stack">
        <section className="panel approval"><div className="panel-title"><div><h2>Human Approval Gate</h2><p>Code, bugs, merge & deploy</p></div><b>{pending}</b></div>
          <div className="task-list">{tasks.length === 0 ? <div className="empty"><ShieldCheck/><p>No pending decisions</p><small>AI CEO will ask before any protected action.</small></div> : tasks.map((task) => <div className="task" key={task.id}><div><span className={`status ${task.status}`}>{task.status}</span><strong>{task.title.split(':')[0]}</strong><small>{agents.find(a => a.id === task.agentId)?.name}</small></div>{task.status === 'approval' && <div className="actions"><button aria-label="Reject" onClick={() => decision(task.id, false)}><X size={15}/></button><button aria-label="Approve" className="approve" onClick={() => decision(task.id, true)}><Check size={15}/></button></div>}</div>)}</div>
        </section>
        <section className="panel connections"><div className="panel-title"><div><h2>Connected System</h2><p>Safe adapter architecture</p></div><Network size={20}/></div>{mcpServers.map((server) => <div className="connection" key={server.id}><GitBranch size={16}/><div><strong>{server.label}</strong><small>{server.permission}</small></div><ChevronRight size={15}/></div>)}</section>
      </aside>
    </div>

    <section className="ecosystem"><div><p className="eyebrow">MODEL ROUTER</p><h2>One orchestration layer, many AI providers</h2></div><div className="provider-grid">{providers.map((p) => <div className="provider" key={p.id}><span>{p.name.slice(0, 2).toUpperCase()}</span><div><strong>{p.name}</strong><small>{p.models.join(' · ')}</small></div><i className={p.status === 'adapter-ready' ? 'ready' : ''}>{p.status === 'adapter-ready' ? 'adapter' : 'research'}</i></div>)}</div></section>
    <footer><span>Ruflo-ready orchestration</span><span>Human-in-the-Loop by default</span><span>No secrets stored in UI</span></footer>
  </main>;
}
