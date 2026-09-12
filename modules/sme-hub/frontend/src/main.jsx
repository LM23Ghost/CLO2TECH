import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const areas = [
  ['Auth & billing', 'Subscriptions and secure account setup'],
  ['Support portal', 'Track requests without the inbox chase'],
  ['Onboarding wizard', 'Microsoft 365 and backup, guided'],
];

function App() {
  return <main className="shell"><p className="eyebrow">Cloud2Tech / SME Cloud Hub</p><h1>Professional IT, without the full-time department.</h1><p className="lede">A focused workspace for small teams to subscribe, get help, and get cloud-ready.</p><section className="grid">{areas.map(([title, description]) => <article key={title}><span className="dot" /><h2>{title}</h2><p>{description}</p><button>Open module <span>→</span></button></article>)}</section><footer>API status · <strong>Ready for connection</strong></footer></main>;
}

createRoot(document.getElementById('root')).render(<App />);
