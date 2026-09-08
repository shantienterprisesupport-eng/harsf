import { useMemo, useState } from 'react';
import {
  BriefcaseBusiness,
  ChevronRight,
  FileCheck2,
  Hammer,
  Languages,
  Landmark,
  MapPin,
  Menu,
  ScanSearch,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  WalletCards,
  X,
} from 'lucide-react';

type ModuleKey = 'ghar' | 'legal' | 'jobs' | 'loan' | 'fake';
type Language = 'Hinglish' | 'हिन्दी' | 'English';

type Module = {
  key: ModuleKey;
  title: string;
  subtitle: string;
  icon: typeof Hammer;
  features: string[];
  badge?: string;
};

const modules: Module[] = [
  {
    key: 'ghar',
    title: 'GharSeva',
    subtitle: 'Plumber, electrician, AC, cleaning aur local services',
    icon: Hammer,
    features: ['10–15 km nearby search', 'Call / WhatsApp connect', 'Repeat booking support'],
  },
  {
    key: 'legal',
    title: 'Legal & Form Help',
    subtitle: 'Govt forms, affidavits, agreements aur paperwork help',
    icon: FileCheck2,
    features: ['Country/state aware forms', 'Final preview before submit', 'OTP & signature always by user'],
  },
  {
    key: 'jobs',
    title: 'All India Private Jobs',
    subtitle: 'Local + private jobs, simple profile aur alerts',
    icon: BriefcaseBusiness,
    features: ['Job matching', 'Resume-ready profile', 'New job alert preference'],
  },
  {
    key: 'loan',
    title: 'Loan & CIBIL',
    subtitle: 'Compare, understand aur document checklist',
    icon: WalletCards,
    features: ['No loan guarantee', 'Bank/interest comparison', 'Document readiness check'],
  },
  {
    key: 'fake',
    title: 'Real-or-Fake',
    subtitle: 'Pehle Check, Phir Trust.',
    icon: ScanSearch,
    features: ['Link / message / QR / document pre-check', 'Red flags explained', 'Safer next steps'],
    badge: 'POPULAR',
  },
];

const copy = {
  Hinglish: {
    hero: 'Daily ka kaam. Ek smart app.',
    sub: 'Service, forms, jobs, loan help aur scam checking — ek hi jagah, simple language me.',
    start: 'Start karo',
    check: 'CHECK NOW',
  },
  'हिन्दी': {
    hero: 'रोज़मर्रा का काम। एक स्मार्ट ऐप।',
    sub: 'सर्विस, फॉर्म, नौकरी, लोन सहायता और स्कैम जाँच — एक ही जगह, आसान भाषा में।',
    start: 'शुरू करें',
    check: 'अभी जाँचें',
  },
  English: {
    hero: 'Daily work. One smart app.',
    sub: 'Services, forms, jobs, loan guidance and scam checks — in one simple place.',
    start: 'Get started',
    check: 'CHECK NOW',
  },
};

