#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { validate } = require('./validate-database');

const root = path.join(__dirname, '..');
const args = {};
for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1] || '';

const VERSION_IN_NAME = /\d+\.\d+(\.\d+)?/;

function parseVersion(text) {
  const match = (text || '').match(VERSION_IN_NAME);
  return match ? match[0] : null;
}

function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const x = pa[i] ?? -1;
    const y = pb[i] ?? -1;
    if (x !== y) return x - y;
  }
  return 0;
}

function output(values) {
  for (const [k, v] of Object.entries(values)) console.log(`${k}=${v}`);
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(values).map(([k, v]) => `${k}=${v}\n`).join(''));
  }
}

function fail(message) {
  console.log(`::error::${message}`);
  process.exit(1);
}

function entryLines(text) {
  return new Set(text.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('{') && !l.startsWith('}')));
}

const notesDir = path.join(root, 'release-notes');
const notes = fs.readdirSync(notesDir)
  .map(file => ({ file, match: file.match(/^v?(\d+\.\d+(?:\.\d+)?)\.md$/i) }))
  .filter(n => n.match)
  .map(n => ({ file: n.file, version: n.match[1] }))
  .sort((a, b) => compareVersions(b.version, a.version));
if (!notes.length) fail('No release notes found. Add a file like release-notes/1.14.md.');
const { file, version } = notes[0];
const tag = `dbase${version}`;
const title = `Database v${version}`;

const latestVersion = parseVersion(args['latest-name']);
if (latestVersion) {
  const cmp = compareVersions(version, latestVersion);
  if (cmp === 0) {
    console.log(`Version ${version} is already released. Add a new file in release-notes/ to publish another release.`);
    output({ skip: 'true', version, tag, title });
    process.exit(0);
  }
  if (cmp < 0) fail(`release-notes/${file} has version ${version}, but the latest release is ${latestVersion}. Use a higher version number.`);
}

const dbText = fs.readFileSync(path.join(root, 'database.txt'), 'utf8');
const { errors, warnings, stats } = validate(dbText);
for (const w of warnings) console.log(`::warning::${w}`);
if (errors.length) {
  for (const e of errors.slice(0, 50)) console.log(`::error file=database.txt::${e}`);
  fail(`database.txt has ${errors.length} error(s). Nothing was released.`);
}

const body = fs.readFileSync(path.join(notesDir, file), 'utf8').trim();
const footer = ['', '---', '',
  `**Database v${version}:** ${stats.sections} sections, ${stats.entries} cleaning entries (${stats.enabled} enabled by default).`];

if (args.previous && fs.existsSync(args.previous)) {
  const before = entryLines(fs.readFileSync(args.previous, 'utf8'));
  const after = entryLines(dbText);
  const added = [...after].filter(l => !before.has(l)).length;
  const removed = [...before].filter(l => !after.has(l)).length;
  footer.push('', `**Compared with v${latestVersion}:** ${added} entries added, ${removed} removed or changed.`);
}
const sha256 = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'database.txt'))).digest('hex');
footer.push('', `SHA-256 of database.txt: \`${sha256}\``);

const out = args.out || path.join(root, '.release', 'body.md');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${body}\n${footer.join('\n')}\n`);

console.log(`Prepared ${title} (tag ${tag}) from release-notes/${file}`);
output({ skip: 'false', version, tag, title });
