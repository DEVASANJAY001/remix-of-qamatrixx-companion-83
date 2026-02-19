/**
 * Enhanced fuzzy string matching for DVX defects to QA Matrix concerns.
 * Uses multiple strategies: token overlap (Jaccard), substring matching,
 * bigram similarity, and keyword boosting for manufacturing terms.
 */

// Manufacturing-specific synonyms and abbreviations
const SYNONYMS: Record<string, string[]> = {
  "brake": ["braking", "brk"],
  "seat": ["seating", "st"],
  "belt": ["seatbelt", "seat belt"],
  "window": ["windshield", "glass", "pane"],
  "wiper": ["wipers"],
  "lock": ["locked", "locking", "unlocked"],
  "bolt": ["bolts", "screw", "fastener"],
  "missing": ["absent", "not present", "shortage"],
  "damage": ["damaged", "broken", "crack", "cracked", "torn"],
  "noise": ["noisy", "vibration", "rattle", "squeak"],
  "leak": ["leaking", "leakage"],
  "error": ["wrong", "incorrect", "mismatch"],
  "spec": ["specification", "specifications"],
  "assy": ["assembly", "asy"],
  "insecure": ["loose", "not secure", "unsecure"],
  "malfunction": ["not working", "failure", "defective", "faulty"],
  "torque": ["tightening", "tq"],
  "fuel": ["petrol", "diesel", "gasoline"],
  "battery": ["batt"],
  "lamp": ["light", "bulb", "headlamp", "headlight"],
  "paint": ["painting", "painted", "colour", "color"],
  "wheel": ["tyre", "tire", "rim"],
  "connector": ["connect", "connection", "plug"],
  "harness": ["wiring", "wire", "cable"],
  "spring": ["coil"],
  "cap": ["cover"],
  "front": ["fr", "frt"],
  "rear": ["rr"],
  "left": ["lh", "lhf", "lhr"],
  "right": ["rh", "rhf", "rhr"],
};

// Station code patterns
const STATION_PATTERNS: Record<string, string> = {
  "t": "trim", "c": "chassis", "f": "final", "p": "paint",
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s\/\-]/g, " ")
    .split(/[\s\/\-]+/)
    .filter(t => t.length > 1);
}

function expandSynonyms(tokens: string[]): string[] {
  const expanded = new Set(tokens);
  for (const token of tokens) {
    // Direct synonym lookup
    if (SYNONYMS[token]) {
      SYNONYMS[token].forEach(s => expanded.add(s));
    }
    // Reverse lookup
    for (const [key, syns] of Object.entries(SYNONYMS)) {
      if (syns.includes(token)) {
        expanded.add(key);
        syns.forEach(s => expanded.add(s));
      }
    }
  }
  return [...expanded];
}

/** Generate character bigrams */
function bigrams(text: string): Set<string> {
  const s = new Set<string>();
  const lower = text.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (let i = 0; i < lower.length - 1; i++) {
    s.add(lower.substring(i, i + 2));
  }
  return s;
}

/** Dice coefficient using bigrams */
function diceCoefficient(a: string, b: string): number {
  const biA = bigrams(a);
  const biB = bigrams(b);
  if (biA.size === 0 && biB.size === 0) return 0;
  let intersection = 0;
  biA.forEach(bi => { if (biB.has(bi)) intersection++; });
  return (2 * intersection) / (biA.size + biB.size);
}

/** Jaccard similarity between two token sets */
function jaccardSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter(x => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

/** Check if tokens from `query` appear as substrings in `target` tokens */
function substringOverlap(queryTokens: string[], targetTokens: string[]): number {
  if (queryTokens.length === 0) return 0;
  const targetJoined = targetTokens.join(" ");
  let matches = 0;
  for (const qt of queryTokens) {
    if (targetJoined.includes(qt)) matches++;
  }
  return matches / queryTokens.length;
}

/** Station code matching bonus */
function stationBonus(dvxLocation: string, qaStation: string): number {
  const dvxLower = dvxLocation.toLowerCase().trim();
  const qaLower = qaStation.toLowerCase().trim();
  // Exact station match
  if (dvxLower === qaLower) return 0.3;
  // Station code prefix match (e.g., C80 matches C80)
  if (dvxLower.length >= 2 && qaLower.length >= 2) {
    if (dvxLower.replace(/[^a-z0-9]/g, "") === qaLower.replace(/[^a-z0-9]/g, "")) return 0.25;
  }
  // Same area prefix (C = chassis, T = trim, F = final)
  const dvxPrefix = dvxLower.charAt(0);
  const qaPrefix = qaLower.charAt(0);
  if (STATION_PATTERNS[dvxPrefix] && dvxPrefix === qaPrefix) return 0.1;
  return 0;
}

/** Keyword importance weighting - longer, more specific words score higher */
function keywordWeight(token: string): number {
  if (token.length <= 2) return 0.5;
  if (token.length <= 4) return 0.8;
  return 1.0;
}

/** Weighted token overlap */
function weightedTokenOverlap(queryTokens: string[], targetTokens: string[]): number {
  const targetSet = new Set(targetTokens);
  let totalWeight = 0;
  let matchedWeight = 0;
  for (const qt of queryTokens) {
    const w = keywordWeight(qt);
    totalWeight += w;
    if (targetSet.has(qt)) {
      matchedWeight += w;
    } else {
      // Partial match - check if any target token contains this or vice versa
      for (const tt of targetTokens) {
        if (tt.includes(qt) || qt.includes(tt)) {
          matchedWeight += w * 0.6;
          break;
        }
      }
    }
  }
  return totalWeight === 0 ? 0 : matchedWeight / totalWeight;
}

export interface MatchResult {
  qaIndex: number;
  score: number;
  concern: string;
  sNo: number;
}

/**
 * Find the best matching QA Matrix concern for a DVX defect description.
 * Enhanced with synonym expansion, bigram similarity, station matching,
 * and weighted keyword scoring.
 */
export function findBestMatch(
  dvxText: string,
  qaConcerns: { sNo: number; concern: string; operationStation: string; designation: string }[],
  threshold = 0.15,
  dvxLocation = ""
): MatchResult | null {
  const rawTokens = tokenize(dvxText);
  if (rawTokens.length === 0) return null;
  const queryTokens = expandSynonyms(rawTokens);

  let bestScore = 0;
  let bestIdx = -1;

  for (let i = 0; i < qaConcerns.length; i++) {
    const qa = qaConcerns[i];
    const targetText = `${qa.concern} ${qa.operationStation} ${qa.designation}`;
    const rawTargetTokens = tokenize(targetText);
    const targetTokens = expandSynonyms(rawTargetTokens);

    const jaccard = jaccardSimilarity(queryTokens, targetTokens);
    const substring = substringOverlap(rawTokens, rawTargetTokens);
    const dice = diceCoefficient(dvxText, targetText);
    const weighted = weightedTokenOverlap(rawTokens, rawTargetTokens);
    const station = stationBonus(dvxLocation, qa.operationStation);

    // Multi-signal weighted combination
    const score = (
      jaccard * 0.2 +
      substring * 0.25 +
      dice * 0.15 +
      weighted * 0.25 +
      station * 0.15
    );

    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  if (bestIdx === -1 || bestScore < threshold) return null;

  return {
    qaIndex: bestIdx,
    score: bestScore,
    concern: qaConcerns[bestIdx].concern,
    sNo: qaConcerns[bestIdx].sNo,
  };
}
