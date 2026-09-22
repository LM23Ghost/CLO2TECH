import React from 'react';
import { createRoot } from 'react-dom/client';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './styles.css';

const api = import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:4003/api/v1';

const formatElapsed = (timestamp, now = Date.now()) => {
	if (!timestamp) return 'Time unavailable';
	const minutes = Math.max(0, Math.floor((now - new Date(timestamp).getTime()) / 60000));
	if (minutes < 1) return 'just now';
	if (minutes < 60) return `${minutes}m`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ${minutes % 60}m`;
	return `${Math.floor(hours / 24)}d ${hours % 24}h`;
};

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
		if (area && area.id !== 'all' && hasChildren(area) && !search.trim()) {
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
			<span><strong>{selected?.name ?? 'Choose an area'}</strong><small>{selected?.subtitle ?? 'Service area'}</small></span><span className="area-trigger-actions"><span className="area-trigger-search" aria-hidden="true">⌕</span><span className="chevron">⌄</span></span>
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

function MunicipalityLogin({ onAuthenticated, onClose }) {
	const [email, setEmail] = React.useState('');
	const [password, setPassword] = React.useState('');
	const [areas, setAreas] = React.useState([]);
	const [area, setArea] = React.useState('');
	const [areaSearch, setAreaSearch] = React.useState('');
	const [error, setError] = React.useState('');
	React.useEffect(() => { fetch(`${api}/municipality/auth/options`).then((response) => response.json()).then((payload) => { setAreas(payload.data.areas); setArea(payload.data.areas.find((item) => item.allowed)?.id ?? ''); }); }, []);
	const submit = async (event) => {
		event.preventDefault();
		const response = await fetch(`${api}/municipality/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, area }) });
		const payload = await response.json();
		if (!response.ok) { setError(payload.error ?? 'Could not sign in.'); return; }
		onAuthenticated(payload.data);
	};
	const visibleAreas = areas.filter((item) => `${item.name} ${item.subtitle}`.toLowerCase().includes(areaSearch.toLowerCase()));
	return <div className="overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><form className="dialog auth-dialog" onSubmit={submit}><button type="button" className="close" onClick={onClose}>×</button><p className="eyebrow">Municipality work account</p><h2>Research access.</h2><p className="dialog-note">All service areas are listed. Your work account can only open assigned areas.</p><label>Work email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@municipality.gov.za" /></label><label>Password<input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Work account password" /></label><label>Assigned area<div className="assigned-area-search"><span aria-hidden="true">⌕</span><input value={areaSearch} onChange={(event) => setAreaSearch(event.target.value)} placeholder="Search province, district, or municipality" aria-label="Search assigned areas" /></div><select required value={area} onChange={(event) => setArea(event.target.value)}>{visibleAreas.map((item) => <option key={item.id} value={item.id} disabled={!item.allowed}>{item.allowed ? `${item.name} · assigned` : `${item.name} · not assigned`}</option>)}</select></label>{error && <p className="form-error">{error}</p>}<button className="submit" disabled={!area} type="submit">Open console <span>→</span></button></form></div>;
}

function NotificationDialog({ recipientCount, token, onClose, onSent }) {
	const [subject, setSubject] = React.useState('Service delivery update');
	const [message, setMessage] = React.useState('There is an update on a service issue in your area. Please open Cloud2Tech to view the latest status.');
	const [sending, setSending] = React.useState(false);
	const [error, setError] = React.useState('');

	const send = async (event) => {
		event.preventDefault();
		setSending(true);
		const response = await fetch(`${api}/municipality/notifications/broadcast`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ subject, message }) });
		const payload = await response.json();
		setSending(false);
		if (!response.ok) { setError(payload.error ?? 'Could not queue notification.'); return; }
		onSent(payload.data);
	};

	return <div className="overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><form className="dialog notification-dialog" onSubmit={send}><button type="button" className="close" onClick={onClose}>×</button><p className="eyebrow">Resident notification</p><h2>Send an update.</h2><p className="dialog-note">This will queue an email for {recipientCount} registered people in your assigned area.</p><label>Subject<input required value={subject} onChange={(event) => setSubject(event.target.value)} /></label><label>Message<textarea required rows="5" value={message} onChange={(event) => setMessage(event.target.value)} /></label>{error && <p className="form-error">{error}</p>}<button className="submit" disabled={sending} type="submit">{sending ? 'Queuing…' : 'Queue email'} <span>→</span></button></form></div>;
}

