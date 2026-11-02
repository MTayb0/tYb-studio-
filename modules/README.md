# Module authoring

Copy `sample-hello/` and rename it to a lowercase kebab-case ID. Edit `module.json`, `module.html`, `module.css` and `module.js`; do not edit the main app to register it. `node scripts/build-registry.mjs` scans the folder and generates `module-registry.json`. See the root README for compatibility, versioning, security and deployment rules.
