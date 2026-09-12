import React from 'react';
import { createRoot } from 'react-dom/client';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './styles.css';

const api = 'http://localhost:4003/api/v1';

function AreaPicker({ areas, selectedArea, onSelect }) {
	const [open, setOpen] = React.useState(false);
	const [browseParent, setBrowseParent] = React.useState(null);
	const [search, setSearch] = React.useState('');
	const pickerRef = React.useRef(null);
	const selected = areas.find((area) => area.id === selectedArea) ?? areas[0];
	const parent = areas.find((area) => area.id === browseParent);
	const children = (parentId) => areas.filter((area) => area.parentId === parentId);
	const hasChildren = (area) => children(area.id).length > 0;
	const matches = (area) => `${area.name} ${area.subtitle}`.toLowerCase().includes(search.trim().toLowerCase());
	const visibleAreas = search.trim() ? areas.filter((area) => area.id !== 'all' && matches(area)) : browseParent ? children(browseParent) : areas.filter((area) => area.id === 'all' || area.level === 'province');

	React.useEffect(() => {
		const closeOnOutsideClick = (event) => {
			if (pickerRef.current && !pickerRef.current.contains(event.target)) setOpen(false);
		};
		document.addEventListener('mousedown', closeOnOutsideClick);
		return () => document.removeEventListener('mousedown', closeOnOutsideClick);
	}, []);

	const choose = (areaId) => {
		const area = areas.find((item) => item.id === areaId);
		if (area && hasChildren(area) && !search.trim()) {
			setBrowseParent(area.id);
			return;
		}
		onSelect(areaId);
		setOpen(false);
		setBrowseParent(null);
		setSearch('');
	};

	const toggle = () => { setOpen(!open); setBrowseParent(null); setSearch(''); };

	return <div className="area-picker" ref={pickerRef}>
		<span className="area-label">Viewing</span>
		<button className={`area-trigger ${open ? 'is-open' : ''}`} type="button" aria-haspopup="listbox" aria-expanded={open} onClick={toggle}>
			<span><strong>{selected?.name ?? 'Choose an area'}</strong><small>{selected?.subtitle ?? 'Service area'}</small></span><span className="chevron">⌄</span>
		</button>
		{open && <div className="area-menu" role="listbox" aria-label="Service areas">
			<div className="area-search"><span>⌕</span><input autoFocus value={search} onChange={(event) => { setSearch(event.target.value); setBrowseParent(null); }} placeholder="Search area, city, or suburb" aria-label="Search areas" /></div>
			<div className="area-menu-head">{browseParent && !search ? <button type="button" className="back-area" onClick={() => { const current = areas.find((area) => area.id === browseParent); setBrowseParent(current?.parentId === 'all' ? null : current?.parentId ?? null); }}>← Back</button> : <span>{search ? 'Search results' : parent ? parent.name : 'Choose a province'}</span>}<small>{search ? `${visibleAreas.length} matches` : browseParent ? `${visibleAreas.length} areas` : `${areas.filter((area) => area.level === 'province').length} provinces`}</small></div>
			{visibleAreas.length ? visibleAreas.map((area) => <button key={area.id} className={`area-option level-${area.level} ${area.id === selectedArea ? 'is-selected' : ''}`} type="button" role="option" aria-selected={area.id === selectedArea} onClick={() => choose(area.id)}><span className="area-dot" /> <span className="area-option-copy"><strong>{area.name}</strong><small>{area.subtitle}</small></span>{hasChildren(area) && !search && <span className="option-arrow">→</span>}{area.id === selectedArea && <span className="check">✓</span>}</button>) : <div className="empty-areas">No places match that search.</div>}
		</div>}
	</div>;
}