function ReportUpdateDialog({ report, token, onClose, onSaved }) {
	const [status, setStatus] = React.useState(report.status);
	const [reason, setReason] = React.useState(report.reason ?? '');
	const [message, setMessage] = React.useState('');
	const [error, setError] = React.useState('');
	const submit = async (event) => {
		event.preventDefault();
		const response = await fetch(`${api}/municipality/reports/${report.id}/updates`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ status, reason, message }) });
		const payload = await response.json();
		if (!response.ok) { setError(payload.error ?? 'Could not save update.'); return; }
		onSaved(payload.data.update);
	};
	return <div className="overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><form className="dialog notification-dialog" onSubmit={submit}><button type="button" className="close" onClick={onClose}>×</button><p className="eyebrow">Municipality update</p><h2>{report.id} · {report.category}</h2><p className="dialog-note">Publish a reason and status update that residents can see on this report.</p><label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="received">Received</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></select></label><label>Reason / cause<input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="e.g. Planned maintenance or cable fault" /></label><label>Public update<textarea required rows="4" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Explain what residents should know next." /></label>{error && <p className="form-error">{error}</p>}<button className="submit" type="submit">Publish update <span>→</span></button></form></div>;
}

function MunicipalityConsole({ token, onClose, onSignOut }) {
	const [research, setResearch] = React.useState(null);
	const [showNotification, setShowNotification] = React.useState(false);
	const [updateReport, setUpdateReport] = React.useState(null);
	const [notice, setNotice] = React.useState('');
	const [now, setNow] = React.useState(Date.now());

	const loadResearch = () => fetch(`${api}/municipality/research`, { headers: { Authorization: `Bearer ${token}` } }).then((response) => response.json()).then((payload) => setResearch(payload.data));
	React.useEffect(() => { loadResearch(); const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, []);

	const exportResearch = () => {
		const blob = new Blob([JSON.stringify(research, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `cloud2tech-research-${new Date().toISOString().slice(0, 10)}.json`;
		link.click();
		URL.revokeObjectURL(url);
	};

	return <section className="municipality-console"><header className="console-header"><div><p className="eyebrow">Municipality workspace</p><h2>Research & outreach</h2><p>Service delivery data for planning, accountability, and resident communication.</p></div><div className="console-actions"><button className="console-button" onClick={exportResearch} disabled={!research}>↓ Export JSON</button><button className="console-button primary" onClick={() => setShowNotification(true)} disabled={!research}>✉ Notify residents</button><button className="console-close" onClick={onSignOut}>Sign out</button><button className="console-close" onClick={onClose}>Close ×</button></div></header>{notice && <div className="success-banner">{notice}</div>}{research && <><div className="research-metrics"><div><strong>{research.totalReports}</strong><span>Total reports</span></div><div><strong>{research.openReports}</strong><span>Currently open</span></div><div><strong>{research.resolvedReports}</strong><span>Resolved</span></div><div><strong>{research.registeredUsers}</strong><span>Registered people</span></div></div><div className="research-grid"><div className="research-card"><div className="card-heading"><h3>Reports by area</h3><span>All time</span></div>{research.byArea.map((area) => <div className="bar-row" key={area.name}><div><strong>{area.name}</strong><small>{area.level} · {area.open} open</small></div><span className="bar-track"><i style={{ width: `${Math.max(8, area.reports / research.totalReports * 100)}%` }} /></span><b>{area.reports}</b></div>)}</div><div className="research-card"><div className="card-heading"><h3>Issue patterns</h3><span>All time</span></div>{research.byCategory.map((item) => <div className="category-row" key={item.category}><span className={`category ${item.category.toLowerCase().replace(' ', '-')}`} /><strong>{item.category}</strong><small>{item.resolved} resolved</small><b>{item.count}</b></div>)}</div></div><div className="research-card report-table-card"><div className="card-heading"><h3>Research report register</h3><span>Live · updated {new Date(research.generatedAt).toLocaleTimeString()}</span></div><div className="report-table"><div className="table-row table-head"><span>Report</span><span>Area</span><span>Status</span><span>Open for</span></div>{research.reports.map((report) => <div className="table-row" key={report.id}><span><strong>{report.id}</strong><small>{report.category} · {report.street}</small></span><span>{report.areaName}</span><span className={`status ${report.status}`}>{report.status.replace('_', ' ')}</span><span className="timer">{report.status === 'resolved' ? `${report.resolvedHours}h to resolve` : formatElapsed(report.loggedAt, now)}</span></div>)}</div></div></>}{showNotification && <NotificationDialog token={token} recipientCount={research?.registeredUsers ?? 0} onClose={() => setShowNotification(false)} onSent={(broadcast) => { setNotice(`Email queued for ${broadcast.recipientCount} registered people.`); setShowNotification(false); loadResearch(); }} />}</section>;
}

function MunicipalityUpdatePanel({ token, onClose }) {
	const [reports, setReports] = React.useState([]);
	const [selectedId, setSelectedId] = React.useState('');
	const [status, setStatus] = React.useState('');
	const [reason, setReason] = React.useState('');
	const [message, setMessage] = React.useState('');
	const [notice, setNotice] = React.useState('');
	const loadReports = () => fetch(`${api}/municipality/research`, { headers: { Authorization: `Bearer ${token}` } }).then((response) => response.json()).then((payload) => { setReports(payload.data.reports); setSelectedId((current) => current || payload.data.reports[0]?.id || ''); });
	React.useEffect(() => { loadReports(); const timer = setInterval(loadReports, 15000); return () => clearInterval(timer); }, [token]);
	const selected = reports.find((report) => report.id === selectedId);
	const choose = (report) => { setSelectedId(report.id); setStatus(report.status); setReason(report.reason ?? ''); setMessage(''); setNotice(''); };
	const publish = async (event) => { event.preventDefault(); const response = await fetch(`${api}/municipality/reports/${selectedId}/updates`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ status, reason, message }) }); const payload = await response.json(); if (!response.ok) { setNotice(payload.error ?? 'Update failed.'); return; } setNotice(`Update published to ${selectedId}.`); setMessage(''); setReports((current) => current.map((report) => report.id === selectedId ? { ...report, status, reason, updates: [payload.data.update, ...(report.updates ?? [])], resolvedHours: status === 'resolved' ? (report.resolvedHours || 18.4) : report.resolvedHours } : report)); };
	return <section className="municipality-console update-panel"><header className="console-header"><div><p className="eyebrow">Municipality workspace</p><h2>Keep residents updated</h2><p>Publish outage causes, status changes, and public explanations for reports in your assigned area.</p></div><button className="console-close" onClick={onClose}>Close ×</button></header><div className="update-layout"><div className="update-report-list"><p className="eyebrow">Scoped reports</p>{reports.map((report) => <button className={`update-report-option ${report.id === selectedId ? 'is-selected' : ''}`} key={report.id} onClick={() => choose(report)}><strong>{report.id}</strong><span>{report.category} · {report.street}</span><small>{report.areaName} · {report.status.replace('_', ' ')}</small></button>)}</div>{selected && <form className="research-card update-form" onSubmit={publish}><p className="eyebrow">Public update</p><h3>{selected.category} · {selected.street}</h3><p className="selected-area-label">{selected.areaName}</p><label>Status<select value={status || selected.status} onChange={(event) => setStatus(event.target.value)}><option value="received">Received</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></select></label><label>Reason / cause<input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="e.g. Planned maintenance" /></label><label>Message<textarea required rows="5" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="What should residents know?" /></label>{notice && <p className="success-banner">{notice}</p>}<button className="submit" type="submit">Publish update <span>→</span></button></form>}</div></section>;
}

function MunicipalityOperations({ token, onClose, onSignOut, onOpenUpdates }) {
	const [data, setData] = React.useState(null);
	const [query, setQuery] = React.useState('');
	const [filter, setFilter] = React.useState('open');
	const load = () => fetch(`${api}/municipality/research`, { headers: { Authorization: `Bearer ${token}` } }).then((response) => response.json()).then((payload) => setData(payload.data));
	React.useEffect(() => { load(); const timer = setInterval(load, 15000); return () => clearInterval(timer); }, [token]);
	const searchMatch = (item) => `${item.id ?? ''} ${item.category} ${item.street} ${item.areaName}`.toLowerCase().includes(query.toLowerCase());
	const visibleReports = data?.reports.filter((report) => (filter === 'all' || (filter === 'open' ? report.status !== 'resolved' : report.status === filter)) && searchMatch(report)) ?? [];
	const visibleClusters = data?.clusters.filter((cluster) => searchMatch({ ...cluster, id: cluster.reportIds.join(' ') })) ?? [];
	return <section className="municipality-console operations-console"><header className="console-header"><div><p className="eyebrow">Municipality operations</p><h2>Service delivery control room</h2><p>Search, group, and monitor issues in your assigned jurisdiction.</p></div><div className="console-actions"><button className="console-button primary" onClick={onOpenUpdates}>Update reports</button><button className="console-close" onClick={onSignOut}>Sign out</button><button className="console-close" onClick={onClose}>Close ×</button></div></header>{data && <><div className="operations-toolbar"><div className="operations-search"><span>⌕</span><input aria-label="Search open issues" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search street, issue, area, or report ID" /></div><div className="filter-tabs">{[['open', 'Open'], ['in_progress', 'In progress'], ['received', 'Received'], ['resolved', 'Resolved'], ['all', 'All']].map(([value, label]) => <button className={filter === value ? 'active' : ''} key={value} onClick={() => setFilter(value)}>{label}</button>)}</div></div><div className="operations-summary"><span><strong>{visibleReports.length}</strong> matching reports</span><span><strong>{visibleClusters.length}</strong> grouped issues</span><span><strong>{data.openReports}</strong> total open</span><span><strong>{data.resolvedReports}</strong> resolved</span></div><div className="operations-grid"><div className="research-card"><div className="card-heading"><h3>Consolidated issues</h3><span>Same area + street + category</span></div>{visibleClusters.length ? visibleClusters.map((cluster) => <div className="cluster-row" key={cluster.id}><span className="cluster-count">{cluster.reportCount}</span><div><strong>{cluster.category}</strong><p>{cluster.street} · {cluster.areaName}</p><small>{cluster.reportIds.join(', ')}</small></div><div className="community-counts"><span>✓ {cluster.confirmed}</span><span>! {cluster.unresolved}</span></div></div>) : <div className="empty-operations">No matching open issues.</div>}</div><div className="research-card"><div className="card-heading"><h3>Community confidence</h3><span>Visible feedback</span></div>{visibleReports.length ? visibleReports.map((report) => <div className="confidence-row" key={report.id}><div><strong>{report.id}</strong><small>{report.category} · {report.street}</small></div><span className="confidence-positive">✓ {report.confirmed}</span><span className="confidence-negative">! {report.unresolved}</span></div>) : <div className="empty-operations">No matching reports.</div>}</div></div></>}</section>;
}

function MunicipalityReportRegister({ token }) {
	const [reports, setReports] = React.useState([]);
	const loadRegister = () => fetch(`${api}/municipality/research`, { headers: { Authorization: `Bearer ${token}` } }).then((response) => response.ok ? response.json() : { data: { reports: [] } }).then((payload) => setReports(payload.data?.reports ?? []));
	React.useEffect(() => { loadRegister(); const timer = setInterval(loadRegister, 15000); return () => clearInterval(timer); }, [token]);
	return <section className="municipality-console report-register"><header className="console-header"><div><p className="eyebrow">Municipality data</p><h2>Report register</h2><p>Every report in your assigned jurisdiction, with status, timing, and community feedback.</p></div><span className="area-count">{reports.length} reports</span></header><div className="report-register-table"><div className="register-row register-head"><span>Report</span><span>Area</span><span>Status</span><span>Community</span><span>Timing</span></div>{reports.map((report) => <div className="register-row" key={report.id}><span><strong>{report.id}</strong><small>{report.category} · {report.street}</small></span><span>{report.areaName}</span><span className={`status ${report.status}`}>{report.status.replace('_', ' ')}</span><span className="register-community"><b>✓ {report.confirmed}</b><b>! {report.unresolved}</b></span><span className="timer">{report.status === 'resolved' ? `${report.resolvedHours}h to resolve` : `Open since ${new Date(report.loggedAt).toLocaleString()}`}</span></div>)}</div></section>;
}

function AddressAutocomplete({ value, onChange, onPlace }) {
	const inputRef = React.useRef(null);
	const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

	React.useEffect(() => {
		if (!apiKey || window.google?.maps?.places) return;
		const script = document.createElement('script');
		script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
		script.async = true;
		script.onload = () => inputRef.current?.dispatchEvent(new Event('google-ready'));
		document.head.appendChild(script);
		return () => { if (document.head.contains(script)) document.head.removeChild(script); };
	}, [apiKey]);

	React.useEffect(() => {
		if (!apiKey || !window.google?.maps?.places || !inputRef.current || inputRef.current.dataset.autocomplete) return;
		const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, { componentRestrictions: { country: 'za' }, fields: ['formatted_address', 'geometry', 'name'] });
		autocomplete.addListener('place_changed', () => {
			const place = autocomplete.getPlace();
			if (place.formatted_address) onChange(place.formatted_address);
			if (place.geometry?.location) onPlace({ latitude: place.geometry.location.lat(), longitude: place.geometry.location.lng() });
		});
		inputRef.current.dataset.autocomplete = 'true';
	}, [apiKey, onChange, onPlace]);

	return <><input ref={inputRef} required value={value} onChange={(event) => onChange(event.target.value)} placeholder={apiKey ? 'Search and select a street address' : 'Street name or address'} />{apiKey ? <small className="field-hint">Select a result to pin the exact address.</small> : <small className="field-hint">Add VITE_GOOGLE_MAPS_API_KEY to enable address search.</small>}</>;
}

function CommunityDialog({ report, onClose, onSaved }) {
	const [community, setCommunity] = React.useState(null);
	const [message, setMessage] = React.useState('');
	const [name, setName] = React.useState('');
	React.useEffect(() => { fetch(`${api}/citizen/reports/${report.id}/community`).then((response) => response.json()).then((payload) => setCommunity(payload.data)); }, [report.id]);
	const verify = async (verdict) => { await fetch(`${api}/citizen/reports/${report.id}/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ verdict }) }); onSaved(); };
	const comment = async (event) => { event.preventDefault(); await fetch(`${api}/citizen/reports/${report.id}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, message }) }); setMessage(''); setName(''); const response = await fetch(`${api}/citizen/reports/${report.id}/community`); setCommunity((await response.json()).data); };
	return <div className="overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="dialog community-dialog"><button type="button" className="close" onClick={onClose}>×</button><p className="eyebrow">Community check</p><h2>{report.category}</h2><p className="dialog-note">{report.street} · {report.location}</p><div className="verification-actions"><button onClick={() => verify('resolved')}>✓ Confirm resolved</button><button onClick={() => verify('still_not_resolved')}>! Still not resolved</button></div>{community && <div className="community-summary"><span>{community.confirmed} people confirmed resolved</span><span>{community.unresolved} still unresolved</span></div>}<div className="community-comments">{community?.comments?.map((item, index) => <div className="community-comment" key={`${item.createdAt}-${index}`}><strong>{item.name}</strong><p>{item.message}</p></div>)}</div><form onSubmit={comment}><label>Name <span>optional</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Resident" /></label><label>Share what you see<textarea required rows="3" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Is the issue still present in your street?" /></label><button className="submit" type="submit">Post observation <span>→</span></button></form></div></div>;
}

