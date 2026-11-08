// Small settings kept on the player's device. Storage can be blocked, as in
// some private browsing, or throw when read, so every call is wrapped and
// the game plays on with its defaults.

const PREFIX = 'tier-four.';

// `getStorage` returns a Storage-like object (getItem, setItem). It is a
// function because merely reading window.localStorage can throw.
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
    };
}
