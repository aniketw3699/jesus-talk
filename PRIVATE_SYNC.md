# Local-first private sync

## Default behavior

Signing in does **not** upload the user's journal, prayer intentions, spiritual-state summary, journey progress, or local conversation archive.

The local Journal works without an account.

Lay It Down remains ephemeral and is never included in backup.

## Optional Plus encrypted backup

Plus users may explicitly create a cross-device backup.

1. The browser builds a snapshot from an allow-list of local fields.
2. A key is derived from the user's backup passphrase with PBKDF2-SHA256.
3. The snapshot is encrypted in the browser with AES-256-GCM.
4. Only ciphertext, salt, IV, encryption metadata, and chunk count are written to Firestore.
5. The passphrase is never written to Firestore or localStorage.
6. On restore, ciphertext is downloaded and decrypted locally with the user's passphrase.
7. Users can delete the encrypted cloud backup while retaining local data.

## Backed-up local fields

- journal sessions
- local spiritual-state summary
- prayer intentions
- journey progress
- selected onboarding/preferences
- local topic-memory summary

Active UI feed HTML and active conversation history are intentionally excluded because the journal is the durable local record. Lay It Down text is excluded.

## Firestore location

`users/{uid}/encrypted_backups/current`

Ciphertext chunks are stored at:

`users/{uid}/encrypted_backups/current/chunks/{chunkId}`

## Security rules

The production rules now:
- limit normal browser account creation to the expected free-account fields;
- allow client account updates only for `email`, `displayName` and `lastActive`;
- block browser writes to subscription, quota and billing fields;
- block the legacy plaintext `saved_prayers` collection;
- validate encrypted-backup algorithm/KDF metadata;
- cap backup chunk count and ciphertext chunk size;
- restrict every backup document to the authenticated owner;
- block all client access to server-managed guest quota records.

## Deployment requirement

The updated `firestore.rules` must be deployed to Firebase before encrypted backup/restore or the hardened account rules are considered live.

## Recovery limitation

There is intentionally no server-side passphrase recovery. Losing the backup passphrase means the encrypted backup cannot be decrypted.
