import { useEffect, useState, useMemo, useCallback } from 'react';
import { BarChart3, Trash2, ArrowLeft, Download, RefreshCw, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, getDocs, query, orderBy, deleteDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { exportToCSV } from '../services/exportService';
import { runFullPairedAnalysis } from '../utils/statisticalTests';

function mergeResults(localData, fireData) {
  const byKey = new Map();
  for (const r of fireData) {
    const k = `${r.participantId || r.userId || 'x'}_${r.type}_${r.timestamp || r.id || ''}`;
    byKey.set(k, { ...r, source: 'firebase' });
  }
  for (const r of localData) {
    const k = `${r.participantId || r.userId || 'x'}_${r.type}_${r.timestamp || ''}`;
    if (!byKey.has(k)) byKey.set(k, { ...r, source: 'local' });
  }
  return Array.from(byKey.values());
}

export default function ResearcherDashboard() {
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingAnalysis, setSavingAnalysis] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const localData = JSON.parse(localStorage.getItem('experiment_results') || '[]');
      let fireData = [];
      if (auth.currentUser) {
        try {
          const q = query(collection(db, 'research_results'), orderBy('serverTimestamp', 'desc'));
          const snap = await getDocs(q);
          fireData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        } catch (e) {
          console.warn('Ordered query failed; fetching research_results without order', e);
          try {
            const snap = await getDocs(collection(db, 'research_results'));
            fireData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          } catch (e2) {
            console.warn('Firestore research_results fetch failed, using local only', e2);
          }
        }
      }
      setResults(mergeResults(localData, fireData));
    } catch (e) {
      console.error('Error fetching research results:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const analysis = useMemo(() => runFullPairedAnalysis(results), [results]);

  const getStats = (type) => {
    const filtered = results.filter((r) => r.type === type);
    if (filtered.length === 0) return { avgTime: 0, avgViews: 0, avgConfidence: 0, avgSuitability: 0, count: 0 };
    const sumSuit = filtered.filter((r) => r.suitability != null).reduce((a, r) => a + r.suitability, 0);
    const nSuit = filtered.filter((r) => r.suitability != null).length;
    return {
      avgTime: (filtered.reduce((acc, r) => acc + r.timeTaken, 0) / filtered.length).toFixed(1),
      avgViews: (filtered.reduce((acc, r) => acc + r.viewCount, 0) / filtered.length).toFixed(1),
      avgConfidence: (filtered.reduce((acc, r) => acc + r.confidence, 0) / filtered.length).toFixed(1),
      avgSuitability: nSuit ? (sumSuit / nSuit).toFixed(1) : '—',
      count: filtered.length,
    };
  };

  const baselineStats = getStats('baseline');
  const optimizedStats = getStats('optimized');

  const clearData = async () => {
    if (!window.confirm('Clear all experiment task results? This cannot be undone.')) return;
    localStorage.removeItem('experiment_results');
    if (auth.currentUser) {
      try {
        const snap = await getDocs(collection(db, 'research_results'));
        await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, 'research_results', d.id))));
        const snapA = await getDocs(collection(db, 'research_analysis'));
        await Promise.all(snapA.docs.map((d) => deleteDoc(doc(db, 'research_analysis', d.id))));
      } catch (e) {
        console.error('Error clearing Firebase:', e);
      }
    }
    setResults([]);
  };

  const handleExport = () => {
    exportToCSV(
      results.map((r) => ({
        participantId: r.participantId,
        userId: r.userId,
        type: r.type,
        timeTaken: r.timeTaken,
        viewCount: r.viewCount,
        shortlistCount: r.shortlistCount,
        confidence: r.confidence,
        suitability: r.suitability ?? '',
        timestamp: r.timestamp,
      })),
      `MatchRoom_Raw_${new Date().toISOString().split('T')[0]}.csv`
    );
  };

  const handleExportAnalysis = () => {
    if (!analysis.variables.length) return;
    exportToCSV(
      analysis.variables.map((v) => ({
        outcome: v.key,
        label: v.label,
        nPairs: v.nPairs,
        nUsed: v.nUsed,
        meanDifference_D_baseline_minus_matchroom: v.meanDifference,
        sdDifference: v.sdDifference,
        normalityTest: v.normalityTest,
        normalityP: v.normalityP,
        testUsed: v.testUsed,
        statistic: v.statistic,
        pValue: v.pValue,
        effectSize: v.effectSize,
        note: v.note || '',
      })),
      `MatchRoom_Statistical_Analysis_${new Date().toISOString().split('T')[0]}.csv`
    );
  };

  const handleSaveAnalysis = async () => {
    if (!auth.currentUser) {
      window.alert('Sign in to save an analysis snapshot to Firebase.');
      return;
    }
    if (analysis.pairedN < 2) {
      window.alert('Need at least two complete participant pairs before saving analysis.');
      return;
    }
    setSavingAnalysis(true);
    try {
      await addDoc(collection(db, 'research_analysis'), {
        userId: auth.currentUser.uid,
        pairedN: analysis.pairedN,
        generatedAt: analysis.generatedAt,
        variables: analysis.variables.map((v) => ({
          key: v.key,
          label: v.label,
          nPairs: v.nPairs,
          nUsed: v.nUsed,
          meanDifference: v.meanDifference,
          sdDifference: v.sdDifference,
          normalityTest: v.normalityTest,
          normalityP: v.normalityP,
          testUsed: v.testUsed,
          statistic: v.statistic,
          pValue: v.pValue,
          effectSize: v.effectSize,
          note: v.note || null,
        })),
        serverTimestamp: serverTimestamp(),
      });
      window.alert('Analysis snapshot saved to research_analysis.');
    } catch (e) {
      console.error(e);
      window.alert('Could not save analysis: ' + (e.message || 'error'));
    } finally {
      setSavingAnalysis(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 animate-fade-in">
      <div className="flex flex-col lg:flex-row justify-between items-start gap-6 mb-12">
        <div>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-mainText/40 hover:text-primary transition-colors mb-4 font-bold text-xs uppercase tracking-widest"
          >
            <ArrowLeft size={16} /> Back to App
          </button>
          <h1 className="text-4xl font-display font-bold text-mainText">Researcher analytics</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={handleExport} className="btn btn-primary bg-primary/10 text-primary hover:bg-primary hover:text-white border-0">
            <Download size={18} className="mr-2" /> Export raw CSV
          </button>
          <button type="button" onClick={handleExportAnalysis} className="btn btn-secondary">
            <Download size={18} className="mr-2" /> Export analysis CSV
          </button>
          <button type="button" onClick={handleSaveAnalysis} disabled={savingAnalysis} className="btn btn-secondary">
            <Save size={18} className="mr-2" /> {savingAnalysis ? 'Saving…' : 'Save analysis to Firebase'}
          </button>
          <button type="button" onClick={fetchData} className="btn btn-secondary">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button type="button" onClick={clearData} className="btn btn-secondary text-red-500 border-red-100 hover:bg-red-50">
            <Trash2 size={18} className="mr-2" /> Clear all data
          </button>
        </div>
      </div>

      <div className="glass-panel overflow-hidden mb-12">
        <div className="p-8 border-b border-gray-100">
          <h2 className="text-xl font-bold flex items-center gap-3">
            <BarChart3 className="text-primary" /> Descriptive summary
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-4 font-bold text-mainText/30 uppercase text-xs tracking-widest">Condition</th>
                <th className="p-4 font-bold text-mainText/30 uppercase text-xs tracking-widest">Avg. time (s)</th>
                <th className="p-4 font-bold text-mainText/30 uppercase text-xs tracking-widest">Avg. views</th>
                <th className="p-4 font-bold text-mainText/30 uppercase text-xs tracking-widest">Avg. confidence</th>
                <th className="p-4 font-bold text-mainText/30 uppercase text-xs tracking-widest">Avg. suitability</th>
                <th className="p-4 font-bold text-mainText/30 uppercase text-xs tracking-widest">N sessions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <tr>
                <td className="p-4 font-bold text-mainText/60">Baseline</td>
                <td className="p-4 font-display font-bold">{baselineStats.avgTime}</td>
                <td className="p-4 font-display font-bold">{baselineStats.avgViews}</td>
                <td className="p-4 font-display font-bold">{baselineStats.avgConfidence}</td>
                <td className="p-4 font-display font-bold">{baselineStats.avgSuitability}</td>
                <td className="p-4 text-mainText/40">{baselineStats.count}</td>
              </tr>
              <tr>
                <td className="p-4 font-bold text-primary">MatchRoom</td>
                <td className="p-4 font-display font-bold text-primary">{optimizedStats.avgTime}</td>
                <td className="p-4 font-display font-bold text-primary">{optimizedStats.avgViews}</td>
                <td className="p-4 font-display font-bold text-primary">{optimizedStats.avgConfidence}</td>
                <td className="p-4 font-display font-bold text-primary">{optimizedStats.avgSuitability}</td>
                <td className="p-4 text-mainText/40">{optimizedStats.count}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-panel overflow-hidden mb-12">
        <div className="p-8 border-b border-gray-100">
          <h2 className="text-xl font-bold flex items-center gap-3">
            <BarChart3 className="text-secondary" /> Paired tests
          </h2>
          <p className="text-sm text-mainText/40 mt-2">
            Pairs: <strong>{analysis.pairedN}</strong>
            {analysis.note ? <span className="block mt-1 text-amber-800/90">{analysis.note}</span> : null}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-3 font-bold text-mainText/30 uppercase tracking-widest">Outcome</th>
                <th className="p-3 font-bold text-mainText/30 uppercase tracking-widest">Mean D</th>
                <th className="p-3 font-bold text-mainText/30 uppercase tracking-widest">SD D</th>
                <th className="p-3 font-bold text-mainText/30 uppercase tracking-widest">Norm. p</th>
                <th className="p-3 font-bold text-mainText/30 uppercase tracking-widest">Test</th>
                <th className="p-3 font-bold text-mainText/30 uppercase tracking-widest">Statistic</th>
                <th className="p-3 font-bold text-mainText/30 uppercase tracking-widest">p-value</th>
                <th className="p-3 font-bold text-mainText/30 uppercase tracking-widest">Effect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {analysis.variables.map((v) => (
                <tr key={v.key}>
                  <td className="p-3 font-medium text-mainText/80">{v.key}</td>
                  <td className="p-3">{v.meanDifference != null ? v.meanDifference.toFixed(3) : '—'}</td>
                  <td className="p-3">{v.sdDifference != null ? v.sdDifference.toFixed(3) : '—'}</td>
                  <td className="p-3">
                    {v.normalityP != null
                      ? v.normalityP.toFixed(4)
                      : v.normalityTest && v.normalityTest !== '—'
                        ? (
                            <span className="text-mainText/45 text-[11px]" title="No normality p-value; see note above">
                              {v.normalityTest}
                            </span>
                          )
                        : '—'}
                  </td>
                  <td className="p-3">{v.testUsed}</td>
                  <td className="p-3 font-mono text-[11px]">{v.statistic}</td>
                  <td className="p-3 font-bold">{v.pValue != null ? v.pValue.toFixed(4) : '—'}</td>
                  <td className="p-3">{v.effectSize}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {analysis.variables.some((v) => v.note) && (
          <div className="p-4 text-xs text-amber-800 bg-amber-50/50 border-t border-amber-100">
            {analysis.variables
              .filter((v) => v.note)
              .map((v) => (
                <p key={v.key}>
                  <strong>{v.key}:</strong> {v.note}
                </p>
              ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-bold text-mainText/30 uppercase tracking-[0.2em] ml-2">Session log (raw)</h3>
        <div className="space-y-2">
          {results.length === 0 ? (
            <div className="p-12 text-center glass-panel opacity-40">No trials recorded yet.</div>
          ) : (
            results
              .slice()
              .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
              .map((r, i) => (
                <div key={r.id || i} className="glass-panel px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-lg font-bold text-[10px] uppercase tracking-widest ${
                        r.type === 'baseline' ? 'bg-gray-100 text-mainText/40' : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {r.type}
                    </span>
                    <span className="text-[10px] text-mainText/40 font-mono">{r.participantId || r.userId}</span>
                    <span className="font-medium text-mainText/60">{new Date(r.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <span className="text-mainText/40">
                      Time: <strong>{Number(r.timeTaken).toFixed(1)}s</strong>
                    </span>
                    <span className="text-mainText/40">
                      Views: <strong>{r.viewCount}</strong>
                    </span>
                    <span className="text-mainText/40">
                      Confidence: <strong>{r.confidence}/5</strong>
                    </span>
                    <span className="text-mainText/40">
                      Suitability: <strong>{r.suitability != null ? `${r.suitability}/5` : '—'}</strong>
                    </span>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}
