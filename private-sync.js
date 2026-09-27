(() => {
  "use strict";

  const SNAPSHOT_SCHEMA = 1;
  const ENCRYPTION_VERSION = 1;
  const PBKDF2_ITERATIONS = 210000;

  // Only these local-first fields are eligible for optional encrypted backup.
  // Ephemeral Lay It Down text is never stored, so it can never enter a backup.
  const ALLOWED_KEYS = [
    "jesus_journal_sessions",
    "jesus_soul_journey_psyche",
    "jesus_user_intentions",
    "jesus_surrendered_count",
    "jesus_music_enabled",
    "jesus_quiz_completed",
    "jesus_quiz_burden",
    "jesus_quiz_time",
    "jesus_quiz_need",
    "oneintoone_journey_anxiety_completed",
    "oneintoone_journey_surrender_completed",
    "oneintoone_journey_forgiveness_completed",
    "oneintoone_last_journey",
    "oneintoone_local_memory_v1"
  ];

  function bytesToBase64(bytes) {
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunk, bytes.length)));
    }
    return btoa(binary);
  }

  function base64ToBytes(value) {
    const binary = atob(String(value || ""));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  async function deriveKey(passphrase, salt, usages) {
    const material = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(passphrase),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      {
        name:"PBKDF2",
        hash:"SHA-256",
        salt:salt,
        iterations:PBKDF2_ITERATIONS
      },
      material,
      { name:"AES-GCM", length:256 },
      false,
      usages
    );
  }

  function buildSnapshot() {
    const data = {};
    for (const key of ALLOWED_KEYS) {
      const value = localStorage.getItem(key);
      if (value !== null) data[key] = value;
    }

    return {
      schema:SNAPSHOT_SCHEMA,
      exportedAt:new Date().toISOString(),
      data:data
    };
  }

  function snapshotStats(snapshot) {
    const data = snapshot && snapshot.data ? snapshot.data : {};
    let journalSessions = 0;
    let journalTurns = 0;
    try {
      const sessions = JSON.parse(data.jesus_journal_sessions || "[]");
      if (Array.isArray(sessions)) {
        journalSessions = sessions.length;
        journalTurns = sessions.reduce(function(total, session) {
          return total + (Array.isArray(session.turns) ? session.turns.length : 0);
        }, 0);
      }
    } catch (_) {}

    const journeyTracks = [
      "oneintoone_journey_anxiety_completed",
      "oneintoone_journey_surrender_completed",
      "oneintoone_journey_forgiveness_completed"
    ].filter(function(key) { return data[key] != null; }).length;

    return {
      journalSessions:journalSessions,
      journalTurns:journalTurns,
      journeyTracks:journeyTracks
    };
  }

  async function encryptSnapshot(snapshot, passphrase) {
    if (!window.crypto || !crypto.subtle) throw new Error("Secure browser encryption is unavailable.");
    if (String(passphrase || "").length < 10) throw new Error("Use a backup passphrase of at least 10 characters.");

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(passphrase, salt, ["encrypt"]);
    const plainBytes = new TextEncoder().encode(JSON.stringify(snapshot));

    if (plainBytes.byteLength > 4 * 1024 * 1024) {
      throw new Error("This local journal is too large for the current backup version. Clear older journal history or export fewer entries first.");
    }

    const encrypted = await crypto.subtle.encrypt(
      { name:"AES-GCM", iv:iv },
      key,
      plainBytes
    );

    return {
      version:ENCRYPTION_VERSION,
      algorithm:"AES-GCM",
      kdf:"PBKDF2-SHA256",
      iterations:PBKDF2_ITERATIONS,
      salt:bytesToBase64(salt),
      iv:bytesToBase64(iv),
      ciphertext:bytesToBase64(new Uint8Array(encrypted))
    };
  }

  async function decryptBackup(payload, passphrase) {
    if (!payload || Number(payload.version) !== ENCRYPTION_VERSION) {
      throw new Error("Unsupported backup version.");
    }
    if (String(passphrase || "").length < 10) {
      throw new Error("Enter the backup passphrase used when this backup was created.");
    }

    try {
      const salt = base64ToBytes(payload.salt);
      const iv = base64ToBytes(payload.iv);
      const encrypted = base64ToBytes(payload.ciphertext);
      const key = await deriveKey(passphrase, salt, ["decrypt"]);
      const decrypted = await crypto.subtle.decrypt(
        { name:"AES-GCM", iv:iv },
        key,
        encrypted
      );
      const snapshot = JSON.parse(new TextDecoder().decode(decrypted));
      if (!snapshot || Number(snapshot.schema) !== SNAPSHOT_SCHEMA || !snapshot.data) {
        throw new Error("Invalid backup.");
      }
      return snapshot;
    } catch (_) {
      throw new Error("Backup could not be decrypted. Check the passphrase and try again.");
    }
  }

  function applySnapshot(snapshot) {
    if (!snapshot || Number(snapshot.schema) !== SNAPSHOT_SCHEMA || !snapshot.data) {
      throw new Error("Invalid backup snapshot.");
    }

    const allowed = new Set(ALLOWED_KEYS);
    for (const key of Object.keys(snapshot.data)) {
      if (!allowed.has(key)) continue;
      const value = snapshot.data[key];
      if (value == null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, String(value));
      }
    }
  }

  function splitCiphertext(ciphertext, maxChars) {
    const size = Math.max(100000, Number(maxChars) || 240000);
    const chunks = [];
    const value = String(ciphertext || "");
    for (let i = 0; i < value.length; i += size) chunks.push(value.slice(i, i + size));
    return chunks;
  }

  window.ONEINTOONE_PRIVATE_SYNC = {
    version:"1.0.0",
    allowedKeys:ALLOWED_KEYS.slice(),
    buildSnapshot:buildSnapshot,
    snapshotStats:snapshotStats,
    encryptSnapshot:encryptSnapshot,
    decryptBackup:decryptBackup,
    applySnapshot:applySnapshot,
    splitCiphertext:splitCiphertext
  };
})();