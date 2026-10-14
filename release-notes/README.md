# Release notes

Each file here is the text of one database release. The file name is the version, for example `1.14.md` or `1.14.1.md`.

## How to publish a new database

1. Update `database.txt`.
2. Add a new file here named after the next version, for example `1.15.md`, and write what changed.
3. Push to `main`.

The **Release database** workflow then:

- checks `database.txt` with `scripts/validate-database.js` and stops if it finds an error;
- creates the release `Database v1.15` with the tag `dbase1.15`;
- attaches `database.txt` and uses your notes as the release text, with a short summary added at the end (number of sections and entries, what changed since the last release, and a SHA-256 checksum).

Multron Win Cleaner downloads the new database the next time it checks for updates.

## Rules

- The version must be higher than the latest release. The app only downloads a database whose version is higher than the one it has, so the workflow refuses a lower or equal version.
- Pushing changes to `database.txt` without a new notes file does not publish anything. The database is only checked.
- Only files named like a version (`1.15.md`) are read. This README is ignored.
