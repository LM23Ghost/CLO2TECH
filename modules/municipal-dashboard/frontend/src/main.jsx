import React from 'react';
import { createRoot } from 'react-dom/client';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './styles.css';

const api = 'http://localhost:4003/api/v1';

function MapView({ area, points }) {
	const mapRef = React.useRef(null);

	React.useEffect(() => {
		const map = L.map(mapRef.current, { zoomControl: false }).setView([area.latitude, area.longitude], area.zoom);
		L.control.zoom({ position: 'bottomright' }).addTo(map);
		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
		points.forEach((point) => L.circleMarker([point.latitude, point.longitude], { radius: 8, color: '#1a1d1c', weight: 2, fillColor: '#c4e36d', fillOpacity: .95 }).bindPopup(`<strong>${point.category}</strong><br>${point.street}`).addTo(map));
		return () => map.remove();
	}, [area, points]);

	return <div className="map map-container" ref={mapRef} />;
}

function App() {
	const [reports, setReports] = React.useState([]);
	const [summary, setSummary] = React.useState({ open: 0, inProgress: 0, resolved: 0, averageResolutionHours: 0 });
	const [areas, setAreas] = React.useState([]);
	const [selectedArea, setSelectedArea] = React.useState('all');
	const [heatmap, setHeatmap] = React.useState([]);
	const [showForm, setShowForm] = React.useState(false);
	const [photos, setPhotos] = React.useState([]);
	const [photoPreviews, setPhotoPreviews] = React.useState([]);
	const [error, setError] = React.useState('');
	const [form, setForm] = React.useState({ area: 'Khayelitsha', category: 'Water leak', street: '', location: '' });

	const refresh = async () => {
		const query = selectedArea === 'all' ? '' : `?area=${encodeURIComponent(selectedArea)}`;
		const [reportsResponse, summaryResponse, heatmapResponse] = await Promise.all([fetch(`${api}/citizen/reports${query}`), fetch(`${api}/dashboard/summary${query}`), fetch(`${api}/dashboard/heatmap${query}`)]);
		setReports((await reportsResponse.json()).data);
		setSummary((await summaryResponse.json()).data);
		setHeatmap((await heatmapResponse.json()).data);
	};

	React.useEffect(() => { fetch(`${api}/areas`).then((response) => response.json()).then((payload) => setAreas(payload.data)); }, []);
	React.useEffect(() => { refresh(); }, [selectedArea]);

	const closeForm = () => {
		setShowForm(false);
		setPhotos([]);
		setPhotoPreviews([]);
		setError('');
	};

	const handlePhotos = (event) => {
		const chosen = Array.from(event.target.files ?? []);
		if (chosen.length > 3) setError('Please choose a maximum of 3 images.');
		const limited = chosen.slice(0, 3);
		setPhotos(limited);
		setPhotoPreviews(limited.map((photo) => URL.createObjectURL(photo)));
	};

	const submitReport = async (event) => {
		event.preventDefault();
		setError('');
		const payload = new FormData();
		Object.entries(form).forEach(([key, value]) => payload.append(key, value));
		photos.forEach((photo) => payload.append('photos', photo));
		const response = await fetch(`${api}/citizen/reports`, { method: 'POST', body: payload });
		if (!response.ok) { setError((await response.json()).error ?? 'Could not submit the report.'); return; }
		setSelectedArea(form.area);
		setForm({ ...form, street: '', location: '' });
		closeForm();
		refresh();
	};

	const advanceReport = async (report) => {
		const status = report.status === 'received' ? 'in_progress' : 'resolved';
		await fetch(`${api}/citizen/reports/${report.id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
		refresh();
	};

	const selectedAreaDetails = areas.find((area) => area.id === selectedArea) ?? { name: 'All service areas', subtitle: 'Municipal overview', latitude: -34, longitude: 18.65, zoom: 11 };

	return <main className="shell">
		<nav><span className="logo">CLOUD2TECH</span><label className="area-picker"><span>Viewing</span><select aria-label="Select service area" value={selectedArea} onChange={(event) => setSelectedArea(event.target.value)}>{areas.map((area) => <option key={area.id} value={area.id}>{area.level === 'province' ? `▾ ${area.name}` : area.level === 'municipality' ? `  ↳ ${area.name}` : area.level === 'neighbourhood' ? `    · ${area.name}` : area.name}</option>)}</select></label><button className="report" onClick={() => setShowForm(true)}>+ Report an issue</button></nav>
		<section className="intro"><div><p className="eyebrow">{selectedAreaDetails.subtitle}</p><h1>{selectedAreaDetails.name === 'All service areas' ? <>Make the work<br /><span>visible.</span></> : <>{selectedAreaDetails.name}<br /><span>in view.</span></>}</h1><p className="lede">A shared operating picture for residents and the teams responsible for keeping {selectedAreaDetails.name.toLowerCase()} moving.</p></div><div className="live"><span className="pulse" /> Live operations desk <small>Updated just now</small></div></section>
		<section className="metrics"><div><strong>{summary.open}</strong><span>Open reports</span></div><div><strong>{summary.inProgress}</strong><span>In progress</span></div><div><strong>{summary.resolved}</strong><span>Resolved</span></div><div><strong>{summary.averageResolutionHours ? `${summary.averageResolutionHours}h` : '—'}</strong><span>Avg. resolution time</span></div></section>
		<section className="workspace"><div><div className="map-heading"><span>LIVE MAP · OPENSTREETMAP</span><small>{selectedAreaDetails.name}</small></div><MapView area={selectedAreaDetails} points={heatmap} /></div><div className="reports"><div className="section-heading"><div><p className="eyebrow">Operations queue</p><h2>Latest reports</h2></div><span className="area-count">{reports.length} reports</span></div>{reports.map((report) => <article className="report-row" key={report.id}><span className={`category ${report.category.toLowerCase().replace(' ', '-')}`} /><div><strong>{report.category}</strong><p>{report.street} · {report.location} · {report.id}</p></div><span className={`status ${report.status}`}>{report.status.replace('_', ' ')}</span><button className="advance" onClick={() => advanceReport(report)} title="Move report forward">→</button></article>)}</div></section>
		<footer>Cloud2Tech Civic Systems <span>Transparency by default</span></footer>
		{showForm && <div className="overlay" onMouseDown={(event) => event.target === event.currentTarget && closeForm()}><form className="dialog" onSubmit={submitReport}><button type="button" className="close" onClick={closeForm}>×</button><p className="eyebrow">Citizen report</p><h2>What needs attention?</h2><label>Service area<select value={form.area} onChange={(event) => setForm({ ...form, area: event.target.value })}>{areas.filter((area) => area.id !== 'all').map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select></label><label>Issue type<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option>Water leak</option><option>Pothole</option><option>Power outage</option><option>Street light</option></select></label><label>Street name<input required value={form.street} onChange={(event) => setForm({ ...form, street: event.target.value })} placeholder="e.g. Mew Way" /></label><label>Suburb or landmark<input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="Optional location detail" /></label><label className="photo-picker">Photos <span>up to 3 · 5MB each</span><input type="file" accept="image/*" multiple onChange={handlePhotos} /><div className="photo-previews">{photoPreviews.map((preview, index) => <img key={preview} src={preview} alt={`Selected upload ${index + 1}`} />)}</div></label>{error && <p className="form-error">{error}</p>}<button className="submit" type="submit">Submit report <span>→</span></button></form></div>}
	</main>;
}

createRoot(document.getElementById('root')).render(<App />);