function AreaCommunity({ area, user, municipalityToken }) {
	const [messages, setMessages] = React.useState([]);
	const [message, setMessage] = React.useState('');
	const [open, setOpen] = React.useState(false);
	const load = () => fetch(`${api}/community/messages?area=${encodeURIComponent(area)}`).then((response) => response.json()).then((payload) => setMessages(payload.data));
	React.useEffect(() => { load(); }, [area]);
	React.useEffect(() => { if (!open) return undefined; const timer = setInterval(load, 10000); return () => clearInterval(timer); }, [open, area]);
	const post = async (event) => { event.preventDefault(); if (!message.trim()) return; const headers = { 'Content-Type': 'application/json' }; if (municipalityToken) headers.Authorization = `Bearer ${municipalityToken}`; await fetch(`${api}/community/messages`, { method: 'POST', headers, body: JSON.stringify({ area, name: user?.name, message }) }); setMessage(''); load(); };
	return <><button className={`chat-launcher ${open ? 'is-open' : ''}`} onClick={() => setOpen(!open)} aria-label={open ? 'Minimize local conversation' : 'Open local conversation'} title={open ? 'Minimize chat' : 'Open local chat'}><span className="chat-icon" aria-hidden="true"><i /><i /><i /></span><span>{municipalityToken ? 'Municipality chat' : 'Local chat'}</span>{messages.length > 0 && <b>{messages.length}</b>}</button>{open && <section className="area-community floating-chat"><div className="community-heading"><div><p className="eyebrow">{area === 'all' ? 'All areas' : 'Local conversation'}</p><h2>{municipalityToken ? 'Official area channel' : 'What are people seeing?'}</h2></div><button className="chat-minimize" onClick={() => setOpen(false)} aria-label="Minimize chat">−</button></div><div className="chat-context">{municipalityToken ? 'Messages will appear as Municipality' : area === 'all' ? 'Showing messages from all service areas' : 'People in this service area'}</div><div className="community-feed">{messages.length ? messages.map((item) => <article className={`feed-message ${item.role}`} key={item.id}><div className="feed-meta"><strong>{item.author}</strong>{item.role === 'official' && <span>Official</span>}<small>{new Date(item.createdAt).toLocaleString()}</small></div><p>{item.message}</p></article>) : <p className="empty-feed">No local posts yet. Start the conversation.</p>}</div><form className="community-compose" onSubmit={post}><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder={municipalityToken ? 'Send an official area message' : 'Ask or share a local observation'} aria-label="Area community message" /><button type="submit" aria-label="Post message" title="Post message">→</button></form></section>}</>;
}

