import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const metrics = [['12', 'Open reports'], ['04', 'Assigned today'], ['86%', 'Within SLA']];
function App() { return <main className="shell"><nav><span className="logo">CLOUD2TECH</span><span className="location">MUNICIPAL SERVICES / DEMO WARD</span><button className="report">+ Report an issue</button></nav><section className="hero"><p className="eyebrow">Service delivery, in view</p><h1>Make the work<br /><span>visible.</span></h1><p className="lede">A shared operating picture for residents and the teams responsible for keeping a city moving.</p></section><section className="metrics">{metrics.map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</section><section className="map"><div className="map-label">LIVE SERVICE MAP <span>●</span></div><div className="route route-a" /><div className="route route-b" /><i className="pin pin-a" /><i className="pin pin-b" /><i className="pin pin-c" /><p>Service activity will appear here<br /><small>Connect Mapbox to load ward data</small></p></section><footer>Cloud2Tech Civic Systems <span>Transparency by default</span></footer></main> }
createRoot(document.getElementById('root')).render(<App />);
