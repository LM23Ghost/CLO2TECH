import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const areas = [['Device inventory', 'Know what arrived, where it is, and what it needs'], ['Education cloud', 'A clear path to Teams, SharePoint, and OneDrive'], ['People and policy', 'Training and security baselines that stick']];
function App() { return <main className="shell"><header><span className="mark">C2T</span><p className="eyebrow">School Digital Inclusion</p></header><h1>More access.<br /><em>More possibility.</em></h1><p className="lede">A practical command centre for turning donated devices and cloud access into confident classrooms.</p><section className="grid">{areas.map(([title, description], index) => <article key={title}><span className="number">0{index + 1}</span><h2>{title}</h2><p>{description}</p><button>Explore <span>↗</span></button></article>)}</section><footer><span>Johannesburg · South Africa</span><span>Platform status: <strong>Operational</strong></span></footer></main> }
createRoot(document.getElementById('root')).render(<App />);
