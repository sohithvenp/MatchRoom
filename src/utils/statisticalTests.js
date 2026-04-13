/**
 * Paired statistical tests for baseline vs MatchRoom (optimised) conditions.
 * Normality: Jarque–Bera omnibus on paired differences (browser-friendly).
 * For formal thesis reporting, Shapiro–Wilk can be run on exported CSV in SPSS/R.
 */
import jStat from 'jstat';

function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function sampleSd(arr) {
  const n = arr.length;
  if (n < 2) return 0;
  const m = mean(arr);
  const v = arr.reduce((s, x) => s + (x - m) ** 2, 0) / (n - 1);
  return Math.sqrt(v);
}

/** Jarque–Bera normality test; returns { statistic, pValue }. H0: normal. */
export function jarqueBeraTest(x) {
  const n = x.length;
  if (n < 4) return { statistic: null, pValue: null, note: 'n < 4' };
  const m = mean(x);
  const sd = sampleSd(x);
  if (sd === 0) return { statistic: null, pValue: null, note: 'zero variance' };
  let s = 0;
  let k = 0;
  for (const v of x) {
    const z = (v - m) / sd;
    s += z ** 3;
    k += z ** 4;
  }
  s /= n;
  k /= n;
  const jb = (n / 6) * (s * s + 0.25 * (k - 3) ** 2);
  const pValue = 1 - jStat.chisquare.cdf(jb, 2);
  return { statistic: jb, pValue, note: 'Jarque–Bera (χ² df=2)' };
}

/** Two-sided paired t-test on differences; Cohen's dz = mean(d)/sd(d). */
export function pairedTTest(diffs) {
  const n = diffs.length;
  if (n < 2) return null;
  const m = mean(diffs);
  const sd = sampleSd(diffs);
  if (sd === 0) return { test: 'paired t-test', t: 0, df: n - 1, pValue: 1, cohenDz: 0 };
  const se = sd / Math.sqrt(n);
  const t = m / se;
  const df = n - 1;
  const pValue = jStat.ttest(t, n, 2);
  const cohenDz = m / sd;
  return { test: 'paired t-test', t, df, pValue, cohenDz };
}

/** Wilcoxon signed-rank (normal approx), two-sided; excludes zero diffs. Effect size r = |Z|/sqrt(N_pairs). */
export function wilcoxonSignedRank(diffs) {
  const nonzero = diffs.map((d) => d).filter((d) => d !== 0);
  const n = nonzero.length;
  if (n === 0) return null;

  const items = nonzero.map((d) => ({ d, ad: Math.abs(d) }));
  items.sort((a, b) => a.ad - b.ad);

  let k = 1;
  for (let i = 0; i < items.length; ) {
    let j = i;
    while (j < items.length && items[j].ad === items[i].ad) j++;
    const avgRank = (k + (k + (j - i) - 1)) / 2;
    for (let t = i; t < j; t++) items[t].rank = avgRank;
    k += j - i;
    i = j;
  }

  let wPlus = 0;
  for (const it of items) {
    if (it.d > 0) wPlus += it.rank;
  }

  const N = n;
  const ew = (N * (N + 1)) / 4;
  const vw = (N * (N + 1) * (2 * N + 1)) / 24;
  if (vw <= 0) return null;
  const z = (wPlus - ew) / Math.sqrt(vw);
  const pValue = 2 * Math.min(jStat.normal.cdf(z, 0, 1), 1 - jStat.normal.cdf(z, 0, 1));
  const effectR = Math.abs(z) / Math.sqrt(diffs.length);

  return {
    test: 'Wilcoxon signed-rank',
    Wplus: wPlus,
    z,
    pValue: Math.min(1, pValue),
    effectR,
    nUsed: N,
  };
}

/** Choose paired t vs Wilcoxon using normality on differences (α = 0.05). */
export function choosePairedTest(diffs, normalityAlpha = 0.05) {
  const jb = jarqueBeraTest(diffs);
  const normalOk = jb.pValue != null && jb.pValue > normalityAlpha;
  if (normalOk) {
    return { normality: jb, useParametric: true, result: pairedTTest(diffs) };
  }
  return { normality: jb, useParametric: false, result: wilcoxonSignedRank(diffs) };
}

/**
 * Pair sessions by participantId (preferred) or userId.
 * Keeps the latest record per condition per participant.
 */
