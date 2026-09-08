import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

const root = createRoot(document.getElementById('root')!);
const selectedApp = new URLSearchParams(window.location.search).get('app');

async function renderSelectedApp() {
  if (selectedApp === 'lgenz-work') {
    document.title = 'L GenZ Work';
    await import('./lgenz/lgenz-work.css');
    const { default: LGenZWork } = await import('./lgenz/LGenZWork');
    root.render(
      <StrictMode>
        <LGenZWork />
      </StrictMode>,
    );
    return;
  }

  document.title = 'HARSF — Autonomous AI Company';
  const { default: App } = await import('./App');
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void renderSelectedApp();
