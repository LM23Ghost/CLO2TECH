const areas = [
	['all', 'All service areas', 'overview', null, 'Municipal overview', -29.5, 24.5, 5],
	['western-cape', 'Western Cape', 'province', 'all', 'Province overview', -33.9, 18.6, 9],
	['cape-town', 'Cape Town', 'municipality', 'western-cape', 'City of Cape Town', -33.93, 18.62, 10],
	['khayelitsha', 'Khayelitsha', 'neighbourhood', 'cape-town', 'Wards 10-11', -34.038, 18.67, 13],
	['mfuleni', 'Mfuleni', 'neighbourhood', 'cape-town', 'Wards 5-6', -33.999, 18.684, 13],
	['gauteng', 'Gauteng', 'province', 'all', 'Province overview', -26.27, 28.1, 8],
	['johannesburg', 'Johannesburg', 'municipality', 'gauteng', 'City of Johannesburg', -26.204, 28.047, 10],
	['sandton', 'Sandton', 'neighbourhood', 'johannesburg', 'Region E', -26.107, 28.056, 13],
	['pretoria', 'Pretoria', 'municipality', 'gauteng', 'City of Tshwane', -25.747, 28.229, 10],
	['eastern-cape', 'Eastern Cape', 'province', 'all', 'Province overview', -32.3, 26.5, 7],
	['buffalo-city', 'Buffalo City', 'municipality', 'eastern-cape', 'East London metro', -32.97, 27.87, 10],
	['kwazulu-natal', 'KwaZulu-Natal', 'province', 'all', 'Province overview', -29, 30.8, 7],
	['ethekwini', 'eThekwini', 'municipality', 'kwazulu-natal', 'Durban metro', -29.86, 31.02, 10],
	['free-state', 'Free State', 'province', 'all', 'Province overview', -29.1, 26.2, 7],
	['mangaung', 'Mangaung', 'municipality', 'free-state', 'Bloemfontein metro', -29.12, 26.22, 10],
	['limpopo', 'Limpopo', 'province', 'all', 'Province overview', -23.9, 29.45, 7],
	['polokwane', 'Polokwane', 'municipality', 'limpopo', 'Polokwane municipality', -23.9, 29.45, 11],
	['mpumalanga', 'Mpumalanga', 'province', 'all', 'Province overview', -25.6, 30.6, 7],
	['mbombela', 'Mbombela', 'municipality', 'mpumalanga', 'City of Mbombela', -25.47, 30.98, 11],
	['north-west', 'North West', 'province', 'all', 'Province overview', -26.7, 25.3, 7],
	['matlosana', 'Matlosana', 'municipality', 'north-west', 'Klerksdorp metro', -26.86, 26.67, 11],
	['northern-cape', 'Northern Cape', 'province', 'all', 'Province overview', -29, 22, 7],
	['sol-plaatje', 'Sol Plaatje', 'municipality', 'northern-cape', 'Kimberley municipality', -28.73, 24.77, 11],
].map(([id, name, level, parentId, subtitle, latitude, longitude, zoom]) => ({ id, name, level, parentId, subtitle, latitude, longitude, zoom }));

const initialReports = [
	{ id: 'RPT-1042', area: 'mfuleni', street: 'Mfuleni North', category: 'Water leak', location: 'Mfuleni North', latitude: -33.997, longitude: 18.684, status: 'in_progress', priority: 'high', loggedAt: new Date(Date.now() - 2 * 3600000).toISOString(), photos: [], updates: [], community: { confirmed: 0, unresolved: 1, comments: [] } },
	{ id: 'RPT-1041', area: 'sandton', street: 'Rivonia Road', category: 'Electricity outage', location: 'Sandton', latitude: -26.107, longitude: 28.056, status: 'received', priority: 'high', loggedAt: new Date(Date.now() - 4 * 3600000).toISOString(), photos: [], updates: [], community: { confirmed: 0, unresolved: 0, comments: [] } },
	{ id: 'RPT-1038', area: 'khayelitsha', street: 'Mew Way', category: 'Street light', location: 'Ward 7', latitude: -34.041, longitude: 18.674, status: 'resolved', resolvedHours: 12.5, priority: 'normal', loggedAt: new Date(Date.now() - 29 * 3600000).toISOString(), photos: [], updates: [{ message: 'Power restored after planned maintenance.', createdAt: new Date().toISOString() }], community: { confirmed: 3, unresolved: 0, comments: [] } },
];

const key = 'cloud2tech_pages_demo';
const load = () => JSON.parse(localStorage.getItem(key) || 'null') || { reports: initialReports, users: [], messages: [] };
const save = (data) => localStorage.setItem(key, JSON.stringify(data));
const response = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
const body = async (options) => options?.body instanceof FormData ? Object.fromEntries(options.body.entries()) : options?.body ? JSON.parse(options.body) : {};
const descendants = (id) => areas.filter((area) => area.parentId === id).flatMap((area) => [area.id, ...descendants(area.id)]);
const scoped = (reports, area) => !area || area === 'all' ? reports : reports.filter((report) => [area, ...descendants(area)].includes(report.area));
const reportView = (report) => ({ ...report, areaName: areas.find((area) => area.id === report.area)?.name ?? report.area, confirmed: report.community?.confirmed ?? 0, unresolved: report.community?.unresolved ?? 0 });