function AuthDialog({ areas, onAuthenticated, onClose }) {
	const [mode, setMode] = React.useState('login');
	const [form, setForm] = React.useState({ name: '', email: '', password: '', phone: '', preferredArea: 'all' });
	const [error, setError] = React.useState('');

	const submit = async (event) => {
		event.preventDefault();
		setError('');
		const response = await fetch(`${api}/auth/${mode === 'login' ? 'login' : 'signup'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
		const payload = await response.json();
		if (!response.ok) { setError(payload.error ?? 'Could not sign in.'); return; }
		onAuthenticated(payload.data);
	};

	return <div className="overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><form className="dialog auth-dialog" onSubmit={submit}><button type="button" className="close" onClick={onClose}>×</button><p className="eyebrow">Cloud2Tech account</p><h2>{mode === 'login' ? 'Welcome back.' : 'Save your service area.'}</h2><div className="auth-tabs"><button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Sign in</button><button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>Create account</button></div>{mode === 'signup' && <><label>Your name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Thabo Mokoena" /></label><label>Mobile number <span>optional</span><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+27 82 000 0000" /></label></>}<label>Email address<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@example.com" /></label><label>Password <span>{mode === 'signup' ? '8 characters minimum' : ''}</span><input required type="password" minLength={mode === 'signup' ? 8 : undefined} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="••••••••" /></label>{mode === 'signup' && <label>Preferred area<select value={form.preferredArea} onChange={(event) => setForm({ ...form, preferredArea: event.target.value })}>{areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select></label>}{error && <p className="form-error">{error}</p>}<button className="submit" type="submit">{mode === 'login' ? 'Sign in' : 'Create account'} <span>→</span></button></form></div>;
}

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
	const [showAuth, setShowAuth] = React.useState(false);
	const [user, setUser] = React.useState(null);
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

	React.useEffect(() => {
		fetch(`${api}/areas`).then((response) => response.json()).then((payload) => setAreas(payload.data));
		const token = localStorage.getItem('cloud2tech_token');
		if (token) fetch(`${api}/auth/me`, { headers: { Authorization: `Bearer ${token}` } }).then((response) => response.ok ? response.json() : Promise.reject()).then((payload) => { setUser(payload.data); setSelectedArea(payload.data.preferredArea ?? 'all'); }).catch(() => localStorage.removeItem('cloud2tech_token'));
	}, []);
	React.useEffect(() => { refresh(); }, [selectedArea]);

	const selectArea = async (areaId) => {
		setSelectedArea(areaId);
		const token = localStorage.getItem('cloud2tech_token');
		if (token) {
			const response = await fetch(`${api}/auth/profile`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ preferredArea: areaId }) });
			if (response.ok) setUser((await response.json()).data);
		}
	};

	const handleAuthenticated = ({ token, user: authenticatedUser }) => {
		localStorage.setItem('cloud2tech_token', token);
		setUser(authenticatedUser);
		setSelectedArea(authenticatedUser.preferredArea ?? 'all');
		setShowAuth(false);
	};

	const logout = () => { localStorage.removeItem('cloud2tech_token'); setUser(null); setSelectedArea('all'); };

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
		<nav><span className="logo">CLOUD2TECH</span><AreaPicker areas={areas} selectedArea={selectedArea} onSelect={selectArea} /><div className="nav-actions">{user ? <div className="account-menu"><button className="account-button" type="button" onClick={logout}><span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span><span>{user.name.split(' ')[0]}</span><small>Sign out</small></button></div> : <button className="login-button" type="button" onClick={() => setShowAuth(true)}>Sign in</button>}<button className="report" onClick={() => setShowForm(true)}>+ Report an issue</button></div></nav>
		<section className="intro"><div><p className="eyebrow">{selectedAreaDetails.subtitle}</p><h1>{selectedAreaDetails.name === 'All service areas' ? <>Make the work<br /><span>visible.</span></> : <>{selectedAreaDetails.name}<br /><span>in view.</span></>}</h1><p className="lede">A shared operating picture for residents and the teams responsible for keeping {selectedAreaDetails.name.toLowerCase()} moving.</p></div><div className="live"><span className="pulse" /> Live operations desk <small>Updated just now</small></div></section>
		<section className="metrics"><div><strong>{summary.open}</strong><span>Open reports</span></div><div><strong>{summary.inProgress}</strong><span>In progress</span></div><div><strong>{summary.resolved}</strong><span>Resolved</span></div><div><strong>{summary.averageResolutionHours ? `${summary.averageResolutionHours}h` : '—'}</strong><span>Avg. resolution time</span></div></section>
		<section className="workspace"><div><div className="map-heading"><span>LIVE MAP · OPENSTREETMAP</span><small>{selectedAreaDetails.name}</small></div><MapView area={selectedAreaDetails} points={heatmap} /></div><div className="reports"><div className="section-heading"><div><p className="eyebrow">Operations queue</p><h2>Latest reports</h2></div><span className="area-count">{reports.length} reports</span></div>{reports.map((report) => <article className="report-row" key={report.id}><span className={`category ${report.category.toLowerCase().replace(' ', '-')}`} /><div><strong>{report.category}</strong><p>{report.street} · {report.location} · {report.id}</p></div><span className={`status ${report.status}`}>{report.status.replace('_', ' ')}</span><button className="advance" onClick={() => advanceReport(report)} title="Move report forward">→</button></article>)}</div></section>
		<footer>Cloud2Tech Civic Systems <span>Transparency by default</span></footer>
		{showAuth && <AuthDialog areas={areas} onAuthenticated={handleAuthenticated} onClose={() => setShowAuth(false)} />}
		{showForm && <div className="overlay" onMouseDown={(event) => event.target === event.currentTarget && closeForm()}><form className="dialog" onSubmit={submitReport}><button type="button" className="close" onClick={closeForm}>×</button><p className="eyebrow">Citizen report</p><h2>What needs attention?</h2><label>Service area<select value={form.area} onChange={(event) => setForm({ ...form, area: event.target.value })}>{areas.filter((area) => area.id !== 'all').map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select></label><label>Issue type<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option>Water leak</option><option>Pothole</option><option>Power outage</option><option>Street light</option></select></label><label>Street name<input required value={form.street} onChange={(event) => setForm({ ...form, street: event.target.value })} placeholder="e.g. Mew Way" /></label><label>Suburb or landmark<input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="Optional location detail" /></label><label className="photo-picker">Photos <span>up to 3 · 5MB each</span><input type="file" accept="image/*" multiple onChange={handlePhotos} /><div className="photo-previews">{photoPreviews.map((preview, index) => <img key={preview} src={preview} alt={`Selected upload ${index + 1}`} />)}</div></label>{error && <p className="form-error">{error}</p>}<button className="submit" type="submit">Submit report <span>→</span></button></form></div>}
	</main>;
}

createRoot(document.getElementById('root')).render(<App />);
