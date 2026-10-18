const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const keyFile = path.join(root, 'update-key.pub');
const MANIFEST_APP = 'multron-win-cleaner-database';
const DATABASE = 'database.txt';

function readPublicKey() {
  return fs.existsSync(keyFile) ? fs.readFileSync(keyFile, 'utf8').trim() : '';
}

function publicKeyObject(base64) {
  return crypto.createPublicKey({ key: Buffer.from(base64, 'base64'), format: 'der', type: 'spki' });
}

module.exports = { root, keyFile, MANIFEST_APP, DATABASE, readPublicKey, publicKeyObject };
