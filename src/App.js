import { useState, useRef, useEffect } from 'react';
import './App.css';

const INSIGHT_TITLES = {
  seo_structure: 'SEO Structure',
  messaging_clarity: 'Messaging Clarity',
  cta_usage: 'CTA Usage',
  content_depth: 'Content Depth',
  ux_structure: 'UX & Structure',
};

const INSIGHT_ORDER = ['seo_structure', 'messaging_clarity', 'cta_usage', 'content_depth', 'ux_structure'];

function scoreColor(score) {
  if (score >= 70) return '#22c55e';
  if (score >= 40) return '#eab308';
  return '#ef4444';
}

function InsightCard({ title, data }) {
  const color = scoreColor(data.score);
  return (
    <div className="insight-card fade-card">
      <div className="insight-header">
        <h3 className="insight-title">{title}</h3>
        <div className="score-circle" style={{ borderColor: color }}>
          <span className="score-num" style={{ color }}>{data.score}</span>
        </div>
      </div>
      <div className="score-bar-track">
        <div className="score-bar-fill" style={{ width: `${data.score}%`, background: color }} />
      </div>
      <div className="insight-body">
        <div className="insight-left">
          <p className="insight-summary">{data.summary}</p>
          {data.strengths?.length > 0 && (
            <div className="insight-strengths">
              <h4 className="insight-sub-title">Strengths</h4>
              {data.strengths.map((s, i) => (
                <div key={i} className="strength-item">
                  <span className="strength-check">&#10003;</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {data.issues?.length > 0 && (
          <div className="insight-right">
            <div className="insight-issues">
              <h4 className="insight-sub-title">Issues</h4>
              {data.issues.map((item, i) => (
                <div key={i} className="issue-item">
                  <div className="issue-top">
                    <span className={`severity-badge severity-${item.severity}`}>{item.severity}</span>
                    <span className="issue-text">{item.issue}</span>
                  </div>
                  <p className="issue-suggestion">{item.suggestion}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryPage({ onSelect, onEmpty }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    fetch('http://localhost:5000/history')
      .then(r => r.json())
      .then(data => { setEntries(data); setLoading(false); })
      .catch(() => { setError('Failed to load history'); setLoading(false); });
  }, []);

  useEffect(() => {
    if (entries.length === 0) return;
    const observer = new IntersectionObserver(
      (obs) => obs.forEach(e => e.target.classList.toggle('visible', e.isIntersecting)),
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );
    const timer = setTimeout(() => {
      document.querySelectorAll('.history-card.fade-card').forEach(c => observer.observe(c));
    }, 50);
    return () => { clearTimeout(timer); observer.disconnect(); };
  }, [entries]);

  const scoreColor = (s) => s >= 70 ? '#22c55e' : s >= 40 ? '#eab308' : '#ef4444';

  const handleDelete = async (timestamp) => {
    try {
      const res = await fetch(`http://localhost:5000/history/${timestamp}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { alert(`Delete failed: ${data.error}`); return; }
      setEntries(prev => {
        const updated = prev.filter(e => e.timestamp !== timestamp);
        if (updated.length === 0) onEmpty();
        return updated;
      });
      setConfirmDelete(null);
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const formatTimestamp = (ts) => {
    const [date, time] = ts.split('_');
    const [h, m, s] = time.split('-');
    return `${date} at ${h}:${m}:${s}`;
  };

  const SCORE_LABELS = {
    seo_structure: 'SEO',
    messaging_clarity: 'Messaging',
    cta_usage: 'CTA',
    content_depth: 'Content',
    ux_structure: 'UX',
  };

  return (
    <main className="main">
      <div className="hero">
        <h2 className="title">Previous Analyses</h2>
        <p className="subtitle">Select a website to view its full audit</p>
      </div>

      {loading && (
        <div className="insights-loading">
          <span className="spinner spinner-lg"></span>
          <p>Loading history...</p>
        </div>
      )}

      {error && <p className="error-msg">{error}</p>}

      {!loading && !error && entries.length === 0 && (
        <p className="subtitle" style={{ marginTop: 40 }}>No analyses saved yet.</p>
      )}

      {confirmDelete && (
        <div className="confirm-overlay">
          <div className="confirm-box">
            <h3 className="confirm-title">Delete this audit?</h3>
            <p className="confirm-msg">This will permanently remove the saved data for <strong>{(() => { try { return new URL(entries.find(e => e.timestamp === confirmDelete)?.url).hostname.replace('www.', ''); } catch { return confirmDelete; } })()}</strong>. This cannot be undone.</p>
            <div className="confirm-actions">
              <button className="confirm-cancel" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="confirm-delete" onClick={() => handleDelete(confirmDelete)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      <div className="history-grid">
        {entries.map((entry) => (
          <div key={entry.timestamp} className="history-card fade-card" onClick={() => onSelect(entry.timestamp)}>
            <div className="history-card-header">
              <span className="history-domain">{(() => { try { return new URL(entry.url).hostname.replace('www.', ''); } catch { return entry.url; } })()}</span>
              <span className="history-time">{formatTimestamp(entry.timestamp)}</span>
            </div>
            <p className="history-url">{entry.url}</p>
            <div className="history-meta">
              {entry.wordCount != null && <span className="history-chip">{entry.wordCount.toLocaleString()} words</span>}
              {entry.loadTimeMs != null && <span className="history-chip">{entry.loadTimeMs}ms</span>}
            </div>
            <div className="history-card-footer">
              <div className="history-scores">
                {Object.entries(entry.scores).map(([key, score]) => (
                  <div key={key} className="history-score-item">
                    <div className="history-score-circle" style={{ borderColor: scoreColor(score) }}>
                      <span className="history-score-num" style={{ color: scoreColor(score) }}>{score}</span>
                    </div>
                    <span className="history-score-label">{SCORE_LABELS[key]}</span>
                  </div>
                ))}
              </div>
              <button className="history-delete-btn" onClick={e => { e.stopPropagation(); setConfirmDelete(entry.timestamp); }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

function PromptLogsSection({ logs }) {
  const [open, setOpen] = useState(false);
  const [openIndex, setOpenIndex] = useState(null);

  if (!logs || logs.length === 0) return null;

  return (
    <div className="prompt-logs-section">
      <button className="prompt-logs-toggle" onClick={() => setOpen(o => !o)}>
        <span>Prompt Logs ({logs.length} calls)</span>
        <span className="toggle-chevron">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="prompt-logs-list">
          {logs.map((log, i) => (
            <div key={i} className="log-entry">
              <div className="log-entry-header" onClick={() => setOpenIndex(openIndex === i ? null : i)}>
                <span className="log-entry-name">{log.call_name}</span>
                <span className={log.error ? 'log-status-error' : 'log-status-ok'}>
                  {log.error ? '✗ error' : '✓ ok'}
                </span>
              </div>

              {openIndex === i && (
                <div className="log-entry-body">
                  <p className="log-label">System Prompt</p>
                  <pre className="log-pre">{log.system_prompt}</pre>

                  <p className="log-label">User Prompt</p>
                  <pre className="log-pre">{log.user_prompt}</pre>

                  <p className="log-label">Payload Sent to Model</p>
                  <pre className="log-pre">{JSON.stringify(log.payload, null, 2)}</pre>

                  <p className="log-label">Raw Model Output</p>
                  <pre className="log-pre">{log.raw_output ?? '—'}</pre>

                  {log.error && (
                    <>
                      <p className="log-label">Error</p>
                      <pre className="log-pre log-pre-error">{log.error}</pre>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function App() {
  const [dark, setDark] = useState(false);
  const [page, setPage] = useState('home');
  const [hasHistory, setHasHistory] = useState(false);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [insights, setInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState('');
  const resultsRef = useRef(null);
  const insightsRef = useRef(null);

  useEffect(() => {
    fetch('http://localhost:5000/history')
      .then(r => r.json())
      .then(data => setHasHistory(Array.isArray(data) && data.length > 0))
      .catch(() => {});
  }, [insights]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          } else {
            entry.target.classList.remove('visible');
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );

    const timer = setTimeout(() => {
      const cards = document.querySelectorAll('.fade-card');
      cards.forEach(card => observer.observe(card));
    }, 50);

    return () => { clearTimeout(timer); observer.disconnect(); };
  }, [results, insights, page, url]);

  const handleSelectHistory = async (timestamp) => {
    try {
      const res = await fetch(`http://localhost:5000/history/${timestamp}`);
      const data = await res.json();
      setUrl(data.scrape.url);
      setResults(data.scrape);
      setInsights(data.insights);
      setInsightsError('');
      setError('');
      setPage('home');
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      alert('Failed to load audit');
    }
  };

  const d = (val) => (val === '' || val === null || val === undefined) ? "Doesn't exist" : val;
  const MetaValue = ({ val }) => {
    const missing = val === '' || val === null || val === undefined;
    return <p className={`meta-value${missing ? ' meta-value-missing' : ''}`}>{missing ? "Doesn't exist" : val}</p>;
  };

  const fetchInsights = async (scrapeData) => {
    setInsightsLoading(true);
    setInsightsError('');
    setInsights(null);
    try {
      const res = await fetch('http://localhost:5000/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scrapeData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setInsights(data);
      setTimeout(() => {
        insightsRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      setInsightsError(err.message);
    } finally {
      setInsightsLoading(false);
    }
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setError('');
    setResults(null);
    setInsights(null);
    setInsightsError('');

    try {
      const res = await fetch('http://localhost:4000/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scraping failed');
      setResults(data);
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      fetchInsights(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`app ${dark ? 'dark' : 'light'}`}>
      <div className="bg-circles">
        <span className="circle circle-1"></span>
        <span className="circle circle-2"></span>
        <span className="circle circle-3"></span>
        <span className="circle circle-4"></span>
        <span className="circle circle-5"></span>
        <span className="circle circle-6"></span>
        <span className="circle circle-7"></span>
        <span className="circle circle-8"></span>
      </div>
      <header className="header">
        <div className="header-left">
          <img src="/WEBLOGO_tab.png" alt="WebFix" className="logo-img" style={{ cursor: 'pointer' }} onClick={() => { setPage('home'); setUrl(''); setResults(null); setInsights(null); setError(''); setInsightsError(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
        </div>
        <div className="header-center">
          {(hasHistory || page === 'history') && <button className="nav-btn" onClick={() => { setPage(page === 'history' ? 'home' : 'history'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
            {page === 'history' ? (
              <span className="toggle-content">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
                </svg>
                Back
              </span>
            ) : (
              <span className="toggle-content">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 8 8 12 12 16"/><line x1="16" y1="12" x2="8" y2="12"/>
                </svg>
                History
              </span>
            )}
          </button>}
        </div>
        <div className="header-right">
          <button className="theme-toggle" onClick={() => setDark(!dark)}>
          {dark ? (
            <span className="toggle-content">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
              Light Mode
            </span>
          ) : (
            <span className="toggle-content">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
              Dark Mode
            </span>
          )}
          </button>
        </div>
      </header>


      {page === 'history' && <HistoryPage onSelect={handleSelectHistory} onEmpty={() => { setHasHistory(false); setPage('home'); }} />}
      {page === 'home' && <main className="main">
        <img src="/WEBLOGO.png" alt="WebFix" className="main-logo fade-card" />
        <div className="hero fade-card">
          <h2 className="title">Enter a URL to get started</h2>
          <p className="subtitle">Let WebFix audit and improve your website</p>
        </div>

        <div className="url-input-container fade-card">
          <div className="url-input-wrapper">
            <svg className="url-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            <input
              type="url"
              className="url-input"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && url.trim() && !loading && handleAnalyze()}
              spellCheck={false}
            />
          </div>
        </div>

        <button className="submit-btn fade-card" disabled={!url.trim() || loading} onClick={handleAnalyze}>
          <span>{loading ? 'Analyzing...' : 'Analyze'}</span>
          {!loading && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          )}
          {loading && <span className="spinner"></span>}
        </button>

        {error && <p className="error-msg">{error}</p>}

        {results && (
          <section className="results" ref={resultsRef}>
            <h2 className="results-title">Factual Metrics</h2>

            <div className="metrics-grid">
              <div className="metric-card fade-card">
                <span className="metric-label">Total Word Count</span>
                <span className="metric-value">{typeof results.totalWordCount === 'number' ? results.totalWordCount.toLocaleString() : d(results.totalWordCount)}</span>
              </div>

              <div className="metric-card fade-card">
                <span className="metric-label">Headings</span>
                <div className="heading-counts">
                  <div className="heading-item"><span className="heading-tag">H1</span><span className="heading-num">{d(results.headings.h1)}</span></div>
                  <div className="heading-item"><span className="heading-tag">H2</span><span className="heading-num">{d(results.headings.h2)}</span></div>
                  <div className="heading-item"><span className="heading-tag">H3</span><span className="heading-num">{d(results.headings.h3)}</span></div>
                </div>
              </div>

              <div className="metric-card fade-card">
                <span className="metric-label">CTAs Found</span>
                <span className="metric-value">{d(results.ctaCount)}</span>
              </div>

              <div className="metric-card fade-card">
                <span className="metric-label">Internal Links</span>
                <span className="metric-value">{d(results.links.internal)}</span>
              </div>
              <div className="metric-card fade-card">
                <span className="metric-label">External Links</span>
                <span className="metric-value">{d(results.links.external)}</span>
              </div>
              <div className="metric-card fade-card">
                <span className="metric-label">Total Links</span>
                <span className="metric-value">{d(results.links.total)}</span>
              </div>

              <div className="metric-card fade-card">
                <span className="metric-label">Total Images</span>
                <span className="metric-value">{d(results.images.total)}</span>
              </div>
              <div className="metric-card fade-card">
                <span className="metric-label">Missing Alt Text</span>
                <span className="metric-value">{(results.images.missingAltPercent === '' || results.images.missingAltPercent === null || results.images.missingAltPercent === undefined) ? "Doesn't exist" : `${results.images.missingAltPercent}%`}</span>
              </div>

              <div className="metric-card fade-card">
                <span className="metric-label">Load Time</span>
                <span className="metric-value">{results.loadTimeMs ? `${results.loadTimeMs}ms` : d(results.loadTimeMs)}</span>
              </div>
              <div className="metric-card fade-card">
                <span className="metric-label">Status Code</span>
                <span className="metric-value">{d(results.statusCode)}</span>
              </div>

              <div className="metric-card fade-card">
                <span className="metric-label">DOM Elements</span>
                <span className="metric-value">{typeof results.domElementCount === 'number' ? results.domElementCount.toLocaleString() : d(results.domElementCount)}</span>
              </div>
              <div className="metric-card fade-card">
                <span className="metric-label">Inline Styles</span>
                <span className="metric-value">{d(results.inlineStylesCount)}</span>
              </div>

              <div className="metric-card fade-card">
                <span className="metric-label">External Stylesheets</span>
                <span className="metric-value">{d(results.externalStylesheetsCount)}</span>
              </div>
              <div className="metric-card fade-card">
                <span className="metric-label">External Scripts</span>
                <span className="metric-value">{d(results.externalScriptsCount)}</span>
              </div>

              <div className="metric-card fade-card">
                <span className="metric-label">Forms</span>
                <span className="metric-value">{d(results.formsCount)}</span>
              </div>
              <div className="metric-card fade-card">
                <span className="metric-label">Videos</span>
                <span className="metric-value">{d(results.videosCount)}</span>
              </div>

              <div className="metric-card fade-card">
                <span className="metric-label">ARIA Roles</span>
                <span className="metric-value">{d(results.ariaRolesCount)}</span>
              </div>
              <div className="metric-card fade-card">
                <span className="metric-label">Social Links</span>
                <span className="metric-value">{Array.isArray(results.socialLinks) ? results.socialLinks.length : 0}</span>
              </div>

              <div className="metric-card fade-card">
                <span className="metric-label">HTTPS</span>
                <span className="metric-value">{results.urlStructure?.isHttps ? 'Yes' : 'No'}</span>
              </div>
              <div className="metric-card fade-card">
                <span className="metric-label">Favicon</span>
                <span className="metric-value">{results.faviconPresent ? 'Present' : 'Missing'}</span>
              </div>

              <div className="metric-card fade-card">
                <span className="metric-label">HTML Lang</span>
                <span className="metric-value">{d(results.htmlLang)}</span>
              </div>
              <div className="metric-card fade-card">
                <span className="metric-label">Unlabelled Inputs</span>
                <span className="metric-value">{d(results.unlabelledInputsCount)}</span>
              </div>
            </div>

            {Array.isArray(results.keywordUsage) && results.keywordUsage.length > 0 && (
              <div className="meta-section">
                <h3 className="meta-heading">Top Keywords</h3>
                <div className="keywords-grid">
                  {results.keywordUsage.map((kw, i) => (
                    <div key={i} className="keyword-card fade-card">
                      <span className="keyword-word">{kw.word}</span>
                      <span className="keyword-count">{kw.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="meta-section">
              <h3 className="meta-heading">Meta Information</h3>
              <div className="meta-card fade-card">
                <span className="meta-label">Meta Title</span>
                <MetaValue val={results.metaTitle} />
              </div>
              <div className="meta-card fade-card">
                <span className="meta-label">Meta Description</span>
                <MetaValue val={results.metaDescription} />
              </div>
              <div className="meta-card fade-card">
                <span className="meta-label">Canonical URL</span>
                <MetaValue val={results.canonicalUrl} />
              </div>
              <div className="meta-card fade-card">
                <span className="meta-label">Meta Robots</span>
                <MetaValue val={results.metaRobots} />
              </div>
              <div className="meta-card fade-card">
                <span className="meta-label">Cache Control</span>
                <MetaValue val={results.cacheControlHeader} />
              </div>
            </div>
          </section>
        )}

        {/* Generated Insights Section */}
        {(insightsLoading || insights || insightsError) && (
          <section className="insights-section" ref={insightsRef}>
            <h2 className="results-title">Generated Insights</h2>

            {insightsLoading && (
              <div className="insights-loading">
                <span className="spinner spinner-lg"></span>
                <p>Generating AI insights... This may take a moment.</p>
              </div>
            )}

            {insightsError && <p className="error-msg">{insightsError}</p>}

            {insights && (
              <>
                <div className="insights-grid">
                  {INSIGHT_ORDER.map(key => (
                    insights[key] && (
                      <InsightCard key={key} title={INSIGHT_TITLES[key]} data={insights[key]} />
                    )
                  ))}
                </div>

                {insights.recommendations?.length > 0 && (
                  <div className="recommendations-section">
                    <h2 className="results-title">Recommendations</h2>
                    <div className="recommendations-list">
                      {insights.recommendations.map((rec, i) => (
                        <div key={i} className="recommendation-card fade-card">
                          <div className="recommendation-header">
                            <span className="recommendation-number">{i + 1}</span>
                            <div className="recommendation-meta">
                              <h3 className="recommendation-title">{rec.title}</h3>
                              <div className="recommendation-badges">
                                <span className={`severity-badge severity-${rec.priority}`}>{rec.priority}</span>
                                <span className="category-badge">{rec.category}</span>
                              </div>
                            </div>
                          </div>
                          <p className="recommendation-description">{rec.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <PromptLogsSection logs={insights.prompt_logs} />
              </>
            )}
          </section>
        )}
      </main>}

      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand-col">
            <img src="/WEBLOGO.png" alt="WebFix" className="footer-logo" />
            <p className="footer-tagline">AI-powered web audit tool. Get actionable insights to improve your SEO, UX, content, and conversion rate in seconds.</p>
          </div>

          <div className="footer-col">
            <h4 className="footer-col-title">Product</h4>
            <ul className="footer-links">
              <li><span className="footer-link">Features</span></li>
              <li><span className="footer-link">How It Works</span></li>
              <li><span className="footer-link">Pricing</span></li>
              <li><span className="footer-link">Changelog</span></li>
              <li><span className="footer-link">Roadmap</span></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4 className="footer-col-title">Resources</h4>
            <ul className="footer-links">
              <li><span className="footer-link">Documentation</span></li>
              <li><span className="footer-link">API Reference</span></li>
              <li><span className="footer-link">Blog</span></li>
              <li><span className="footer-link">Case Studies</span></li>
              <li><span className="footer-link">Support</span></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4 className="footer-col-title">Legal</h4>
            <ul className="footer-links">
              <li><span className="footer-link">Privacy Policy</span></li>
              <li><span className="footer-link">Terms of Service</span></li>
              <li><span className="footer-link">Cookie Policy</span></li>
              <li><span className="footer-link">GDPR Compliance</span></li>
              <li><span className="footer-link">Acceptable Use</span></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-copy">© {new Date().getFullYear()} WebFix Web Audit Tool. All rights reserved.</p>
          <p className="footer-disclaimer">WebFix is a showcase web audit tool. All audit results are AI-generated and for informational purposes only. Results should not be used as the sole basis for business decisions.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
