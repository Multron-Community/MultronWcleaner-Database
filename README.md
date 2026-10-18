The use of a configurable database file for Multron Win Cleaner is simple and practical. Community contributions are welcome!

Contribute: You can develop the database further and submit your own commits.

Review Process: All submissions will be reviewed by me (winball501).

Safety First: I will verify that all submitted paths are safe to clean. If a path includes locations that should not be cleaned by default, it will be edited and corrected before being added.

Enjoy using Multron Win Cleaner!

## Database format

`database.txt` is a list of groups. Each group is shown as one section in the app.

```
{=Windows Update
WindowsUpdateDownload=C:\WINDOWS\SoftwareDistribution\Download=true
WindowsSoftwareDistributionData=C:\Windows\SoftwareDistribution\DataStore=false
}
```

- `{=Name` starts a group and `}` ends it. Group names must be unique.
- Each entry is `Name=Path=true` or `Name=Path=false`. `true` means the entry is selected by default.
- `{##}` in a path is replaced with each Windows user name.
- Browser groups can use `#profile#=` and `#profileget#` lines to clean every browser profile.

Groups are sorted by category: Windows components first, then Microsoft Store apps, web browsers, communication, office, developer tools, AI apps, graphics and video, media, game launchers, games, emulators, security, utilities, cloud storage, remote access and VPN, downloads and torrents, virtualization, drivers and hardware, PC manufacturer apps and legacy software. Please add a new group to the category it belongs to.

Check the file before you commit:

```
node scripts/validate-database.js
```

## Releases

Releases are published automatically. Add a file named after the next version to [`release-notes/`](release-notes/README.md) and push to `main`.

## Signed releases

Every release is signed. The **Release database** workflow checks `database.txt` without any secrets; a second job in the protected `release-signing` environment then signs exactly that file and publishes it with:

- `database.txt`, the only `.txt` file, so older versions of the app keep working;
- `update.json`, the version and the SHA-256 of `database.txt`;
- `update.json.sig`, the ECDSA P-256 signature of `update.json`, and a GitHub build attestation.

Multron Win Cleaner 1.26.5 and later have the public key built in (`update-key.pub` here) and refuse a database whose signature, version or SHA-256 does not match. Check a download with `node scripts/verify-update.js update.json update.json.sig database.txt`.

**For maintainers:** the key was created with `node scripts/update-keys.js`. The private key is the `UPDATE_SIGNING_KEY` secret of this repository's `release-signing` environment and is never committed. Keep an offline backup: the app only accepts databases signed with this key.
