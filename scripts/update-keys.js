const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { root, keyFile, readPublicKey } = require('./signing');

const args = process.argv.slice(2);
const rotate = args.includes('--rotate');
const out = path.resolve(args.find((a) => !a.startsWith('--')) || path.join(os.homedir(), 'multron-wincleaner-database-signing-key.txt'));

if (readPublicKey() && !rotate) {
  console.error(`A database signing key is already set in update-key.pub.
Multron Win Cleaner only accepts databases signed with that key. Run with --rotate
only if the old private key is lost or leaked, and put the new public key into
MultronWinCleaner/Processes/UpdateKey.cs (DatabasePublicKey) of the app.`);
  process.exit(1);
}
if (out.startsWith(root + path.sep)) {
  console.error('Save the private key outside the repository, so it can never be committed.');
  process.exit(1);
}
if (fs.existsSync(out)) {
  console.error(`${out} already exists; choose another path.`);
  process.exit(1);
}

const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
const pub = publicKey.export({ format: 'der', type: 'spki' }).toString('base64');
fs.writeFileSync(out, privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64') + '\n', { mode: 0o600 });
fs.writeFileSync(keyFile, pub + '\n');

console.log(`Public key written to update-key.pub (commit this file):
${pub}

Put the same public key into MultronWinCleaner/Processes/UpdateKey.cs (DatabasePublicKey) of the app.
Private key written to ${out}

Next steps:
  1. GitHub → Settings → Environments → New environment "release-signing" in this repository.
  2. Add a required reviewer (you) and limit it to the "main" branch.
  3. Add an environment secret UPDATE_SIGNING_KEY with the content of the private key file.
  4. Keep an offline backup of the private key file, then delete it from this computer.`);
