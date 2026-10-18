const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { MANIFEST_APP, DATABASE, readPublicKey, publicKeyObject } = require('./signing');

const [dir, version] = process.argv.slice(2);
if (!dir || !version) {
  console.error('Usage: UPDATE_SIGNING_KEY=... node scripts/sign-release.js <folder with database.txt> <version>');
  process.exit(2);
}
const secret = (process.env.UPDATE_SIGNING_KEY || '').trim();
if (!secret) throw new Error('UPDATE_SIGNING_KEY is not set in the release-signing environment');
const pinned = readPublicKey();
if (!pinned) throw new Error('update-key.pub has no public key. Run node scripts/update-keys.js first.');

const database = path.join(dir, DATABASE);
if (!fs.existsSync(database)) throw new Error(`${database} is missing`);
const files = { [DATABASE]: crypto.createHash('sha256').update(fs.readFileSync(database)).digest('hex') };
const manifest = Buffer.from(JSON.stringify({ name: MANIFEST_APP, version, files }, null, 2) + '\n');
const privateKey = crypto.createPrivateKey({ key: Buffer.from(secret, 'base64'), format: 'der', type: 'pkcs8' });
const signature = crypto.sign('sha256', manifest, privateKey);
if (!crypto.verify('sha256', manifest, publicKeyObject(pinned), signature)) {
  throw new Error('UPDATE_SIGNING_KEY does not match update-key.pub');
}
fs.writeFileSync(path.join(dir, 'update.json'), manifest);
fs.writeFileSync(path.join(dir, 'update.json.sig'), signature.toString('base64') + '\n');
console.log(`signed update.json for database ${version}`);
