/**
 * chatStorage.ts
 * Handles all localStorage operations for the chat system.
 * - Keys are scoped per user + room to prevent cross-user data leaks.
 * - Only confirmed (sent) messages are persisted.
 * - Max 200 messages per room, entries older than 7 days are pruned.
 */

const MAX_MESSAGES = 200;
const EXPIRY_DAYS = 7;
const PREFIX = 'cb_chat';

export interface StoredMessage {
  id: number;
  senderId: number;
  senderName: string;
  content: string;
  timestamp: string;
  isMe: boolean;
}

/** Build a unique, scoped key for a chat room. */
export function buildRoomKey(
  userId: number,
  caseId: number,
  roomType: string,
  targetUserId?: number | null
): string {
  const target = targetUserId ?? 'none';
  return `${PREFIX}_${userId}_${caseId}_${roomType}_${target}`;
}

/** Load persisted messages for a room. Returns [] on any error. */
export function loadFromStorage(key: string): StoredMessage[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed: StoredMessage[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Prune messages older than EXPIRY_DAYS
    const cutoff = Date.now() - EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    return parsed.filter(m => new Date(m.timestamp).getTime() > cutoff);
  } catch {
    // Corrupted data — wipe and start fresh
    localStorage.removeItem(key);
    return [];
  }
}

/** Persist messages to localStorage, deduplicating and pruning. */
export function saveToStorage(key: string, messages: StoredMessage[]): void {
  try {
    // Deduplicate by real ID (positive IDs only)
    const seen = new Set<number>();
    const deduped = messages
      .filter(m => m.id > 0) // never store optimistic entries (negative IDs)
      .filter(m => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });

    // Keep only the most recent MAX_MESSAGES
    const pruned = deduped.slice(-MAX_MESSAGES);

    localStorage.setItem(key, JSON.stringify(pruned));
  } catch (e: any) {
    // QuotaExceededError — remove the oldest room's data and try once more
    if (e?.name === 'QuotaExceededError') {
      pruneOldestRoom();
      try {
        localStorage.setItem(key, JSON.stringify(messages.slice(-50)));
      } catch {
        // Give up silently — optimistic UI still works without persistence
      }
    }
  }
}

/**
 * Merge backend history with locally cached messages.
 * Backend is the source of truth for confirmed messages.
 * Result is sorted by timestamp ascending.
 */
export function mergeMessages(
  backend: StoredMessage[],
  local: StoredMessage[]
): StoredMessage[] {
  const map = new Map<number, StoredMessage>();

  // Local first, then backend overwrites (backend is authoritative)
  for (const m of local) map.set(m.id, m);
  for (const m of backend) map.set(m.id, m);

  return Array.from(map.values()).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

/** Clear all chat keys for a specific user on logout. */
export function clearUserChatStorage(userId: number): void {
  const prefix = `${PREFIX}_${userId}_`;
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(prefix)) keysToRemove.push(k);
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
}

/** Remove the largest/oldest chat room key when storage is full. */
function pruneOldestRoom(): void {
  let oldestKey: string | null = null;
  let oldestTime = Infinity;

  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k?.startsWith(PREFIX)) continue;
    try {
      const msgs: StoredMessage[] = JSON.parse(localStorage.getItem(k) ?? '[]');
      const oldest = msgs[0] ? new Date(msgs[0].timestamp).getTime() : Infinity;
      if (oldest < oldestTime) {
        oldestTime = oldest;
        oldestKey = k;
      }
    } catch { /* skip */ }
  }

  if (oldestKey) localStorage.removeItem(oldestKey);
}
