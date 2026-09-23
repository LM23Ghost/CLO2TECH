import { areas, reports as initialReports } from 'virtual:municipal-demo-data';

const key = 'cloud2tech_pages_demo';
const initialMessages = [{ id: 'msg_1', areaId: 'sandton', author: 'Municipality', role: 'official', message: 'Please share updates about the Rivonia Road electricity outage here.', createdAt: new Date(Date.now() - 2 * 3600000).toISOString() }];
const load = () => {
	const stored = JSON.parse(localStorage.getItem(key) || 'null');
	if (!stored) return { reports: structuredClone(initialReports), users: [], messages: initialMessages };
	return {
		...stored,
		reports: [...(stored.reports ?? []), ...initialReports.filter((report) => !(stored.reports ?? []).some((savedReport) => savedReport.id === report.id))],
		messages: [...(stored.messages ?? []), ...initialMessages.filter((message) => !(stored.messages ?? []).some((savedMessage) => savedMessage.id === message.id))],
	};
};
const save = (data) => localStorage.setItem(key, JSON.stringify(data));
const response = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
const body = async (options) => options?.body instanceof FormData ? Object.fromEntries(options.body.entries()) : options?.body ? JSON.parse(options.body) : {};
const descendants = (id) => areas.filter((area) => area.parentId === id).flatMap((area) => [area.id, ...descendants(area.id)]);
const scoped = (reports, area) => !area || area === 'all' ? reports : reports.filter((report) => [area, ...descendants(area)].includes(report.area));
const reportView = (report) => ({ ...report, areaName: areas.find((area) => area.id === report.area)?.name ?? report.area, confirmed: report.community?.confirmed ?? 0, unresolved: report.community?.unresolved ?? 0 });
const issueClusters = (reports) => Object.values(reports.filter((report) => report.status !== 'resolved').reduce((groups, report) => {
	const key = `${report.area}|${report.category}|${report.street}`.toLowerCase();
	groups[key] ??= { id: `cluster_${Object.keys(groups).length + 1}`, areaName: areas.find((area) => area.id === report.area)?.name ?? report.area, area: report.area, category: report.category, street: report.street, reportCount: 0, reportIds: [], confirmed: 0, unresolved: 0, latestUpdate: report.updates?.[0]?.message ?? '' };
	groups[key].reportCount += 1;
	groups[key].reportIds.push(report.id);
	groups[key].confirmed += report.community?.confirmed ?? 0;
	groups[key].unresolved += report.community?.unresolved ?? 0;
	return groups;
}, {}));

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
		if (path.pathname.includes('/citizen/reports/') && path.pathname.endsWith('/verify')) { const report = data.reports.find((item) => path.pathname.includes(item.id)); report.community ??= { confirmed: 0, unresolved: 0, comments: [] }; if (payload.verdict === 'resolved') report.community.confirmed += 1; else { report.community.unresolved += 1; report.status = 'in_progress'; report.updates = [{ message: 'Residents have reported that this issue may still be unresolved.', createdAt: new Date().toISOString() }, ...(report.updates ?? [])]; } save(data); return response({ data: report.community }); }
		if (path.pathname.includes('/citizen/reports/') && path.pathname.endsWith('/comments')) { const report = data.reports.find((item) => path.pathname.includes(item.id)); if (!payload.message?.trim()) return response({ error: 'A message is required.' }, 400); report.community ??= { confirmed: 0, unresolved: 0, comments: [] }; const comment = { name: payload.name?.trim() || 'Resident', message: payload.message.trim(), createdAt: new Date().toISOString() }; report.community.comments.unshift(comment); save(data); return response({ data: comment }, 201); }
		if (path.pathname.endsWith('/community/messages') && method === 'GET') return response({ data: data.messages });
		if (path.pathname.endsWith('/community/messages')) { const message = { id: `msg-${Date.now()}`, areaId: payload.area, author: payload.name || 'Resident', role: 'resident', message: payload.message, createdAt: new Date().toISOString() }; data.messages.unshift(message); save(data); return response({ data: message }, 201); }
		if (path.pathname.endsWith('/municipality/research')) { const reports = data.reports.map(reportView); const categories = [...new Set(reports.map((report) => report.category))].map((category) => ({ category, count: reports.filter((report) => report.category === category).length, resolved: reports.filter((report) => report.category === category && report.status === 'resolved').length })); return response({ data: { totalReports: reports.length, openReports: reports.filter((report) => report.status !== 'resolved').length, resolvedReports: reports.filter((report) => report.status === 'resolved').length, registeredUsers: data.users.length, byArea: areas.filter((area) => area.level === 'province').map((area) => ({ name: area.name, level: area.level, reports: scoped(data.reports, area.id).length, open: scoped(data.reports, area.id).filter((report) => report.status !== 'resolved').length })).filter((area) => area.reports), byCategory: categories, clusters: issueClusters(data.reports), reports } }); }
		if (path.pathname.includes('/municipality/reports/') && path.pathname.endsWith('/updates')) { const report = data.reports.find((item) => path.pathname.includes(item.id)); report.status = payload.status || report.status; report.reason = payload.reason || ''; const update = { message: payload.message, createdAt: new Date().toISOString() }; report.updates.unshift(update); save(data); return response({ data: { report, update } }, 201); }
		if (path.pathname.endsWith('/municipality/notifications/broadcast')) { data.messages.unshift({ id: `msg-${Date.now()}`, areaId: 'all', author: 'Municipality', role: 'official', message: `${payload.subject}: ${payload.message}`, createdAt: new Date().toISOString() }); save(data); return response({ data: { recipientCount: data.users.length, status: 'queued' } }, 202); }
		if (path.pathname.endsWith('/workflow/route')) return response({ data: { reportId: payload.reportId ?? null, department: payload.department ?? 'Operations', status: 'queued' } }, 202);
		if (path.pathname.endsWith('/reporting/transparency')) { const reports = scoped(data.reports, path.searchParams.get('area')); return response({ data: { reportingPeriod: 'current', totalReports: reports.length, resolutionRate: reports.length ? Math.round(reports.filter((report) => report.status === 'resolved').length / reports.length * 100) : 0 } }); }
		return response({ error: 'Demo endpoint unavailable.' }, 404);
	};
};