import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const modulesDir = path.join(root, 'modules');
const output = path.join(root, 'module-registry.json');
const validId = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const requiredFiles = ['module.json', 'module.html', 'module.css', 'module.js'];
const modules = [];
if (fs.existsSync(modulesDir)) {
  for (const entry of fs.readdirSync(modulesDir, { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(modulesDir, entry.name);
    const missing = requiredFiles.filter(file => !fs.existsSync(path.join(dir, file)));
    if (missing.length) { console.warn(`Skipping ${entry.name}: missing ${missing.join(', ')}`); continue; }
    let meta;
    try { meta = JSON.parse(fs.readFileSync(path.join(dir, 'module.json'), 'utf8')); }
    catch (error) { console.warn(`Skipping ${entry.name}: invalid JSON (${error.message})`); continue; }
    const errors = [];
    for (const file of requiredFiles) { if (!fs.readFileSync(path.join(dir, file), 'utf8').trim()) errors.push(`${file} must not be empty`); }
    try { new vm.Script(fs.readFileSync(path.join(dir, 'module.js'), 'utf8'), { filename: `${entry.name}/module.js` }); }
    catch (error) { errors.push(`module.js syntax error: ${error.message}`); }
    if (meta.id !== entry.name || !validId.test(meta.id || '')) errors.push('id must match folder name and use lowercase kebab-case');
    if (!meta.name || typeof meta.name !== 'string') errors.push('name is required');
    if (!/^\d+\.\d+\.\d+$/.test(meta.version || '')) errors.push('version must be semver x.y.z');
    if (!meta.description || typeof meta.description !== 'string') errors.push('description is required');
    if (!Array.isArray(meta.capabilities)) errors.push('capabilities must be an array');
    if (meta.minAppVersion && !/^\d+\.\d+\.\d+$/.test(meta.minAppVersion)) errors.push('minAppVersion must be semver');
    if (errors.length) { console.warn(`Skipping ${entry.name}: ${errors.join('; ')}`); continue; }
    modules.push({
      id: meta.id, name: meta.name, version: meta.version, description: meta.description,
      minAppVersion: meta.minAppVersion || '0.1.0', capabilities: meta.capabilities,
      entry: `modules/${entry.name}/`, files: requiredFiles
    });
  }
}
const registry = { schemaVersion: 1, appVersion: '0.17.0', generatedAt: new Date().toISOString(), modules };
fs.writeFileSync(output, JSON.stringify(registry, null, 2) + '\n');
console.log(`Generated ${path.relative(root, output)} with ${modules.length} valid module(s).`);
