import { useState, useEffect, useMemo, useCallback } from 'react';
import { CHECKLIST, STATUS_CYCLE, STATUS_CONFIG } from './utils/checklist-data';
import { analyzePageHTML, validateSlugs, verifyPricing } from './utils/audit-engine';

// ─── Organixx Brand Colors ────────────────────────────
const OX = {
  forest: '#2c5530', forestLight: '#3a7040', forestPale: '#e8f0e9',
  terra: '#c4733b', terraLight: '#d4915d', terraPale: '#faf0e6',
  cream: '#faf6f0', warmWhite: '#fefcf8', stone: '#e8e2d8',
  charcoal: '#2d2a26', warmGray: '#6b6560', lightGray: '#a8a29e',
  red: '#c73e1d', redPale: '#fce8e4',
  green: '#2d8a4e', greenPale: '#e8f5ed',
};

// ─── Styles ───────────────────────────────────────────
const font = "'Plus Jakarta Sans', system-ui, sans-serif";
const card = { background: '#fff', borderRadius: 12, border: `1px solid ${OX.stone}`, overflow: 'hidden' };
const input = { border: `1px solid ${OX.stone}`, borderRadius: 8, padding: '10px 14px', fontSize: 14, fontFamily: font, background: OX.cream, width: '100%', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.15s' };
const btnPrimary = { padding: '12px 24px', borderRadius: 10, border: 'none', background: OX.forest, color: '#fff', fontSize: 14, fontWeight: 600, fontFamily: font, cursor: 'pointer', transition: 'all 0.15s' };
const btnSecondary = { ...btnPrimary, background: 'transparent', border: `1px solid ${OX.stone}`, color: OX.charcoal };
const label = { fontSize: 11, fontWeight: 700, color: OX.warmGray, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'block' };

// ─── Storage helpers ──────────────────────────────────
const STORAGE_KEY = 'ox-funnel-audit';
function loadState() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; } }
function saveState(s) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {} }
function loadHistory() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY + '-history')) || []; } catch { return []; } }
function saveHistory(h) { try { localStorage.setItem(STORAGE_KEY + '-history', JSON.stringify(h)); } catch {} }

// ─── Status Badge ─────────────────────────────────────
function StatusBtn({ status, onClick }) {
  const s = STATUS_CONFIG[status] || STATUS_CONFIG.unchecked;
  return (
    <button onClick={onClick} style={{ width: 36, height: 28, border: `1.5px solid ${s.border}`, borderRadius: 6, background: s.bg, color: s.color, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font, transition: 'all 0.12s', flexShrink: 0 }}>
      {s.label}
    </button>
  );
}