function MapView({ area, points }) {
	const mapRef = React.useRef(null);

	React.useEffect(() => {
		const map = L.map(mapRef.current, { zoomControl: false }).setView([area.latitude, area.longitude], area.zoom);
		L.control.zoom({ position: 'bottomright' }).addTo(map);
		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
		points.forEach((point) => L.circleMarker([point.latitude, point.longitude], { radius: 8, color: '#1a1d1c', weight: 2, fillColor: '#c4e36d', fillOpacity: .95 }).bindPopup(`<strong>${point.category}</strong><br>${point.street}`).addTo(map));
		if (area.id === 'all' && points.length > 1) map.fitBounds(L.latLngBounds(points.map((point) => [point.latitude, point.longitude])), { padding: [24, 24], maxZoom: 11 });
		return () => map.remove();
	}, [area, points]);

	return <div className="map map-container" ref={mapRef} />;
}

function App() {
	const [reports, setReports] = React.useState([]);
	const [summary, setSummary] = React.useState({ open: 0, inProgress: 0, resolved: 0, averageResolutionHours: 0 });
	const [metricsUpdatedAt, setMetricsUpdatedAt] = React.useState(null);
	const [areas, setAreas] = React.useState([]);
	const [selectedArea, setSelectedArea] = React.useState('all');
	const [heatmap, setHeatmap] = React.useState([]);
	const [showForm, setShowForm] = React.useState(false);
	const [communityReport, setCommunityReport] = React.useState(null);
	const [showAuth, setShowAuth] = React.useState(false);
	const [showMunicipality, setShowMunicipality] = React.useState(false);
	const [showMunicipalityUpdates, setShowMunicipalityUpdates] = React.useState(false);
	const [showMunicipalityAuth, setShowMunicipalityAuth] = React.useState(false);
	const [user, setUser] = React.useState(null);
	const [municipalityToken, setMunicipalityToken] = React.useState(() => localStorage.getItem('cloud2tech_municipality_token'));
	const [now, setNow] = React.useState(Date.now());
	const [locationSuggestion, setLocationSuggestion] = React.useState(null);
	const [photos, setPhotos] = React.useState([]);
	const [photoPreviews, setPhotoPreviews] = React.useState([]);
	const [error, setError] = React.useState('');
	const [form, setForm] = React.useState({ area: 'Khayelitsha', category: 'Water leak', street: '', location: '', latitude: '', longitude: '' });

	const refresh = async () => {
		const query = selectedArea === 'all' ? '' : `?area=${encodeURIComponent(selectedArea)}`;
		const [reportsResponse, summaryResponse, heatmapResponse] = await Promise.all([fetch(`${api}/citizen/reports${query}`), fetch(`${api}/dashboard/summary${query}`), fetch(`${api}/dashboard/heatmap${query}`)]);
		setReports((await reportsResponse.json()).data);
		setSummary((await summaryResponse.json()).data);
		setHeatmap((await heatmapResponse.json()).data);
		setMetricsUpdatedAt(Date.now());
	};

	React.useEffect(() => {
		fetch(`${api}/areas`).then((response) => response.json()).then((payload) => setAreas(payload.data));
		const token = localStorage.getItem('cloud2tech_token');
		if (token) fetch(`${api}/auth/me`, { headers: { Authorization: `Bearer ${token}` } }).then((response) => response.ok ? response.json() : Promise.reject()).then((payload) => { setUser(payload.data); setSelectedArea(payload.data.preferredArea ?? 'all'); }).catch(() => localStorage.removeItem('cloud2tech_token'));
	}, []);
	React.useEffect(() => { refresh(); }, [selectedArea]);
	React.useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, []);
	React.useEffect(() => { const timer = setInterval(refresh, 15000); return () => clearInterval(timer); }, [selectedArea]);
	React.useEffect(() => {
		if (!areas.length || !navigator.geolocation) return;
		navigator.geolocation.getCurrentPosition(({ coords }) => {
			const candidates = areas.filter((area) => area.level === 'neighbourhood');
			const nearest = candidates.reduce((closest, area) => { const distance = Math.hypot(coords.latitude - area.latitude, coords.longitude - area.longitude); return !closest || distance < closest.distance ? { area, distance } : closest; }, null)?.area;
			if (!nearest || nearest.id === selectedArea) return;
			const key = 'cloud2tech_observed_area';
			const previous = JSON.parse(localStorage.getItem(key) ?? 'null');
			const observedAt = previous?.areaId === nearest.id ? previous.observedAt : Date.now();
			localStorage.setItem(key, JSON.stringify({ areaId: nearest.id, observedAt }));
			if (Date.now() - observedAt >= 12 * 60 * 60 * 1000) setLocationSuggestion(nearest);
		}, () => undefined, { enableHighAccuracy: false, maximumAge: 15 * 60 * 1000, timeout: 5000 });
	}, [areas, selectedArea]);

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
	const openMunicipality = () => municipalityToken ? setShowMunicipality(!showMunicipality) : setShowMunicipalityAuth(true);
	const openMunicipalityUpdates = () => municipalityToken ? setShowMunicipalityUpdates(true) : setShowMunicipalityAuth(true);
	const handleMunicipalityAuthenticated = ({ token }) => { localStorage.setItem('cloud2tech_municipality_token', token); setMunicipalityToken(token); setShowMunicipalityAuth(false); setShowMunicipality(true); };
	const municipalitySignOut = () => { localStorage.removeItem('cloud2tech_municipality_token'); setMunicipalityToken(null); setShowMunicipality(false); };

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
		setForm({ ...form, street: '', location: '', latitude: '', longitude: '' });
		closeForm();
		refresh();
	};

	const selectedAreaDetails = areas.find((area) => area.id === selectedArea) ?? { name: 'All service areas', subtitle: 'Municipal overview', latitude: -34, longitude: 18.65, zoom: 11 };

	return <main className="shell">
		<nav><span className="logo">CLOUD2TECH</span><AreaPicker areas={areas} selectedArea={selectedArea} onSelect={selectArea} /><div className="nav-actions"><button className="console-link" type="button" onClick={openMunicipality}>▦ Municipality</button>{user ? <div className="account-menu"><button className="account-button" type="button" onClick={logout}><span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span><span>{user.name.split(' ')[0]}</span><small>Sign out</small></button></div> : <button className="login-button" type="button" onClick={() => setShowAuth(true)}>Sign in</button>}<button className="report" onClick={() => setShowForm(true)}>+ Report an issue</button></div></nav>
		{showMunicipality && <><MunicipalityOperations token={municipalityToken} onClose={() => setShowMunicipality(false)} onSignOut={municipalitySignOut} onOpenUpdates={() => setShowMunicipalityUpdates(true)} /><MunicipalityReportRegister token={municipalityToken} /></>}
		{showMunicipalityUpdates && <MunicipalityUpdatePanel token={municipalityToken} onClose={() => setShowMunicipalityUpdates(false)} />}
		{locationSuggestion && <div className="location-suggestion"><div><strong>You appear to be in {locationSuggestion.name}.</strong><span>Want to view local service reports?</span></div><button onClick={() => { selectArea(locationSuggestion.id); setLocationSuggestion(null); }}>Switch area</button><button className="dismiss" onClick={() => setLocationSuggestion(null)}>Keep current</button></div>}
		<section className="intro"><div><p className="eyebrow">{selectedAreaDetails.subtitle}</p><h1>{selectedAreaDetails.name === 'All service areas' ? <>Make the work<br /><span>visible.</span></> : <>{selectedAreaDetails.name}<br /><span>in view.</span></>}</h1><p className="lede">A shared operating picture for residents and the teams responsible for keeping {selectedAreaDetails.name.toLowerCase()} moving.</p></div><div className="live"><span className="pulse" /> Live operations desk <small>Updated just now</small></div></section>
		<section className="metrics"><div><strong>{summary.open}</strong><span>Open reports</span></div><div><strong>{summary.inProgress}</strong><span>In progress</span></div><div><strong>{summary.resolved}</strong><span>Resolved</span></div><div><strong>{summary.averageResolutionHours ? `${summary.averageResolutionHours}h` : '—'}</strong><span>Avg. resolution time</span></div><small className="metrics-live"><i /> Live · {metricsUpdatedAt ? `updated ${now - metricsUpdatedAt < 60000 ? 'just now' : `${formatElapsed(new Date(metricsUpdatedAt).toISOString(), now)} ago`}` : 'syncing'}</small></section>
		<section className="workspace"><div><div className="map-heading"><span>LIVE MAP · OPENSTREETMAP</span><small>{selectedAreaDetails.name}</small></div><MapView area={selectedAreaDetails} points={heatmap} /></div><div className="reports"><div className="section-heading"><div><p className="eyebrow">Operations queue</p><h2>Latest reports</h2></div><span className="area-count">{reports.length} reports</span></div>{reports.map((report) => <article className="report-row" key={report.id}><span className={`category ${report.category.toLowerCase().replace(' ', '-')}`} /><div><strong>{report.category}</strong><p>{report.street} · {report.location} · {report.id}</p>{report.reason && <small className="report-reason">Reason: {report.reason}</small>}{report.updates?.[0] && <small className="report-update">Update: {report.updates[0].message}</small>}<small className="timer">{report.status === 'resolved' ? `${report.resolvedHours}h to resolve` : `Open for ${formatElapsed(report.loggedAt, now)}`}</small></div><span className={`status ${report.status}`}>{report.status.replace('_', ' ')}</span>{report.community?.confirmed > 0 && report.community.confirmed > (report.community.unresolved ?? 0) ? <span className="community-confirmed" title="Community confirmation">✓</span> : <button className="community-button icon-check" aria-label="Open community check" title="Open community check" onClick={() => setCommunityReport(report)}>—</button>}</article>)}</div></section>
		<AreaCommunity area={selectedArea} user={user} municipalityToken={municipalityToken} />
		<footer>Cloud2Tech Civic Systems <span>Transparency by default</span></footer>
		{showAuth && <AuthDialog areas={areas} onAuthenticated={handleAuthenticated} onClose={() => setShowAuth(false)} />}
		{communityReport && <CommunityDialog report={communityReport} onClose={() => setCommunityReport(null)} onSaved={() => { setCommunityReport(null); refresh(); }} />}
		{showMunicipalityAuth && <MunicipalityLogin onAuthenticated={handleMunicipalityAuthenticated} onClose={() => setShowMunicipalityAuth(false)} />}
		{showForm && <div className="overlay" onMouseDown={(event) => event.target === event.currentTarget && closeForm()}><form className="dialog" onSubmit={submitReport}><button type="button" className="close" onClick={closeForm}>×</button><p className="eyebrow">Citizen report</p><h2>What needs attention?</h2><label>Service area<select value={form.area} onChange={(event) => setForm({ ...form, area: event.target.value })}>{areas.filter((area) => area.id !== 'all').map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select></label><label>Issue type<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option>Water leak</option><option>Pothole</option><option>Electricity outage</option><option>Street light</option></select></label><label>Street address<AddressAutocomplete value={form.street} onChange={(street) => setForm({ ...form, street })} onPlace={({ latitude, longitude }) => setForm({ ...form, latitude, longitude })} /></label><label>Suburb or landmark<input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="Optional location detail" /></label><label className="photo-picker">Photos <span>up to 3 · 5MB each</span><input type="file" accept="image/*" multiple onChange={handlePhotos} /><div className="photo-previews">{photoPreviews.map((preview, index) => <img key={preview} src={preview} alt={`Selected upload ${index + 1}`} />)}</div></label>{error && <p className="form-error">{error}</p>}<button className="submit" type="submit">Submit report <span>→</span></button></form></div>}
	</main>;
}

createRoot(document.getElementById('root')).render(<App />);
