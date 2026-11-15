// Settings and saves kept on the player's device. Storage can be blocked, as
// in some private browsing, or throw when read, so every call is wrapped and
// the game plays on with its defaults. One save slot per mode.

const PREFIX = 'tier-four.';

// `getStorage` returns a Storage-like object (getItem, setItem, removeItem).
// It is a function because merely reading window.localStorage can throw.
export function settings(getStorage) {
    const storage = () => {
        try {
            return getStorage() ?? null;
        } catch {
            return null;
        }
    };
    return {
        get(key, fallback) {
            try {
                const value = storage()?.getItem(PREFIX + key);
                return value ?? fallback;
            } catch {
                return fallback;
            }
        },
        // Returns false if the value couldn't be saved.
        set(key, value) {
            try {
                const s = storage();
                if (!s) return false;
                s.setItem(PREFIX + key, value);
                return true;
            } catch {
                return false;
            }
        },
        remove(key) {
            try {
                storage()?.removeItem(PREFIX + key);
            } catch { /* nothing to do */ }
        },
        // True if a value can be written and read back right now.
        get available() {
            try {
                const s = storage();
                if (!s) return false;
                s.setItem(PREFIX + 'probe', '1');
                s.removeItem(PREFIX + 'probe');
                return true;
            } catch {
                return false;
            }
        },
    };
}

// JSON on top of the string store.
export function jsonStore(store) {
    return {
        get(key, fallback) {
            const raw = store.get(key, null);
            if (raw === null) return fallback;
            try {
                return JSON.parse(raw);
            } catch {
                return fallback;
            }
        },
        set: (key, value) => store.set(key, JSON.stringify(value)),
        remove: key => store.remove(key),
        get available() {
            return store.available;
        },
    };
}

export const saveKey = mode => `save.${mode}`;

// Saves travel between browsers as a text code: "T4." plus base64 of the
// JSON plus a short checksum, so a mistyped code is refused rather than
// loaded.
const MAGIC = 'T4.';

function checksum(text) {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
}

const toBase64 = text => btoa(String.fromCharCode(...new TextEncoder().encode(text)));
const fromBase64 = b64 => new TextDecoder().decode(Uint8Array.from(atob(b64), c => c.charCodeAt(0)));

export function exportCode(play) {
    const json = JSON.stringify(play);
    return `${MAGIC}${toBase64(json)}.${checksum(json)}`;
}

// Returns the play, or throws with a message fit to show.
export function importCode(code) {
    const trimmed = (code ?? '').replace(/\s+/g, '');
    if (!trimmed.startsWith(MAGIC)) throw new Error('That isn’t a Tier Four save code.');
    const dot = trimmed.lastIndexOf('.');
    if (dot <= MAGIC.length) throw new Error('The save code is incomplete.');
    let json;
    try {
        json = fromBase64(trimmed.slice(MAGIC.length, dot));
    } catch {
        throw new Error('The save code is damaged.');
    }
    if (checksum(json) !== trimmed.slice(dot + 1)) throw new Error('The save code doesn’t match its checksum. Check it was copied whole.');
    return JSON.parse(json);
}