// ─── Tab Button ───────────────────────────────────────
function TabBtn({ active, icon, label: lbl, onClick, badge }) {
  return (
    <button onClick={onClick} style={{
      flex: '1 0 auto', padding: '10px 14px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font, whiteSpace: 'nowrap', position: 'relative',
      background: active ? '#fff' : 'transparent', color: active ? OX.charcoal : OX.warmGray,
      boxShadow: active ? '0 1px 4px rgba(0,0,0,0.06)' : 'none', transition: 'all 0.15s',
    }}>
      <span style={{ fontSize: 14, marginRight: 5 }}>{icon}</span>{lbl}
      {badge > 0 && <span style={{ position: 'absolute', top: 4, right: 6, width: 18, height: 18, borderRadius: 99, background: OX.red, color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{badge}</span>}
    </button>
  );
}

// ─── Pricing Verifier ─────────────────────────────────
function PricingVerifier({ rows, setRows }) {
  const upd = (i, f, v) => setRows(p => p.map((r, idx) => idx === i ? { ...r, [f]: v } : r));
  const verified = verifyPricing(rows);

  return (
    <div>
      <p style={{ fontSize: 13, color: OX.warmGray, margin: '0 0 14px', lineHeight: 1.5 }}>
        Enter the base price and discount % from your spec, then enter the actual price showing on the CC page. Mismatches flag instantly.
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: font }}>
          <thead>
            <tr>{['Product / tier', 'Base ($)', 'Disc (%)', 'Expected', 'Actual on page', ''].map(h =>
              <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: OX.warmGray, fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `2px solid ${OX.stone}` }}>{h}</th>
            )}</tr>
          </thead>
          <tbody>{verified.map((r, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${OX.stone}`, background: r.match === false ? OX.redPale : 'transparent' }}>
              <td style={{ padding: '6px 10px' }}><input value={r.label || ''} onChange={e => upd(i, 'label', e.target.value)} placeholder="e.g. 3-qty Bundle" style={{ ...input, padding: '6px 10px', width: '100%' }} /></td>
              <td style={{ padding: '6px 10px' }}><input type="number" value={r.basePrice || ''} onChange={e => upd(i, 'basePrice', e.target.value)} placeholder="84.90" style={{ ...input, padding: '6px 10px', width: 85 }} /></td>
              <td style={{ padding: '6px 10px' }}><input type="number" value={r.discount || ''} onChange={e => upd(i, 'discount', e.target.value)} placeholder="50" style={{ ...input, padding: '6px 10px', width: 65 }} /></td>
              <td style={{ padding: '6px 10px', fontWeight: 600, fontFamily: 'monospace', color: OX.forest }}>{r.expected ? `$${r.expected.toFixed(2)}` : '—'}</td>
              <td style={{ padding: '6px 10px' }}><input type="number" value={r.actualPrice || ''} onChange={e => upd(i, 'actualPrice', e.target.value)} placeholder="42.45" style={{ ...input, padding: '6px 10px', width: 85 }} /></td>
              <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700, fontSize: 16 }}>
                {r.match === null ? <span style={{ color: OX.lightGray }}>—</span> : r.match ? <span style={{ color: OX.green }}>✓</span> : <span style={{ color: OX.red }}>✗</span>}
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <button onClick={() => setRows(p => [...p, { label: '', basePrice: '', discount: '', actualPrice: '' }])} style={{ marginTop: 8, padding: '6px 16px', border: `1px dashed ${OX.stone}`, borderRadius: 6, background: 'transparent', color: OX.warmGray, fontSize: 12, cursor: 'pointer', fontFamily: font }}>
        + Add row
      </button>
    </div>
  );
}

// ─── Slug Validator ───────────────────────────────────
function SlugValidator({ slugText, setSlugText }) {
  const result = useMemo(() => validateSlugs(slugText), [slugText]);

  return (
    <div>
      <p style={{ fontSize: 13, color: OX.warmGray, margin: '0 0 10px', lineHeight: 1.5 }}>
        Paste all page slugs from your funnel (one per line). Catches duplicates and naming issues before you hit publish.
      </p>
      <textarea value={slugText} onChange={e => setSlugText(e.target.value)}
        placeholder={"checkout-collagens-136-pm\ncheckout-collagens-136-pm-up1-csc-bogo\ncheckout-collagens-136-pm-xs1-res1\n..."}
        style={{ ...input, minHeight: 100, fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }} />
      {result.total > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', gap: 16, marginBottom: 8, fontSize: 13 }}>
            <span style={{ color: OX.forest, fontWeight: 600 }}>{result.total} slugs</span>
            {result.duplicates > 0 ? <span style={{ color: OX.red, fontWeight: 700 }}>⚠ {result.duplicates} duplicates</span> : <span style={{ color: OX.green, fontWeight: 600 }}>✓ No duplicates</span>}
            {result.errors > result.duplicates && <span style={{ color: OX.terra, fontWeight: 600 }}>{result.errors - result.duplicates} other issues</span>}
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto', border: `1px solid ${OX.stone}`, borderRadius: 8 }}>
            {result.results.map((p, i) => (
              <div key={i} style={{ padding: '5px 12px', fontSize: 12, fontFamily: 'monospace', borderBottom: `1px solid ${OX.cream}`, background: p.issues.length ? OX.redPale : '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: p.issues.length ? OX.red : OX.charcoal }}>{p.slug}</span>
                {p.issues.length > 0 && <span style={{ fontSize: 10, color: OX.red, fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>{p.issues.join(', ')}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page Analyzer ────────────────────────────────────
function PageAnalyzer({ pageHTML, setPageHTML, pageSpecs, setPageSpecs, findings, setFindings }) {
  const analyze = () => {
    const result = analyzePageHTML(pageHTML, pageSpecs);
    setFindings(result.findings);
  };

  return (
    <div>
      <p style={{ fontSize: 13, color: OX.warmGray, margin: '0 0 14px', lineHeight: 1.5 }}>
        Right-click any CC funnel page → "View Page Source" → copy → paste below. The engine extracts pricing, copy, disclaimers, and JS config automatically.
      </p>
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 120 }}>
          <label style={label}>Base price ($)</label>
          <input type="number" value={pageSpecs.basePrice || ''} onChange={e => setPageSpecs(p => ({ ...p, basePrice: e.target.value }))} placeholder="69.95" style={input} />
        </div>
        <div style={{ flex: 1, minWidth: 120 }}>
          <label style={label}>Expected discount (%)</label>
          <input type="number" value={pageSpecs.discountPercent || ''} onChange={e => setPageSpecs(p => ({ ...p, discountPercent: e.target.value }))} placeholder="50" style={input} />
        </div>
      </div>
      <label style={label}>Page source HTML</label>
      <textarea value={pageHTML} onChange={e => setPageHTML(e.target.value)}
        placeholder="Paste the full page source here..."
        style={{ ...input, minHeight: 140, fontFamily: 'monospace', fontSize: 11, resize: 'vertical' }} />
      <button onClick={analyze} disabled={!pageHTML.trim()} style={{ ...btnPrimary, marginTop: 12, width: '100%', opacity: pageHTML.trim() ? 1 : 0.5 }}>
        🔍 Analyze page
      </button>
      {findings.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: OX.charcoal }}>
            {findings.filter(f => f.type === 'critical').length} critical · {findings.filter(f => f.type === 'warning').length} warnings
          </div>
          {findings.map((f, i) => (
            <div key={i} style={{ padding: '8px 12px', marginBottom: 4, borderRadius: 6, fontSize: 13, lineHeight: 1.4, background: f.type === 'critical' ? OX.redPale : OX.terraPale, color: f.type === 'critical' ? OX.red : OX.terra, border: `1px solid ${f.type === 'critical' ? '#f0c0b0' : '#e8d4c0'}` }}>
              <strong>{f.category}:</strong> {f.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────
export default function App() {
  const [view, setView] = useState('checklist');
  const [funnelName, setFunnelName] = useState('');

  // Checklist state
  const [statuses, setStatuses] = useState({});
  const [notes, setNotes] = useState({});
  const [showNotes, setShowNotes] = useState({});
  const [expanded, setExpanded] = useState(CHECKLIST.map(c => c.id));
  const [showReport, setShowReport] = useState(false);

  // Pricing state
  const [pricingRows, setPricingRows] = useState([
    { label: '1-qty', basePrice: '', discount: '', actualPrice: '' },
    { label: '3-qty', basePrice: '', discount: '', actualPrice: '' },
    { label: '6-qty', basePrice: '', discount: '', actualPrice: '' },
  ]);

  // Slug state
  const [slugText, setSlugText] = useState('');

  // Page analyzer state
  const [pageHTML, setPageHTML] = useState('');
  const [pageSpecs, setPageSpecs] = useState({});
  const [findings, setFindings] = useState([]);

  // History
  const [history, setHistory] = useState([]);

  // Load saved state
  useEffect(() => {
    const saved = loadState();
    if (saved.funnelName) setFunnelName(saved.funnelName);
    if (saved.statuses) setStatuses(saved.statuses);
    if (saved.notes) setNotes(saved.notes);
    if (saved.pricingRows) setPricingRows(saved.pricingRows);
    if (saved.slugText) setSlugText(saved.slugText);
    setHistory(loadHistory());
  }, []);

  // Autosave
  useEffect(() => {
    const t = setTimeout(() => saveState({ funnelName, statuses, notes, pricingRows, slugText }), 500);
    return () => clearTimeout(t);
  }, [funnelName, statuses, notes, pricingRows, slugText]);

  const cycleStatus = id => {
    const cur = statuses[id] || 'unchecked';
    setStatuses(p => ({ ...p, [id]: STATUS_CYCLE[(STATUS_CYCLE.indexOf(cur) + 1) % 4] }));
  };

  const allItems = CHECKLIST.flatMap(c => c.items);
  const total = allItems.length;
  const passCount = allItems.filter(i => statuses[i.id] === 'pass').length;
  const failCount = allItems.filter(i => statuses[i.id] === 'fail').length;
  const naCount = allItems.filter(i => statuses[i.id] === 'na').length;
  const remaining = total - passCount - failCount - naCount;
  const completion = Math.round(((passCount + failCount + naCount) / total) * 100);

  const pricingMismatches = verifyPricing(pricingRows).filter(r => r.match === false).length;
  const slugResult = useMemo(() => validateSlugs(slugText), [slugText]);

  const saveToHistory = () => {
    const entry = { id: Date.now(), name: funnelName || 'Unnamed', date: new Date().toISOString(), passCount, failCount, total, result: failCount === 0 && remaining === 0 ? 'PASS' : failCount > 0 ? 'ISSUES' : 'INCOMPLETE' };
    const updated = [entry, ...history].slice(0, 30);
    setHistory(updated);
    saveHistory(updated);
  };

  const resetAll = () => {
    if (confirm('Reset all statuses, notes, and form data? This cannot be undone.')) {
      setStatuses({}); setNotes({}); setShowNotes({});
      setPricingRows([{ label: '1-qty', basePrice: '', discount: '', actualPrice: '' }, { label: '3-qty', basePrice: '', discount: '', actualPrice: '' }, { label: '6-qty', basePrice: '', discount: '', actualPrice: '' }]);
      setSlugText(''); setPageHTML(''); setFindings([]);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const generateReport = () => {
    const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    let r = `## Funnel Audit Report\n**Funnel:** ${funnelName || 'Unnamed'}\n**Date:** ${date}\n`;
    r += `**Result:** ${failCount === 0 && remaining === 0 ? '✅ PASS' : failCount > 0 ? '❌ ISSUES FOUND' : '⏳ INCOMPLETE'}\n`;
    r += `**Summary:** ${passCount} passed · ${failCount} failed · ${naCount} N/A · ${remaining} unchecked\n\n`;

    if (failCount > 0) {
      r += `### ❌ Failed items\n`;
      CHECKLIST.forEach(cat => {
        const fails = cat.items.filter(i => statuses[i.id] === 'fail');
        if (fails.length) {
          r += `\n**${cat.icon} ${cat.category}**\n`;
          fails.forEach(i => { r += `- ${i.task}${notes[i.id] ? ` — _${notes[i.id]}_` : ''}\n`; });
        }
      });
    }

    const verified = verifyPricing(pricingRows);
    if (verified.some(p => p.match === false)) {
      r += `\n### 💲 Pricing mismatches\n`;
      verified.filter(p => p.match === false).forEach(p => {
        r += `- **${p.label}:** Expected $${p.expected?.toFixed(2)}, actual $${p.actualPrice}\n`;
      });
    }

    if (slugResult.duplicates > 0) {
      r += `\n### 🔗 Slug duplicates\n`;
      slugResult.results.filter(s => s.issues.includes('DUPLICATE')).forEach(s => { r += `- \`${s.slug}\`\n`; });
    }

    if (findings.length > 0) {
      r += `\n### 🔍 Page analysis\n`;
      findings.forEach(f => { r += `- ${f.type === 'critical' ? '❌' : '⚠️'} **${f.category}:** ${f.message}\n`; });
    }

    if (remaining > 0) {
      r += `\n### ⏳ Unchecked\n`;
      CHECKLIST.forEach(cat => {
        const uc = cat.items.filter(i => !statuses[i.id] || statuses[i.id] === 'unchecked');
        if (uc.length) r += `**${cat.category}:** ${uc.map(i => i.task).join('; ')}\n`;
      });
    }
    return r;
  };

  const [apiLoading, setApiLoading] = useState(false);
  const [apiData, setApiData] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [auditCampaignId, setAuditCampaignId] = useState('');

  const runAutoAudit = async () => {
    setApiLoading(true);
    setApiError(null);
    setApiData(null);
    try {
      const params = new URLSearchParams({ action: 'full-audit' });
      if (auditCampaignId) params.append('campaignId', auditCampaignId);
      const resp = await fetch(`/api/audit?${params}`);
      if (!resp.ok) throw new Error(`API returned ${resp.status}`);
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      setApiData(data);

      // Auto-populate slug validator if funnels data exists
      if (data.funnels?.message) {
        const funnelData = Array.isArray(data.funnels.message) ? data.funnels.message : [data.funnels.message];
        const allSlugs = [];
        funnelData.forEach(f => {
          if (f.pages) {
            (Array.isArray(f.pages) ? f.pages : [f.pages]).forEach(p => {
              if (p.slug || p.pageSlug || p.url) allSlugs.push(p.slug || p.pageSlug || p.url);
            });
          }
          if (f.slug) allSlugs.push(f.slug);
        });
        if (allSlugs.length > 0) setSlugText(allSlugs.join('\n'));
      }

      // Auto-populate pricing rows if products data exists
      if (data.products?.message) {
        const products = Array.isArray(data.products.message) ? data.products.message : [data.products.message];
        const newRows = products.slice(0, 10).map(p => ({
          label: p.productName || p.name || `Product ${p.productId || p.id}`,
          basePrice: p.price || p.productPrice || '',
          discount: '',
          actualPrice: '',
        }));
        if (newRows.length > 0) setPricingRows(newRows);
      }
    } catch (err) {
      setApiError(err.message);
    } finally {
      setApiLoading(false);
    }
  };

  const tabs = [
    { id: 'auto-audit', label: 'Auto-audit', icon: '🚀', badge: 0 },
    { id: 'checklist', label: 'Checklist', icon: '☑️', badge: failCount },
    { id: 'pricing', label: 'Pricing', icon: '💲', badge: pricingMismatches },
    { id: 'slugs', label: 'Slugs', icon: '🔗', badge: slugResult.duplicates },
    { id: 'analyzer', label: 'Page analyzer', icon: '🔍', badge: findings.filter(f => f.type === 'critical').length },
    { id: 'history', label: 'History', icon: '📋', badge: 0 },
  ];

  return (
    <div style={{ fontFamily: font, maxWidth: 860, margin: '0 auto', padding: '20px 16px 60px', color: OX.charcoal, background: OX.warmWhite, minHeight: '100vh' }}>

      {/* ── Header ────────────────────────────────── */}
      <div style={{ background: `linear-gradient(135deg, ${OX.forest} 0%, ${OX.forestLight} 100%)`, borderRadius: 16, padding: '24px 28px 20px', marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', bottom: -20, left: '30%', width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14, position: 'relative' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, backdropFilter: 'blur(4px)' }}>⚡</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>Funnel audit tool</h1>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>Organixx · Checkout Champ · Pre-launch QA</p>
          </div>
        </div>
        <input value={funnelName} onChange={e => setFunnelName(e.target.value)} placeholder="Funnel name (e.g., CSC 136 PM — Clean Sourced Collagens)"
          style={{ width: '100%', padding: '11px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 14, fontFamily: font, boxSizing: 'border-box', outline: 'none', backdropFilter: 'blur(4px)', '::placeholder': { color: 'rgba(255,255,255,0.4)' } }} />
      </div>

      {/* ── Progress Bar ──────────────────────────── */}
      <div style={{ ...card, padding: '14px 20px', marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Audit progress</span>
          <span style={{ fontSize: 26, fontWeight: 800, color: completion === 100 && failCount === 0 ? OX.green : completion === 100 ? OX.red : OX.forest }}>{completion}%</span>
        </div>
        <div style={{ height: 8, background: OX.cream, borderRadius: 99, overflow: 'hidden', display: 'flex' }}>
          <div style={{ width: `${(passCount / total) * 100}%`, background: OX.green, transition: 'width 0.3s' }} />
          <div style={{ width: `${(failCount / total) * 100}%`, background: OX.red, transition: 'width 0.3s' }} />
          <div style={{ width: `${(naCount / total) * 100}%`, background: OX.lightGray, transition: 'width 0.3s' }} />
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12, color: OX.warmGray }}>
          <span><b style={{ color: OX.green }}>●</b> {passCount} pass</span>
          <span><b style={{ color: OX.red }}>●</b> {failCount} fail</span>
          <span><b style={{ color: OX.lightGray }}>●</b> {naCount} N/A</span>
          <span style={{ marginLeft: 'auto' }}>{remaining} remaining</span>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 3, marginBottom: 14, background: OX.cream, borderRadius: 12, padding: 4, overflowX: 'auto' }}>
        {tabs.map(t => <TabBtn key={t.id} active={view === t.id} icon={t.icon} label={t.label} badge={t.badge} onClick={() => setView(t.id)} />)}
      </div>

      {/* ── Auto-audit Tab ────────────────────────── */}
      {view === 'auto-audit' && (
        <div>
          <div style={{ ...card, padding: 20, marginBottom: 12 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700 }}>🚀 Auto-audit via CC API</h3>
            <p style={{ fontSize: 13, color: OX.warmGray, margin: '0 0 16px', lineHeight: 1.5 }}>
              Enter a campaign ID to pull all products, pricing, and funnel data from Checkout Champ automatically. The audit engine will analyze everything and populate the other tabs with findings.
            </p>

            <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={label}>Campaign ID (optional — leave blank for all)</label>
                <input value={auditCampaignId} onChange={e => setAuditCampaignId(e.target.value)} placeholder="e.g., 136" style={input} />
              </div>
            </div>

            <button onClick={runAutoAudit} disabled={apiLoading}
              style={{ ...btnPrimary, width: '100%', opacity: apiLoading ? 0.6 : 1, background: `linear-gradient(135deg, ${OX.forest}, ${OX.forestLight})`, fontSize: 15, padding: '14px 24px' }}>
              {apiLoading ? '⏳ Pulling data from Checkout Champ...' : '🚀 Run auto-audit'}
            </button>

            {apiError && (
              <div style={{ marginTop: 12, padding: '12px 16px', borderRadius: 8, background: OX.redPale, color: OX.red, fontSize: 13, border: '1px solid #f0c0b0' }}>
                <strong>Error:</strong> {apiError}
              </div>
            )}
          </div>

          {apiData && (
            <div>
              {/* Funnels Summary */}
              {apiData.funnels?.result === 'SUCCESS' && (
                <div style={{ ...card, padding: 16, marginBottom: 10 }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: OX.forest }}>📊 Funnels found</h4>
                  <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                    {(() => {
                      const funnels = Array.isArray(apiData.funnels.message) ? apiData.funnels.message : [apiData.funnels.message];
                      return funnels.map((f, i) => (
                        <div key={i} style={{ padding: '8px 12px', background: i % 2 === 0 ? OX.cream : '#fff', borderRadius: 6, marginBottom: 4 }}>
                          <strong>{f.funnelName || f.name || `Funnel ${f.funnelId || f.id}`}</strong>
                          {f.funnelId && <span style={{ color: OX.warmGray, marginLeft: 8 }}>ID: {f.funnelId || f.id}</span>}
                          {f.pages && <span style={{ color: OX.forest, marginLeft: 8 }}>{Array.isArray(f.pages) ? f.pages.length : 1} pages</span>}
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}

              {/* Products Summary */}
              {apiData.products?.result === 'SUCCESS' && (
                <div style={{ ...card, padding: 16, marginBottom: 10 }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: OX.terra }}>📦 Products pulled</h4>
                  <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                    {(() => {
                      const products = Array.isArray(apiData.products.message) ? apiData.products.message : [apiData.products.message];
                      return (
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: font }}>
                            <thead>
                              <tr>{['ID', 'Product name', 'Price', 'Status'].map(h =>
                                <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: OX.warmGray, fontWeight: 600, fontSize: 10, textTransform: 'uppercase', borderBottom: `2px solid ${OX.stone}` }}>{h}</th>
                              )}</tr>
                            </thead>
                            <tbody>{products.slice(0, 20).map((p, i) => (
                              <tr key={i} style={{ borderBottom: `1px solid ${OX.cream}` }}>
                                <td style={{ padding: '6px 10px', fontFamily: 'monospace' }}>{p.productId || p.id}</td>
                                <td style={{ padding: '6px 10px', fontWeight: 500 }}>{p.productName || p.name}</td>
                                <td style={{ padding: '6px 10px', color: OX.forest, fontWeight: 600 }}>${p.price || p.productPrice || '—'}</td>
                                <td style={{ padding: '6px 10px' }}>
                                  <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600, background: (p.status || p.productStatus) === 'ACTIVE' ? OX.greenPale : OX.redPale, color: (p.status || p.productStatus) === 'ACTIVE' ? OX.green : OX.red }}>
                                    {p.status || p.productStatus || 'unknown'}
                                  </span>
                                </td>
                              </tr>
                            ))}</tbody>
                          </table>
                        </div>
                      );
                    })()}
                  </div>
                  <p style={{ fontSize: 12, color: OX.forest, marginTop: 10, fontWeight: 600 }}>
                    ✓ Pricing rows auto-populated in the Pricing tab
                  </p>
                </div>
              )}

              {/* Campaigns Summary */}
              {apiData.campaigns?.result === 'SUCCESS' && (
                <div style={{ ...card, padding: 16, marginBottom: 10 }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: OX.charcoal }}>🎯 Campaigns</h4>
                  <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                    {(() => {
                      const campaigns = Array.isArray(apiData.campaigns.message) ? apiData.campaigns.message : [apiData.campaigns.message];
                      return campaigns.slice(0, 10).map((c, i) => (
                        <div key={i} style={{ padding: '8px 12px', background: i % 2 === 0 ? OX.cream : '#fff', borderRadius: 6, marginBottom: 4 }}>
                          <strong>{c.campaignName || c.name || `Campaign ${c.campaignId || c.id}`}</strong>
                          <span style={{ color: OX.warmGray, marginLeft: 8 }}>ID: {c.campaignId || c.id}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}

              {/* Raw data toggle */}
              <details style={{ ...card, padding: 16 }}>
                <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 600, color: OX.warmGray }}>View raw API response</summary>
                <pre style={{ marginTop: 10, padding: 12, background: OX.cream, borderRadius: 8, fontSize: 11, fontFamily: 'monospace', whiteSpace: 'pre-wrap', maxHeight: 400, overflowY: 'auto', color: OX.charcoal }}>{JSON.stringify(apiData, null, 2)}</pre>
              </details>
            </div>
          )}
        </div>
      )}

      {/* ── Checklist Tab ─────────────────────────── */}
      {view === 'checklist' && (
        <div>
          {CHECKLIST.map(cat => {
            const isExp = expanded.includes(cat.id);
            const cf = cat.items.filter(i => statuses[i.id] === 'fail').length;
            const cd = cat.items.filter(i => statuses[i.id] && statuses[i.id] !== 'unchecked').length;
            return (
              <div key={cat.id} style={{ ...card, marginBottom: 8 }}>
                <button onClick={() => setExpanded(p => p.includes(cat.id) ? p.filter(c => c !== cat.id) : [...p, cat.id])}
                  style={{ width: '100%', padding: '12px 16px', border: 'none', background: cf > 0 ? OX.redPale : cd === cat.items.length ? OX.greenPale : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', fontFamily: font }}>
                  <span style={{ fontSize: 16 }}>{cat.icon}</span>
                  <span style={{ flex: 1, fontWeight: 700, fontSize: 14, color: OX.charcoal }}>{cat.category}</span>
                  <span style={{ fontSize: 11, color: OX.warmGray }}>{cd}/{cat.items.length}{cf > 0 && <span style={{ color: OX.red, marginLeft: 4 }}>({cf}✗)</span>}</span>
                  <span style={{ fontSize: 11, color: OX.lightGray, transform: isExp ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }}>▼</span>
                </button>
                {isExp && <div style={{ borderTop: `1px solid ${OX.cream}` }}>
                  {cat.items.map(item => (
                    <div key={item.id} style={{ padding: '8px 16px', borderBottom: `1px solid ${OX.cream}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <StatusBtn status={statuses[item.id] || 'unchecked'} onClick={() => cycleStatus(item.id)} />
                        <span style={{
                          flex: 1, fontSize: 13, lineHeight: 1.4,
                          color: statuses[item.id] === 'pass' ? OX.lightGray : statuses[item.id] === 'fail' ? OX.red : OX.charcoal,
                          textDecoration: statuses[item.id] === 'pass' ? 'line-through' : 'none',
                        }}>
                          {item.critical && <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: 99, background: OX.terra, marginRight: 6, verticalAlign: 'middle' }} />}
                          {item.task}
                        </span>
                        <button onClick={() => setShowNotes(p => ({ ...p, [item.id]: !p[item.id] }))}
                          style={{ border: 'none', background: 'transparent', fontSize: 14, cursor: 'pointer', color: notes[item.id] ? OX.forest : OX.lightGray, padding: '2px 6px', fontFamily: font }}>
                          {notes[item.id] ? '📝' : '＋'}
                        </button>
                      </div>
                      {showNotes[item.id] && (
                        <input value={notes[item.id] || ''} onChange={e => setNotes(p => ({ ...p, [item.id]: e.target.value }))}
                          placeholder="Add note (e.g., 'Showing 50% but should be 35%')"
                          style={{ ...input, marginTop: 6, marginLeft: 46, width: 'calc(100% - 46px)', fontSize: 12, padding: '6px 10px' }} />
                      )}
                    </div>
                  ))}
                </div>}
              </div>
            );
          })}

          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <button onClick={() => setShowReport(!showReport)} style={{ ...btnPrimary, flex: 1, minWidth: 160 }}>
              {showReport ? 'Hide' : '📋 Generate'} Asana report
            </button>
            <button onClick={saveToHistory} style={{ ...btnSecondary }}>💾 Save</button>
            <button onClick={resetAll} style={{ ...btnSecondary, color: OX.lightGray }}>Reset</button>
          </div>

          {showReport && (
            <div style={{ marginTop: 12, ...card }}>
              <div style={{ padding: '10px 14px', background: OX.cream, borderBottom: `1px solid ${OX.stone}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: OX.warmGray }}>Asana report (copy & paste)</span>
                <button onClick={() => navigator.clipboard.writeText(generateReport())} style={{ padding: '4px 14px', borderRadius: 6, border: `1px solid ${OX.stone}`, background: '#fff', fontSize: 11, cursor: 'pointer', fontWeight: 600, fontFamily: font }}>Copy</button>
              </div>
              <pre style={{ padding: 14, fontSize: 12, fontFamily: 'monospace', whiteSpace: 'pre-wrap', margin: 0, maxHeight: 320, overflowY: 'auto', color: OX.charcoal, lineHeight: 1.5, background: '#fff' }}>{generateReport()}</pre>
            </div>
          )}
        </div>
      )}

      {/* ── Pricing Tab ───────────────────────────── */}
      {view === 'pricing' && (
        <div style={{ ...card, padding: 20 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700 }}>💲 Pricing math verifier</h3>
          <PricingVerifier rows={pricingRows} setRows={setPricingRows} />
        </div>
      )}

      {/* ── Slugs Tab ─────────────────────────────── */}
      {view === 'slugs' && (
        <div style={{ ...card, padding: 20 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700 }}>🔗 Slug duplicate detector</h3>
          <SlugValidator slugText={slugText} setSlugText={setSlugText} />
        </div>
      )}

      {/* ── Page Analyzer Tab ─────────────────────── */}
      {view === 'analyzer' && (
        <div style={{ ...card, padding: 20 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700 }}>🔍 Page source analyzer</h3>
          <PageAnalyzer pageHTML={pageHTML} setPageHTML={setPageHTML} pageSpecs={pageSpecs} setPageSpecs={setPageSpecs} findings={findings} setFindings={setFindings} />
        </div>
      )}

      {/* ── History Tab ────────────────────────────── */}
      {view === 'history' && (
        <div style={{ ...card, padding: 20 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 17, fontWeight: 700 }}>📋 Audit history</h3>
          {history.length === 0 ? <p style={{ fontSize: 13, color: OX.lightGray }}>No saved audits yet. Complete a checklist and hit "Save."</p> :
            history.map(h => (
              <div key={h.id} style={{ padding: '12px 16px', borderBottom: `1px solid ${OX.cream}`, display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{
                  width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0,
                  background: h.result === 'PASS' ? OX.greenPale : h.result === 'ISSUES' ? OX.redPale : OX.cream,
                  color: h.result === 'PASS' ? OX.green : h.result === 'ISSUES' ? OX.red : OX.warmGray,
                }}>{h.result === 'PASS' ? '✓' : h.result === 'ISSUES' ? '✗' : '…'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{h.name}</div>
                  <div style={{ fontSize: 12, color: OX.warmGray }}>{new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · {h.passCount}/{h.total} passed{h.failCount > 0 ? ` · ${h.failCount} failed` : ''}</div>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* ── Footer ────────────────────────────────── */}
      <div style={{ textAlign: 'center', marginTop: 32, fontSize: 11, color: OX.lightGray }}>
        <span style={{ color: OX.terra }}>●</span> = critical item · Autosaves to localStorage · Built for Organixx marketing team
      </div>
    </div>
  );
}
