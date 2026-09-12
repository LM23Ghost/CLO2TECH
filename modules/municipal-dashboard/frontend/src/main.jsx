import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const api = 'http://localhost:4003/api/v1';

function App() {
	const [reports, setReports] = React.useState([]);
	const [summary, setSummary] = React.useState({ open: 0, inProgress: 0, resolved: 0 });
	const [showForm, setShowForm] = React.useState(false);
	const [form, setForm] = React.useState({ category: 'Water leak', location: '' });

	const refresh = async () => {
		const [reportsResponse, summaryResponse] = await Promise.all([fetch(`${api}/citizen/reports`), fetch(`${api}/dashboard/summary`)]);
		setReports((await reportsResponse.json()).data);
		setSummary((await summaryResponse.json()).data);
	};

	React.useEffect(() => { refresh(); }, []);

	const submitReport = async (event) => {
		event.preventDefault();
		await fetch(`${api}/citizen/reports`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
		setForm({ category: 'Water leak', location: '' });
		setShowForm(false);
		refresh();
	};

	const advanceReport = async (report) => {
		const status = report.status === 'received' ? 'in_progress' : 'resolved';
		await fetch(`${api}/citizen/reports/${report.id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
		refresh();
	};

	return <main className="shell">
		<nav><span className="logo">CLOUD2TECH</span><span className="location">MUNICIPAL SERVICES / DEMO WARD</span><button className="report" onClick={() => setShowForm(true)}>+ Report an issue</button></nav>
		<section className="intro"><div><p className="eyebrow">Service delivery, in view</p><h1>Make the work<br /><span>visible.</span></h1><p className="lede">A shared operating picture for residents and the teams responsible for keeping a city moving.</p></div><div className="live"><span className="pulse" /> Live operations desk <small>Updated just now</small></div></section>
		<section className="metrics"><div><strong>{summary.open}</strong><span>Open reports</span></div><div><strong>{summary.inProgress}</strong><span>In progress</span></div><div><strong>{summary.resolved}</strong><span>Resolved</span></div><div><strong>18.4h</strong><span>Avg. resolution</span></div></section>
		<section className="workspace"><div className="map"><div className="map-label">LIVE SERVICE MAP <span>●</span></div><div className="route route-a" /><div className="route route-b" /><i className="pin pin-a" /><i className="pin pin-b" /><i className="pin pin-c" /><i className="pin pin-d" /><div className="map-center">Ward activity<br /><small>Mapbox integration ready</small></div></div><div className="reports"><div className="section-heading"><div><p className="eyebrow">Operations queue</p><h2>Latest reports</h2></div><button className="filter">All wards ▾</button></div>{reports.map((report) => <article className="report-row" key={report.id}><span className={`category ${report.category.toLowerCase().replace(' ', '-')}`} /><div><strong>{report.category}</strong><p>{report.location} · {report.id}</p></div><span className={`status ${report.status}`}>{report.status.replace('_', ' ')}</span><button className="advance" onClick={() => advanceReport(report)} title="Move report forward">→</button></article>)}</div></section>
		<footer>Cloud2Tech Civic Systems <span>Transparency by default</span></footer>
		{showForm && <div className="overlay" onMouseDown={(event) => event.target === event.currentTarget && setShowForm(false)}><form className="dialog" onSubmit={submitReport}><button type="button" className="close" onClick={() => setShowForm(false)}>×</button><p className="eyebrow">Citizen report</p><h2>What needs attention?</h2><label>Issue type<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option>Water leak</option><option>Pothole</option><option>Power outage</option><option>Street light</option></select></label><label>Location<input required value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="Street, suburb, or ward" /></label><button className="submit" type="submit">Submit report <span>→</span></button></form></div>}
	</main>;
}

createRoot(document.getElementById('root')).render(<App />);