export function pairPairedSessions(results) {
  const byPid = {};
  for (const r of results) {
    // Never pair on userId alone when it is 'anonymous' — that merges all guests into one fake "participant".
    let pid = r.participantId;
    if (!pid && r.userId && r.userId !== 'anonymous') {
      pid = r.userId;
    }
    if (!pid) continue;
    if (!byPid[pid]) byPid[pid] = { baseline: null, optimized: null };
    const type = r.type === 'baseline' ? 'baseline' : r.type === 'optimized' ? 'optimized' : null;
    if (!type) continue;
    const cur = byPid[pid][type];
    const ts = r.timestamp ? new Date(r.timestamp).getTime() : 0;
    if (!cur || ts >= new Date(cur.timestamp).getTime()) {
      byPid[pid][type] = r;
    }
  }
  const pairs = [];
  for (const participantId of Object.keys(byPid)) {
    const b = byPid[participantId].baseline;
    const o = byPid[participantId].optimized;
    if (b && o) pairs.push({ participantId, baseline: b, optimized: o });
  }
  return pairs;
}

/** D = baseline − MatchRoom for each metric. Suitability only where both tasks recorded a rating. */
export function buildDifferenceVectors(pairs) {
  const time = [];
  const views = [];
  const confidence = [];
  const suitability = [];
  for (const { baseline: b, optimized: o } of pairs) {
    time.push((b.timeTaken ?? 0) - (o.timeTaken ?? 0));
    views.push((b.viewCount ?? 0) - (o.viewCount ?? 0));
    confidence.push((b.confidence ?? 0) - (o.confidence ?? 0));
    if (b.suitability != null && o.suitability != null) {
      suitability.push(b.suitability - o.suitability);
    }
  }
  return { time, views, confidence, suitability, n: pairs.length };
}

const METRIC_LABELS = {
  time: 'Decision time (s), D = baseline − MatchRoom',
  views: 'Listings viewed, D = baseline − MatchRoom',
  confidence: 'Confidence (1–5), D = baseline − MatchRoom',
  suitability: 'Suitability (1–5), D = baseline − MatchRoom',
};

export function runFullPairedAnalysis(results) {
  const pairs = pairPairedSessions(results);
  if (pairs.length < 2) {
    return {
      pairedN: pairs.length,
      pairs,
      variables: [],
      note: 'Need at least 2 complete participant pairs (baseline + optimised each).',
    };
  }

  const diff = buildDifferenceVectors(pairs);
  const keys = ['time', 'views', 'confidence', 'suitability'];
  const variables = keys.map((key) => {
    const d = diff[key];
    if (key === 'suitability' && d.length < 2) {
      return {
        key,
        label: METRIC_LABELS[key],
        nPairs: pairs.length,
        nUsed: d.length,
        meanDifference: null,
        sdDifference: null,
        normalityTest: '—',
        normalityP: null,
        testUsed: '—',
        useParametric: null,
        statistic: '—',
        pValue: null,
        effectSize: '—',
        note: 'Need suitability ratings on both tasks for at least 2 participants.',
      };
    }
    const { normality, useParametric, result } = choosePairedTest(d);
    return {
      key,
      label: METRIC_LABELS[key],
      nPairs: pairs.length,
      nUsed: d.length,
      meanDifference: mean(d),
      sdDifference: sampleSd(d),
      normalityTest: normality.note,
      normalityP: normality.pValue,
      normalityStatistic: normality.statistic,
      testUsed: result?.test ?? '—',
      useParametric,
      statistic: result?.test?.includes('t-test')
        ? `t = ${result.t?.toFixed(4)}, df = ${result.df}`
        : result?.test?.includes('Wilcoxon')
          ? `W+ = ${result.Wplus?.toFixed(2)}, z = ${result.z?.toFixed(4)}`
          : '—',
      pValue: result?.pValue,
      effectSize: result?.cohenDz != null
        ? `Cohen's dz = ${result.cohenDz.toFixed(3)}`
        : result?.effectR != null
          ? `r = ${result.effectR.toFixed(3)}`
          : '—',
      raw: result,
    };
  });

  return {
    pairedN: pairs.length,
    pairs,
    variables,
    generatedAt: new Date().toISOString(),
    normalityDisclaimer:
      'Normality assessed with Jarque–Bera on paired differences. For Shapiro–Wilk, run tests on exported CSV in SPSS/R.',
  };
}
