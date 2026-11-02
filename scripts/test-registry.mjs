import fs from 'node:fs';
import assert from 'node:assert/strict';
const registry = JSON.parse(fs.readFileSync(new URL('../module-registry.json', import.meta.url), 'utf8'));
assert.equal(registry.schemaVersion, 1, 'registry schema version');
assert.ok(Array.isArray(registry.modules), 'registry modules array');
for (const mod of registry.modules) {
  assert.match(mod.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `module id ${mod.id}`);
  assert.match(mod.version, /^\d+\.\d+\.\d+$/, `module version ${mod.id}`);
  for (const file of ['module.json', 'module.html', 'module.css', 'module.js']) {
    assert.ok(fs.existsSync(new URL(`../${mod.entry}${file}`, import.meta.url)), `${mod.id} contains ${file}`);
  }
}
console.log(`Registry test passed (${registry.modules.length} module(s)).`);