export const installDemoApi = (api) => {
	const realFetch = window.fetch.bind(window);
	window.fetch = async (input, options = {}) => {
		const url = typeof input === 'string' ? input : input.url;
		if (!url.startsWith(api)) return realFetch(input, options);
		const path = new URL(url, window.location.origin);
		const data = load();
		const payload = await body(options);
		const method = (options.method || 'GET').toUpperCase();
		if (path.pathname.endsWith('/areas')) return response({ data: areas });
		if (path.pathname.endsWith('/municipality/auth/options')) return response({ data: { areas: areas.map((area) => ({ ...area, allowed: area.level === 'province' || area.level === 'municipality' })) } });
		if (path.pathname.endsWith('/municipality/auth/login')) return response({ data: { token: 'demo-municipality', user: { role: 'municipality', areaId: payload.area } } });
		if (path.pathname.endsWith('/auth/signup')) { const user = { id: `demo-${Date.now()}`, ...payload }; data.users.push(user); save(data); return response({ data: { token: 'demo-user', user } }, 201); }
		if (path.pathname.endsWith('/auth/login')) return response({ data: { token: 'demo-user', user: data.users[0] || { id: 'demo-user', name: 'Demo resident', email: payload.email, preferredArea: 'all' } } });
		if (path.pathname.endsWith('/auth/me')) return response({ data: data.users[0] || { id: 'demo-user', name: 'Demo resident', preferredArea: 'all' } });
		if (path.pathname.endsWith('/auth/profile')) { data.users[0] = { ...(data.users[0] || { id: 'demo-user', name: 'Demo resident' }), ...payload }; save(data); return response({ data: data.users[0] }); }
		if (path.pathname.endsWith('/dashboard/summary')) { const reports = scoped(data.reports, path.searchParams.get('area')); const resolved = reports.filter((report) => report.status === 'resolved'); return response({ data: { open: reports.filter((report) => report.status !== 'resolved').length, inProgress: reports.filter((report) => report.status === 'in_progress').length, resolved: resolved.length, averageResolutionHours: resolved.length ? 12.5 : 0 } }); }
		if (path.pathname.endsWith('/dashboard/heatmap')) return response({ data: scoped(data.reports, path.searchParams.get('area')).filter((report) => report.status !== 'resolved') });
		if (path.pathname.endsWith('/citizen/reports') && method === 'GET') return response({ data: scoped(data.reports, path.searchParams.get('area')) });
		if (path.pathname.endsWith('/citizen/reports') && method === 'POST') { const area = areas.find((item) => item.id === payload.area) || areas[3]; const report = { id: `RPT-${1043 + data.reports.length}`, ...payload, area: area.id, latitude: Number(payload.latitude) || area.latitude, longitude: Number(payload.longitude) || area.longitude, status: 'received', loggedAt: new Date().toISOString(), photos: [], updates: [], community: { confirmed: 0, unresolved: 0, comments: [] } }; data.reports.unshift(report); save(data); return response({ data: report }, 201); }
		if (path.pathname.includes('/citizen/reports/') && path.pathname.endsWith('/community')) { const report = data.reports.find((item) => path.pathname.includes(item.id)); return response({ data: report?.community || { confirmed: 0, unresolved: 0, comments: [] } }); }
		if (path.pathname.includes('/citizen/reports/') && path.pathname.endsWith('/verify')) { const report = data.reports.find((item) => path.pathname.includes(item.id)); if (payload.verdict === 'resolved') report.community.confirmed += 1; else report.community.unresolved += 1; save(data); return response({ data: report.community }); }
		if (path.pathname.endsWith('/community/messages') && method === 'GET') return response({ data: data.messages });
		if (path.pathname.endsWith('/community/messages')) { const message = { id: `msg-${Date.now()}`, areaId: payload.area, author: payload.name || 'Resident', role: 'resident', message: payload.message, createdAt: new Date().toISOString() }; data.messages.unshift(message); save(data); return response({ data: message }, 201); }
		if (path.pathname.endsWith('/municipality/research')) { const reports = data.reports.map(reportView); const categories = [...new Set(reports.map((report) => report.category))].map((category) => ({ category, count: reports.filter((report) => report.category === category).length, resolved: reports.filter((report) => report.category === category && report.status === 'resolved').length })); return response({ data: { totalReports: reports.length, openReports: reports.filter((report) => report.status !== 'resolved').length, resolvedReports: reports.filter((report) => report.status === 'resolved').length, registeredUsers: data.users.length, byArea: areas.filter((area) => area.level === 'province').map((area) => ({ name: area.name, level: area.level, reports: scoped(data.reports, area.id).length, open: scoped(data.reports, area.id).filter((report) => report.status !== 'resolved').length })).filter((area) => area.reports), byCategory: categories, clusters: [], reports } }); }
		if (path.pathname.includes('/municipality/reports/') && path.pathname.endsWith('/updates')) { const report = data.reports.find((item) => path.pathname.includes(item.id)); report.status = payload.status || report.status; report.reason = payload.reason || ''; const update = { message: payload.message, createdAt: new Date().toISOString() }; report.updates.unshift(update); save(data); return response({ data: { report, update } }, 201); }
		if (path.pathname.endsWith('/municipality/notifications/broadcast')) return response({ data: { recipientCount: data.users.length, status: 'queued' } }, 202);
		return response({ error: 'Demo endpoint unavailable.' }, 404);
	};
};