function App() {
  const [language, setLanguage] = useState<Language>('Hinglish');
  const [active, setActive] = useState<ModuleKey | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return modules;
    return modules.filter((m) => `${m.title} ${m.subtitle} ${m.features.join(' ')}`.toLowerCase().includes(q));
  }, [search]);

  const text = copy[language];

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand-button" onClick={() => setActive(null)} aria-label="Go home">
          <span className="brand-mark">L</span>
          <span>
            <strong>L GenZ Work</strong>
            <small>AI-powered daily help</small>
          </span>
        </button>

        <div className="top-actions">
          <label className="language-control">
            <Languages size={17} />
            <select value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
              <option>Hinglish</option>
              <option>हिन्दी</option>
              <option>English</option>
            </select>
          </label>
          <button className="icon-button mobile-only" onClick={() => setMenuOpen((v) => !v)} aria-label="Toggle menu">
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </header>

      {menuOpen && (
        <nav className="mobile-menu">
          {modules.map((item) => (
            <button key={item.key} onClick={() => { setActive(item.key); setMenuOpen(false); }}>
              {item.title}<ChevronRight size={16} />
            </button>
          ))}
        </nav>
      )}

      <main>
        {!active ? (
          <>
            <section className="hero-section">
              <div className="hero-copy">
                <span className="eyebrow"><Sparkles size={16} /> India-first • Global-ready</span>
                <h1>{text.hero}</h1>
                <p>{text.sub}</p>
                <div className="hero-actions">
                  <button className="primary-button" onClick={() => document.getElementById('modules')?.scrollIntoView({ behavior: 'smooth' })}>
                    {text.start}<ChevronRight size={18} />
                  </button>
                  <button className="secondary-button" onClick={() => setActive('fake')}>
                    <ShieldCheck size={18} /> Real-or-Fake
                  </button>
                </div>
                <div className="trust-row">
                  <span><ShieldCheck size={16} /> Human approval for sensitive steps</span>
                  <span><Languages size={16} /> Multi-language ready</span>
                </div>
              </div>

              <div className="hero-panel">
                <div className="hero-panel-header">
                  <span>Today</span>
                  <span className="live-dot">AI READY</span>
                </div>
                <div className="quick-grid">
                  <button onClick={() => setActive('fake')}><ScanSearch /><span>Check scam</span></button>
                  <button onClick={() => setActive('ghar')}><Hammer /><span>Book service</span></button>
                  <button onClick={() => setActive('jobs')}><BriefcaseBusiness /><span>Find jobs</span></button>
                  <button onClick={() => setActive('legal')}><FileCheck2 /><span>Fill form</span></button>
                </div>
                <div className="assistant-strip">
                  <div className="assistant-avatar">AI</div>
                  <div>
                    <strong>Bas bolo kya kaam hai</strong>
                    <p>App tumhe sahi module tak le jayega.</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="search-section" id="modules">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">5 CORE MODULES</span>
                  <h2>Kaunsa kaam karna hai?</h2>
                </div>
                <label className="module-search">
                  <Search size={18} />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Service, job, form…" />
                </label>
              </div>

              <div className="module-grid">
                {filtered.map((module) => {
                  const Icon = module.icon;
                  return (
                    <button className="module-card" key={module.key} onClick={() => setActive(module.key)}>
                      <div className="module-card-top">
                        <span className="module-icon"><Icon size={25} /></span>
                        {module.badge && <span className="badge">{module.badge}</span>}
                      </div>
                      <h3>{module.title}</h3>
                      <p>{module.subtitle}</p>
                      <span className="open-link">Open module <ChevronRight size={17} /></span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="safety-section">
              <div className="safety-copy">
                <span className="eyebrow">BUILT FOR TRUST</span>
                <h2>AI madad karega. Final control aapka.</h2>
                <p>Sensitive uploads ko permanent history me rakhne ki zarurat nahi. OTP, signature, payment aur final submission jaise steps user approval ke saath hone chahiye.</p>
              </div>
              <div className="safety-cards">
                <div><ShieldCheck /><strong>Privacy-first</strong><span>Minimum data retention</span></div>
                <div><Landmark /><strong>No fake guarantee</strong><span>Loan/job outcome promises nahi</span></div>
                <div><FileCheck2 /><strong>Preview first</strong><span>Submit se pehle review</span></div>
              </div>
            </section>
          </>
        ) : (
          <ModuleView moduleKey={active} onBack={() => setActive(null)} checkLabel={text.check} />
        )}
      </main>

      <footer>
        <div><strong>L GenZ Work</strong><span>Simple help for real-world tasks.</span></div>
        <span>Prototype MVP • Human approval on sensitive actions</span>
      </footer>
    </div>
  );
}

function ModuleView({ moduleKey, onBack, checkLabel }: { moduleKey: ModuleKey; onBack: () => void; checkLabel: string }) {
  const module = modules.find((m) => m.key === moduleKey)!;
  const Icon = module.icon;

  return (
    <section className="module-page">
      <button className="back-button" onClick={onBack}>← Back to home</button>
      <div className="module-hero">
        <span className="module-icon large"><Icon size={30} /></span>
        <div>
          <span className="eyebrow">L GENZ WORK</span>
          <h1>{module.title}</h1>
          <p>{module.subtitle}</p>
        </div>
      </div>
      <div className="feature-chip-row">
        {module.features.map((feature) => <span key={feature}>{feature}</span>)}
      </div>
      {moduleKey === 'fake' && <RealOrFake checkLabel={checkLabel} />}
      {moduleKey === 'ghar' && <GharSeva />}
      {moduleKey === 'legal' && <LegalHelp />}
      {moduleKey === 'jobs' && <Jobs />}
      {moduleKey === 'loan' && <Loan />}
    </section>
  );
}

function RealOrFake({ checkLabel }: { checkLabel: string }) {
  const [kind, setKind] = useState('Website / Link');
  const [country, setCountry] = useState('India');
  const [value, setValue] = useState('');
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<{ level: 'low' | 'medium' | 'high'; title: string; reasons: string[] } | null>(null);

  function runCheck() {
    const raw = value.toLowerCase();
    const reasons: string[] = [];
    const riskyTerms = ['otp', 'urgent', 'lottery', 'winner', 'gift card', 'password', 'kyc blocked', 'account block', 'pay now', 'processing fee'];
    riskyTerms.forEach((term) => { if (raw.includes(term)) reasons.push(`Suspicious phrase detected: “${term}”`); });
    if (/https?:\/\/[^\s]*@/.test(raw)) reasons.push('Link structure looks unusual.');
    if (raw.includes('bit.ly') || raw.includes('tinyurl')) reasons.push('Shortened links hide the final destination.');
    if (/\b\d{10,}\b/.test(raw) && (raw.includes('whatsapp') || raw.includes('call'))) reasons.push('Direct contact request needs independent verification.');
    if (!value.trim() && fileName) reasons.push('File selected. Full file analysis needs the connected scan backend.');
    if (!value.trim() && !fileName) reasons.push('Add a message, link, number, or file to perform a useful check.');

    const level = reasons.length >= 3 ? 'high' : reasons.length >= 1 ? 'medium' : 'low';
    setResult({
      level,
      title: level === 'high' ? 'High caution' : level === 'medium' ? 'Needs verification' : 'No obvious red flag found',
      reasons,
    });
  }

  return (
    <div className="workspace-grid">
      <div className="work-card checker-card">
        <div className="card-heading"><div><span className="eyebrow">QUICK PRE-CHECK</span><h2>Pehle Check, Phir Trust.</h2></div><ShieldCheck size={27} /></div>
        <div className="form-grid two-col">
          <label>What are you checking?<select value={kind} onChange={(e) => setKind(e.target.value)}><option>Website / Link</option><option>WhatsApp / SMS</option><option>Phone number</option><option>Email</option><option>Job offer</option><option>UPI / Payment</option><option>Govt notice</option><option>Social profile</option><option>Document / PDF</option></select></label>
          <label>Country<select value={country} onChange={(e) => setCountry(e.target.value)}><option>India</option><option>USA</option><option>UK</option><option>Canada</option><option>Australia</option><option>Other</option></select></label>
        </div>
        <label>Paste message, link, phone number or details<textarea value={value} onChange={(e) => setValue(e.target.value)} placeholder="Example: paste suspicious message or URL here…" rows={6} /></label>
        <label className="upload-box"><Upload size={22} /><span>{fileName || 'Upload screenshot, QR, PDF or image'}</span><input type="file" onChange={(e) => setFileName(e.target.files?.[0]?.name || '')} /></label>
        <button className="primary-button wide" onClick={runCheck}>{checkLabel}<ScanSearch size={18} /></button>
        <p className="fine-print">This screen provides a local pre-check only. Do not send OTP, password, PIN, or full card details.</p>
      </div>

      <div className="work-card result-card">
        <span className="eyebrow">RESULT</span>
        {!result ? (
          <div className="empty-state"><ScanSearch size={44} /><h3>Ready to check</h3><p>Add the suspicious item and tap the check button.</p></div>
        ) : (
          <div className={`risk-result ${result.level}`}>
            <span className="risk-pill">{result.level.toUpperCase()} RISK</span>
            <h3>{result.title}</h3>
            {result.reasons.length > 0 ? <ul>{result.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul> : <p>No simple text-pattern warning was detected. Still verify money requests, identities and official domains independently.</p>}
            <div className="next-step"><strong>Safer next step</strong><span>Official app/site khud open karo. Message ke link se login ya payment mat karo jab tak source verify na ho.</span></div>
          </div>
        )}
      </div>
    </div>
  );
}

function GharSeva() {
  const [searched, setSearched] = useState(false);
  return (
    <div className="workspace-grid">
      <div className="work-card"><span className="eyebrow">FIND A SERVICE</span><h2>Nearby worker dhundo</h2><div className="form-grid"><label>Service<select><option>Plumber</option><option>Electrician</option><option>AC / Heater</option><option>Carpenter</option><option>Painter</option><option>Cleaning</option><option>Mechanic</option></select></label><label>Area / PIN code<div className="input-icon"><MapPin size={18} /><input placeholder="Enter area or PIN" /></div></label></div><button className="primary-button wide" onClick={() => setSearched(true)}>Search nearby<Search size={18} /></button></div>
      <div className="work-card"><span className="eyebrow">RESULTS</span>{searched ? <div className="generic-results"><div><strong>Nearby verified options</strong><span>Provider onboarding data connect hone par live list yahan aayegi.</span><button>Set service request</button></div><div><strong>Repeat service</strong><span>Daily cleaning ya weekly car wash schedule support.</span><button>Set schedule</button></div></div> : <div className="empty-state"><Hammer size={44} /><h3>Search your area</h3><p>10–15 km service discovery flow ready hai.</p></div>}</div>
    </div>
  );
}

function LegalHelp() {
  const [started, setStarted] = useState(false);
  return (
    <div className="workspace-grid">
      <div className="work-card"><span className="eyebrow">FORM ASSISTANT</span><h2>Paperwork simple banao</h2><div className="form-grid two-col"><label>Country<select><option>India</option><option>USA</option><option>UK</option><option>Canada</option><option>Other</option></select></label><label>Help type<select><option>Govt form</option><option>Affidavit</option><option>Agreement</option><option>Correction request</option><option>PF / Tax / GST</option><option>College / School paperwork</option></select></label></div><button className="primary-button wide" onClick={() => setStarted(true)}>Create checklist<FileCheck2 size={18} /></button></div>
      <div className="work-card"><span className="eyebrow">SAFE FLOW</span>{started ? <ol className="step-list"><li><strong>1. Identify form</strong><span>State/country aur purpose confirm karo.</span></li><li><strong>2. Collect minimum docs</strong><span>Sirf required documents.</span></li><li><strong>3. Preview</strong><span>Submission se pehle final review.</span></li><li><strong>4. User action</strong><span>OTP, e-sign aur final submit user kare.</span></li></ol> : <div className="empty-state"><FileCheck2 size={44} /><h3>Start a checklist</h3><p>Form type choose karte hi safe workflow dikhega.</p></div>}</div>
    </div>
  );
}

function Jobs() {
  const [ready, setReady] = useState(false);
  return (
    <div className="workspace-grid">
      <div className="work-card"><span className="eyebrow">JOB MATCH</span><h2>Simple profile, better matching</h2><div className="form-grid"><label>Role<input placeholder="e.g. Sales, Driver, Office, Teacher" /></label><label>City<input placeholder="City / district" /></label><label>Experience<select><option>Fresher</option><option>0–1 year</option><option>1–3 years</option><option>3+ years</option></select></label></div><button className="primary-button wide" onClick={() => setReady(true)}>Find matching jobs<BriefcaseBusiness size={18} /></button></div>
      <div className="work-card"><span className="eyebrow">JOB ALERT</span>{ready ? <div className="generic-results"><div><strong>Profile ready</strong><span>Live job-source connector add hone ke baad matching vacancies yahan aayengi.</span><button>Turn on alerts</button></div><div><strong>Resume assist</strong><span>Name, skills aur experience se simple resume flow.</span><button>Create resume profile</button></div></div> : <div className="empty-state"><BriefcaseBusiness size={44} /><h3>Tell us the job</h3><p>Role aur city dalke matching flow start karo.</p></div>}</div>
    </div>
  );
}

function Loan() {
  const [view, setView] = useState(false);
  return (
    <div className="workspace-grid">
      <div className="work-card"><span className="eyebrow">LOAN & CIBIL HELP</span><h2>Compare first. Apply carefully.</h2><div className="form-grid"><label>Need<select><option>Understand CIBIL</option><option>Personal loan comparison</option><option>Business loan comparison</option><option>Document checklist</option></select></label><label>Monthly income<input inputMode="numeric" placeholder="Approx monthly income" /></label><label>Existing EMI<input inputMode="numeric" placeholder="Approx EMI, if any" /></label></div><button className="primary-button wide" onClick={() => setView(true)}>Show safe checklist<WalletCards size={18} /></button></div>
      <div className="work-card"><span className="eyebrow">IMPORTANT</span>{view ? <div className="generic-results"><div><strong>No approval guarantee</strong><span>Eligibility lender decide karta hai. App comparison aur readiness me help karega.</span></div><div><strong>Protect credentials</strong><span>OTP, PIN aur net-banking password kabhi agent ko mat do.</span></div><div><strong>Compare total cost</strong><span>Interest ke saath processing fee aur repayment terms bhi dekho.</span></div></div> : <div className="empty-state"><Landmark size={44} /><h3>Start with your goal</h3><p>Loan type choose karke safe guidance dekho.</p></div>}</div>
    </div>
  );
}

export default App;
