/**
 * Smart Matching Logic: JavaScript Text, Category, Location, and Date Similarity Engine.
 * Calculates similarity scoring between Lost and Found items to suggest automatic matches.
 */

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
  'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were', 'will',
  'with', 'my', 'i', 'lost', 'found', 'please', 'left', 'near', 'on', 'floor', 'hall'
]);

/**
 * Tokenizes text into a clean set of normalized words, filtering out common noise.
 */
function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOP_WORDS.has(word));
}

/**
 * Calculates standard Levenshtein distance between two strings
 */
function levenshteinDistance(s1, s2) {
  const m = s1.length;
  const n = s2.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

/**
 * Calculates normalized string similarity (0.0 to 1.0)
 */
function stringSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  const s1 = str1.trim().toLowerCase();
  const s2 = str2.trim().toLowerCase();
  if (s1 === s2) return 1;
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1;
  const dist = levenshteinDistance(s1, s2);
  return Math.max(0, (maxLen - dist) / maxLen);
}

/**
 * Calculates Jaccard token overlap similarity (0.0 to 1.0)
 */
function tokenJaccard(tokens1, tokens2) {
  if (!tokens1.length || !tokens2.length) return 0;
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);

  let intersectionCount = 0;
  for (const t of set1) {
    if (set2.has(t)) {
      intersectionCount++;
    } else {
      // Fuzzy check for slight typos or plurals
      for (const t2 of set2) {
        if (stringSimilarity(t, t2) > 0.8) {
          intersectionCount += 0.8;
          break;
        }
      }
    }
  }

  const unionSize = set1.size + set2.size - Math.floor(intersectionCount);
  return unionSize > 0 ? intersectionCount / unionSize : 0;
}

/**
 * Compares two items and returns a detailed similarity score (0 - 100)
 */
export function calculateItemSimilarity(itemA, itemB) {
  // Only compare opposite item types (Lost <-> Found)
  if (!itemA || !itemB || itemA.type === itemB.type) {
    return { score: 0, confidence: 'None', reasons: [] };
  }

  const reasons = [];

  // 1. Category Similarity (Weight: 35%)
  let categoryScore = 0;
  if (itemA.category === itemB.category) {
    categoryScore = 1.0;
    reasons.push(`Exact Category Match: ${itemA.category}`);
  } else {
    // Cross-category affinities (e.g. IDs & Cards often correlate with Wallets & Bags)
    const related = [
      ['Wallets & Bags', 'IDs & Cards'],
      ['Electronics', 'Other']
    ];
    const isRelated = related.some(([c1, c2]) => 
      (itemA.category === c1 && itemB.category === c2) ||
      (itemA.category === c2 && itemB.category === c1)
    );
    if (isRelated) {
      categoryScore = 0.4;
      reasons.push(`Related Categories: ${itemA.category} & ${itemB.category}`);
    }
  }

  // 2. Text Similarity (Title & Description) (Weight: 35%)
  const tokensA = [...tokenize(itemA.title), ...tokenize(itemA.description)];
  const tokensB = [...tokenize(itemB.title), ...tokenize(itemB.description)];
  const titleTokensA = tokenize(itemA.title);
  const titleTokensB = tokenize(itemB.title);

  const textJaccard = tokenJaccard(tokensA, tokensB);
  const titleJaccard = tokenJaccard(titleTokensA, titleTokensB);
  const textScore = (titleJaccard * 0.6) + (textJaccard * 0.4);

  // Collect matching keywords
  const matchedKeywords = titleTokensA.filter(t => titleTokensB.includes(t));
  if (matchedKeywords.length > 0) {
    reasons.push(`Key terms match: "${matchedKeywords.slice(0, 3).join('", "')}"`);
  }

  // 3. Location Similarity (Weight: 15%)
  const locTokensA = tokenize(itemA.location);
  const locTokensB = tokenize(itemB.location);
  const locScore = tokenJaccard(locTokensA, locTokensB);
  if (locScore > 0.3) {
    reasons.push(`Location proximity match in "${itemA.location}"`);
  }

  // 4. Date Proximity (Weight: 15%)
  let dateScore = 0;
  if (itemA.item_date && itemB.item_date) {
    const d1 = new Date(itemA.item_date);
    const d2 = new Date(itemB.item_date);
    const diffDays = Math.abs((d1 - d2) / (1000 * 60 * 60 * 24));

    if (diffDays <= 1) dateScore = 1.0;
    else if (diffDays <= 3) dateScore = 0.85;
    else if (diffDays <= 7) dateScore = 0.6;
    else if (diffDays <= 14) dateScore = 0.3;
    else dateScore = 0.1;

    if (diffDays <= 3) {
      reasons.push(`Reported dates within ${Math.round(diffDays)} day(s)`);
    }
  }

  // Weighted total score (0 to 100)
  const weighted = (
    (categoryScore * 0.35) +
    (textScore * 0.35) +
    (locScore * 0.15) +
    (dateScore * 0.15)
  ) * 100;

  const score = Math.min(100, Math.round(weighted));

  let confidence = 'Low';
  if (score >= 70) confidence = 'High';
  else if (score >= 45) confidence = 'Medium';

  return {
    score,
    confidence,
    reasons,
    breakdown: {
      categoryScore: Math.round(categoryScore * 100),
      textScore: Math.round(textScore * 100),
      locationScore: Math.round(locScore * 100),
      dateScore: Math.round(dateScore * 100)
    }
  };
}

/**
 * Finds all matching items for a target item from a list of candidates
 */
export function findMatchesFor(targetItem, allItems, minScore = 40) {
  if (!targetItem || !Array.isArray(allItems)) return [];

  const results = [];
  for (const item of allItems) {
    if (item.id === targetItem.id) continue;
    if (item.type === targetItem.type) continue; // Only compare Lost to Found

    const sim = calculateItemSimilarity(targetItem, item);
    if (sim.score >= minScore) {
      results.push({
        candidate: item,
        ...sim
      });
    }
  }

  // Sort descending by score
  return results.sort((a, b) => b.score - a.score);
}

/**
 * Finds all pairs of Lost <-> Found matches across the whole database
 */
export function findAllPairMatches(allItems, minScore = 45) {
  if (!Array.isArray(allItems)) return [];

  const lostItems = allItems.filter(i => i.type === 'lost' && i.status !== 'resolved');
  const foundItems = allItems.filter(i => i.type === 'found' && i.status !== 'resolved');

  const pairs = [];
  const seen = new Set();

  for (const lost of lostItems) {
    for (const found of foundItems) {
      const pairKey = `${lost.id}::${found.id}`;
      if (seen.has(pairKey)) continue;

      const sim = calculateItemSimilarity(lost, found);
      if (sim.score >= minScore) {
        pairs.push({
          lostItem: lost,
          foundItem: found,
          ...sim
        });
        seen.add(pairKey);
      }
    }
  }

  return pairs.sort((a, b) => b.score - a.score);
}
