import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

const serverSource = fs.readFileSync(path.resolve(import.meta.dirname, '../server/index.js'), 'utf8');
const extractArray = (name, nextMarker) => {
	const match = serverSource.match(new RegExp(`const ${name} = (\\[[\\s\\S]*?\\]);\\r?\\n\\r?\\n${nextMarker}`));
	if (!match) throw new Error(`Could not load municipal demo ${name}.`);
	return match[1];
};

const municipalDemoData = () => ({
	name: 'municipal-demo-data',
	resolveId: (id) => id === 'virtual:municipal-demo-data' ? id : null,
	load: (id) => id === 'virtual:municipal-demo-data' ? `export const reports = ${extractArray('reports', 'const users')}; export const areas = ${extractArray('areas', 'const childAreaIds')};` : null,
});

export default defineConfig({
	base: process.env.GITHUB_ACTIONS ? '/CLO2TECH/' : '/',
	plugins: [municipalDemoData()],
});