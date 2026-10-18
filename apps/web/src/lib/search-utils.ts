/**
 * Pure search matching utilities with typo tolerance and roll number normalization.
 * Designed for Ascora student directory and command palette search.
 */

/** Normalize roll numbers and strings by removing non-alphanumeric noise */
export function normalizeString(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Compute Levenshtein distance between two short strings */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  // Use single-row DP to conserve memory
  const dp = Array.from({ length: n + 1 }, (_, i) => i);

  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      if (a[i - 1] === b[j - 1]) {
        dp[j] = prev;
      } else {
        dp[j] = Math.min(prev + 1, dp[j] + 1, dp[j - 1] + 1);
      }
      prev = temp;
    }
  }

  return dp[n];
}

/**
 * Checks if a candidate string matches a query with typo tolerance.
 * Supports:
 * 1. Exact substring match
 * 2. Token prefix match
 * 3. Normalized alphanumeric match (e.g. roll numbers with or without dashes)
 * 4. Typo tolerance: Levenshtein distance <= 1 for tokens of length >= 4, <= 2 for length >= 7.
 */
export function matchesStudentQuery(name: string, id: string, query: string): boolean {
  const cleanQ = query.trim().toLowerCase();
  if (!cleanQ) return false;

  const cleanName = name.toLowerCase();
  const cleanId = id.toLowerCase();

  // 1. Direct substring match on name or ID
  if (cleanName.includes(cleanQ) || cleanId.includes(cleanQ)) {
    return true;
  }

  // 2. Normalized roll number matching (e.g., "24cse042" or "cu-24-cse-0042")
  const normQ = normalizeString(cleanQ);
  const normId = normalizeString(cleanId);
  if (normQ.length >= 2 && (normId.includes(normQ) || normQ.includes(normId))) {
    return true;
  }

  // 3. Multi-word token matching: every query word matches some name token
  const queryTokens = cleanQ.split(/\s+/).filter(Boolean);
  const nameTokens = cleanName.split(/\s+/).filter(Boolean);

  const allTokensMatch = queryTokens.every((qTok) => {
    return nameTokens.some((nTok) => {
      if (nTok.includes(qTok)) return true;
      // Typo tolerance: allow distance 1 for tokens >= 4 chars, 2 for >= 7 chars
      if (qTok.length >= 4) {
        const maxDist = qTok.length >= 7 ? 2 : 1;
        return levenshteinDistance(qTok, nTok.slice(0, qTok.length + 1)) <= maxDist;
      }
      return false;
    });
  });

  return allTokensMatch;
}
