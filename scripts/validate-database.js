#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const PROTECTED = [
  'C:\\', 'C:\\Windows', 'C:\\Windows\\System32', 'C:\\Windows\\SysWOW64', 'C:\\Windows\\WinSxS',
  'C:\\Windows\\Installer', 'C:\\Windows\\Fonts', 'C:\\Windows\\System32\\config', 'C:\\Windows\\System32\\drivers',
  'C:\\Windows\\System32\\DriverStore', 'C:\\Program Files', 'C:\\Program Files (x86)', 'C:\\Program Files\\WindowsApps',
  'C:\\ProgramData', 'C:\\ProgramData\\Microsoft', 'C:\\Users', 'C:\\Users\\{##}', 'C:\\Users\\{##}\\AppData',
  'C:\\Users\\{##}\\AppData\\Local', 'C:\\Users\\{##}\\AppData\\LocalLow', 'C:\\Users\\{##}\\AppData\\Roaming',
  'C:\\Users\\{##}\\AppData\\Local\\Packages', 'C:\\Users\\{##}\\AppData\\Local\\Microsoft',
  'C:\\Users\\{##}\\AppData\\Roaming\\Microsoft', 'C:\\Users\\{##}\\Desktop', 'C:\\Users\\{##}\\Documents',
  'C:\\Users\\{##}\\Pictures', 'C:\\Users\\{##}\\Videos', 'C:\\Users\\{##}\\Music', 'C:\\Users\\{##}\\OneDrive',
].map(p => normalize(p));

function normalize(p) {
  return p.toLowerCase().replace(/\\+$/, '') || p.toLowerCase();
}

function validate(text) {
  const errors = [];
  const warnings = [];
  const sections = [];
  const sectionLines = new Map();
  const pathLines = new Map();
  let section = null;
  let entries = 0;
  let enabled = 0;
  let wildcards = 0;

  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    const n = i + 1;
    const error = msg => errors.push(`line ${n}: ${msg}`);
    if (!line) return;

    if (line.startsWith('{')) {
      if (section) error(`section "${section.name}" is not closed before a new one starts`);
      const [name = '', kind, processes, ...extra] = line.slice(2).split('=').map(s => s.trim());
      if (!line.startsWith('{=') || !name) error('a section must start with {=Name');
      else if (kind !== undefined && kind !== 'browser' && kind !== 'app') error(`section "${name}": unknown tag "${kind}" (use "browser" or "app")`);
      else if (extra.length > 0) error(`section "${name}": too many "=" signs in the section line`);
      else if (processes !== undefined && !processes.split(',').every(p => /^[\w .-]+\.exe$/i.test(p.trim())))
        error(`section "${name}": process names must be a comma-separated list of .exe files`);
      else if (sectionLines.has(name.toLowerCase())) error(`section "${name}" already exists on line ${sectionLines.get(name.toLowerCase())}`);
      section = { name, line: n, count: 0, profileRoot: false, subPaths: new Set() };
      sections.push(section);
      sectionLines.set(name.toLowerCase(), n);
      return;
    }
    if (line.startsWith('}')) {
      if (!section) error('"}" without an open section');
      else if (section.count === 0) error(`section "${section.name}" is empty`);
      section = null;
      return;
    }
    if (!section) return error(`entry outside of a section: ${line}`);
    section.count++;

    const parts = line.split('=');
    if (line.startsWith('#profile#=')) {
      checkPath(parts[1], error);
      section.profileRoot = true;
      return;
    }

    const name = parts[0];
    if (!name) return error('entry has no name');
    if (parts[1] === '#profileget#') {
      if (!section.profileRoot) error(`${name}: #profileget# needs a #profile#= line earlier in the section`);
      if (!parts[2] || !parts[2].startsWith('\\')) error(`${name}: profile sub-path must start with "\\"`);
      if (!/^(true|false)$/.test(parts[3] || '')) error(`${name}: the value after the sub-path must be true or false`);
      if (parts.length > 5) error(`${name}: too many "=" signs`);
      const key = (parts[2] || '').toLowerCase();
      if (section.subPaths.has(key)) error(`${name}: profile sub-path ${parts[2]} is listed twice in this section`);
      section.subPaths.add(key);
      entries++;
      if (parts[3] === 'true') enabled++;
      return;
    }

    if (parts.length < 3) return error(`${name}: expected Name=Path=true|false`);
    if (parts.length > 4) return error(`${name}: too many "=" signs (a path must not contain "=")`);
    if (!/^(true|false)$/.test(parts[2])) return error(`${name}: the value after the path must be true or false, not "${parts[2]}"`);
    checkPath(parts[1], error);
    if (parts[1].includes('*')) wildcards++;

    const key = normalize(parts[1]);
    if (pathLines.has(key)) error(`${name}: path is already used on line ${pathLines.get(key)}`);
    else pathLines.set(key, n);
    entries++;
    if (parts[2] === 'true') enabled++;
  });

  if (section) errors.push(`section "${section.name}" (line ${section.line}) is never closed with "}"`);
  if (!sections.length) errors.push('the file has no sections');
  if (wildcards) warnings.push(`${wildcards} path(s) contain "*". The app does not expand wildcards yet, so they are shown but not scanned.`);

  return { errors, warnings, stats: { sections: sections.length, entries, enabled } };
}

function checkPath(p, error) {
  if (!p) return error('entry has no path');
  if (!/^[A-Za-z]:\\/.test(p)) return error(`path must be absolute (like C:\\...): ${p}`);
  if (/[<>"|?]/.test(p)) error(`path contains a character Windows does not allow: ${p}`);
  if (PROTECTED.includes(normalize(p))) error(`path is a protected system or user folder and must not be cleaned: ${p}`);
}

module.exports = { validate };

if (require.main === module) {
  const file = process.argv[2] || path.join(__dirname, '..', 'database.txt');
  const { errors, warnings, stats } = validate(fs.readFileSync(file, 'utf8'));
  for (const w of warnings) console.log(`warning: ${w}`);
  for (const e of errors) console.log(`error: ${e}`);
  console.log(`${path.basename(file)}: ${stats.sections} sections, ${stats.entries} entries (${stats.enabled} enabled by default)`);
  if (errors.length) {
    console.log(`${errors.length} error(s) found.`);
    process.exit(1);
  }
  console.log('OK');
}
