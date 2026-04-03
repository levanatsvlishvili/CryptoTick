import { useState, useEffect, useMemo } from 'react';
import { Authenticator, View, Text, Heading, useAuthenticator, ThemeProvider } from '@aws-amplify/ui-react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import '@aws-amplify/ui-react/styles.css';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || "https://up5jue5r2l.execute-api.eu-central-1.amazonaws.com/prod/";

const SYMBOLS = [
    "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "ADAUSDT", "AVAXUSDT", "DOTUSDT", "DOGEUSDT", "LINKUSDT",
    "MATICUSDT", "SHIBUSDT", "LTCUSDT", "TRXUSDT", "BCHUSDT", "UNIUSDT", "NEARUSDT", "APTUSDT", "OPUSDT", "ARBUSDT"
];

const TIME_RANGES = {
    "1H": 3600000,
    "1D": 86400000,
    "1W": 604800000,
    "1M": 2592000000
};

const theme = {
    name: 'crypto-theme',
    tokens: {
        colors: {
            background: {
                primary: { value: 'transparent' },
                secondary: { value: 'rgba(0,0,0,0.3)' },
            },
            font: {
                primary: { value: '#eaecef' },
                secondary: { value: '#707a8a' },
            },
            border: { primary: { value: '#2b2f36' } },
            brand: {
                primary: {
                    10: { value: '#2196f3' },
                    80: { value: '#2196f3' },
                    90: { value: '#1976d2' },
                    100: { value: '#1565c0' },
                },
            },
        },
        components: {
            authenticator: {
                router: {
                    borderWidth: { value: '1px' },
                    borderColor: { value: '#2b2f36' },
                    backgroundColor: { value: 'rgba(24, 26, 32, 0.9)' },
                    borderRadius: { value: '24px' },
                },
            },
            fieldcontrol: {
                backgroundColor: { value: '#0b0e11' },
                color: { value: 'white' },
                borderColor: { value: '#2b2f36' },
                _focus: { borderColor: { value: '#2196f3' } },
            },
        },
    },
};

const authFormFields = {
    signUp: {
        email: { order: 1, isRequired: true },
        password: { order: 2, isRequired: true },
        confirm_password: { order: 3, isRequired: true }
    }
};

function Dashboard({ signOut, user }) {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('ALL');
    const [threshold, setThreshold] = useState(0.1);
    const [selectedSymbols, setSelectedSymbols] = useState(["BTCUSDT", "ETHUSDT"]);
    const [timeRange, setTimeRange] = useState('1H');
    const [currentPage, setCurrentPage] = useState(1);
    const [toast, setToast] = useState(null);
    const pageSize = 8;

    const getInitialData = async () => {
        try {
            const session = await fetchAuthSession();
            const token = session.tokens.idToken.toString();
            const response = await fetch(API_URL, { headers: { 'Authorization': token } });
            const data = await response.json();
            setAlerts(data.alerts || []);
            if (data.settings) {
                setThreshold(parseFloat(data.settings.threshold || 0.1));
                if (data.settings.trackedSymbols) setSelectedSymbols(data.settings.trackedSymbols.split(", "));
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const saveSettings = async () => {
        try {
            const session = await fetchAuthSession();
            const token = session.tokens.idToken.toString();
            await fetch(API_URL, {
                method: 'POST',
                headers: { 'Authorization': token, 'Content-Type': 'application/json' },
                body: JSON.stringify({ threshold: parseFloat(threshold), trackedSymbols: selectedSymbols.join(", ") })
            });
            setToast("CLOUD CONFIG SYNCHRONIZED");
            setTimeout(() => setToast(null), 3000);
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        getInitialData();
        const interval = setInterval(getInitialData, 30000);
        return () => clearInterval(interval);
    }, []);

    const toggleSymbol = (sym) => setSelectedSymbols(prev => prev.includes(sym) ? prev.filter(s => s !== sym) : [...prev, sym]);
    const adjustThreshold = (val) => setThreshold(prev => {
        const newVal = (parseFloat(prev || 0) + val).toFixed(1);
        return newVal >= 0 ? newVal : 0;
    });

    const processedData = useMemo(() => {
        const cutoff = Date.now() - TIME_RANGES[timeRange];
        let filtered = alerts.filter(a => parseInt(a.timestamp) >= cutoff);
        if (activeTab !== 'ALL') filtered = filtered.filter(a => a.symbol === activeTab);
        return filtered;
    }, [alerts, timeRange, activeTab]);

    const chartData = [...processedData].reverse().map(a => ({ time: new Date(parseInt(a.timestamp)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), price: parseFloat(a.price) }));
    const paginatedAlerts = useMemo(() => { const start = (currentPage - 1) * pageSize; return processedData.slice(start, start + pageSize); }, [processedData, currentPage]);

    if (loading) return (
        <div className="loading-screen">
            <div className="loader-ring"></div>
            <Text color="var(--text-muted)" letterSpacing="4px" fontSize="11px" fontWeight="900">NODE INITIALIZATION</Text>
        </div>
    );

    return (
        <div className="app-layout">
            {toast && <div className="toast">{toast}</div>}
            <aside className="sidebar">
                <div className="sidebar-content">
                    <div className="sidebar-section">
                        <span className="sidebar-label">Identity Node</span>
                        <div className="user-box">
                            <div className="user-email-value">{user.signInDetails?.loginId || user.username}</div>
                            <button className="btn-logout" onClick={() => signOut()}>LOG OUT</button>
                        </div>
                    </div>
                    <div className="sidebar-section">
                        <span className="sidebar-label">Alert Sensitivity (%)</span>
                        <div className="threshold-control">
                            <button className="threshold-btn" onClick={() => adjustThreshold(-0.1)}>−</button>
                            <input type="number" step="0.1" className="input-terminal" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
                            <button className="threshold-btn" onClick={() => adjustThreshold(0.1)}>+</button>
                        </div>
                    </div>
                    <div className="sidebar-section">
                        <span className="sidebar-label">Watchlist Mapping</span>
                        <div className="symbol-grid">{SYMBOLS.map(sym => (<button key={sym} className={`symbol-btn ${selectedSymbols.includes(sym) ? 'active' : ''}`} onClick={() => toggleSymbol(sym)}>{sym.replace('USDT', '')}</button>))}</div>
                        <button className="btn-primary" style={{ marginTop: '24px' }} onClick={saveSettings}>APPLY CONFIG</button>
                    </div>
                </div>
                <div className="sidebar-footer">
                    <span className="author-name">LEVAN NATSVLISHVILI</span>
                    <div className="social-links">
                        <a href="https://github.com/levanatsvlishvili/CryptoTick" target="_blank" className="social-link">GITHUB</a>
                        <a href="https://www.linkedin.com/in/levan-natsvlishvili/" target="_blank" className="social-link">LINKEDIN</a>
                    </div>
                </div>
            </aside>
            <main className="main-content">
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <Heading level={2} fontWeight={800} color="var(--accent)">CRYPTOTICK HUB</Heading>
                    <div className="range-picker">{Object.keys(TIME_RANGES).map(range => (<button key={range} className={`range-btn ${timeRange === range ? 'active' : ''}`} onClick={() => { setTimeRange(range); setCurrentPage(1); }}>{range}</button>))}</div>
                </header>
                <nav className="tab-nav">
                    <button className={`tab-link ${activeTab === 'ALL' ? 'active' : ''}`} onClick={() => { setActiveTab('ALL'); setCurrentPage(1); }}>Aggregate</button>
                    {selectedSymbols.map(sym => (<button key={sym} className={`tab-link ${activeTab === sym ? 'active' : ''}`} onClick={() => { setActiveTab(sym); setCurrentPage(1); }}>{sym.replace('USDT', '')}</button>))}
                </nav>
                <div className="card" style={{ height: '440px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <span style={{ fontWeight: 800, fontSize: '14px', color: '#fff' }}>TRAJECTORY: {activeTab} ({timeRange})</span>
                        <Text color="var(--success)" fontSize="11px" fontWeight={800}>● LIVE TELEMETRY</Text>
                    </div>
                    <ResponsiveContainer width="100%" height="90%">
                        <AreaChart data={chartData}>
                            <defs><linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--accent)" stopOpacity={0.2}/><stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/></linearGradient></defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2b2f36" vertical={false} />
                            <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={10} axisLine={false} tickLine={false} />
                            <YAxis domain={['auto', 'auto']} stroke="var(--text-muted)" fontSize={10} axisLine={false} tickLine={false} orientation="right" />
                            <Tooltip contentStyle={{ background: '#1e2026', border: '1px solid #2b2f36', borderRadius: '12px' }} />
                            <Area type="monotone" dataKey="price" stroke="var(--accent)" strokeWidth={3} fill="url(#areaGrad)" animationDuration={1000} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                    <table className="data-table">
                        <thead><tr style={{ background: 'rgba(255,255,255,0.01)' }}><th>Asset</th><th>Price Transition</th><th>Delta</th><th>Timestamp</th></tr></thead>
                        <tbody>{paginatedAlerts.map((alert, index) => {
                            const diff = parseFloat(alert.price) - parseFloat(alert.oldPrice);
                            const pct = ((diff / parseFloat(alert.oldPrice)) * 100).toFixed(4);
                            return (<tr key={index}><td style={{ fontWeight: 800 }}>{alert.symbol.replace('USDT', '')}</td><td><span style={{ color: 'var(--text-muted)' }}>${parseFloat(alert.oldPrice).toLocaleString()}</span><span style={{ margin: '0 12px', color: 'var(--accent)', fontWeight: 900 }}>➔</span><span style={{ fontWeight: 600 }}>${parseFloat(alert.price).toLocaleString()}</span></td><td style={{ color: diff >= 0 ? 'var(--success)' : 'var(--error)', fontWeight: 800 }}>{diff >= 0 ? '▲' : '▼'} {Math.abs(pct)}%</td><td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{new Date(parseInt(alert.timestamp)).toLocaleString()}</td></tr>);
                        })}</tbody>
                    </table>
                    <div className="pagination"><button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}>PREV</button><span>PAGE {currentPage}</span><button disabled={paginatedAlerts.length < pageSize} onClick={() => setCurrentPage(prev => prev + 1)}>NEXT</button></div>
                </div>
            </main>
        </div>
    );
}

function AuthWrapper() {
    const { route, user, signOut } = useAuthenticator((context) => [context.route, context.user]);
    if (route === 'authenticated' && user) {
        return <Dashboard signOut={signOut} user={user} />;
    }
    return (
        <div className="auth-landing-view">
            <div className="auth-info-side">
                <h1>CRYPTOTICK <span>HUB</span></h1>
                <p className="auth-hero-desc">The next generation of event-driven cryptocurrency analytics. Real-time market surveillance powered by AWS Serverless architecture.</p>
                <div className="feature-list-landing">
                    <div className="feature-entry">
                        <h4>⚡ Live Telemetry</h4>
                        <p>Real-time data synchronization with global exchanges via high-throughput SQS pipelines.</p>
                    </div>
                    <div className="feature-entry">
                        <h4>☁️ Cloud Native</h4>
                        <p>100% Serverless core built on AWS Lambda and DynamoDB for global scalability.</p>
                    </div>
                    <div className="feature-entry">
                        <h4>🔔 Smart Insights</h4>
                        <p>Personalized volatility thresholds with asynchronous notification engines.</p>
                    </div>
                    <div className="feature-entry">
                        <h4>📊 Precision Tech</h4>
                        <p>Advanced trajectory mapping and historical delta analysis for professional asset monitoring.</p>
                    </div>
                </div>
                <div className="landing-footer-auth">
                    <div>
                        <Text fontSize="12px" color="var(--text-muted)" fontWeight="800">PROJECT LEAD</Text>
                        <Text fontSize="15px" color="#fff" fontWeight="700">LEVAN NATSVLISHVILI • © 2026</Text>
                    </div>
                    <div className="social-nav-landing">
                        <a href="https://github.com/levanatsvlishvili/CryptoTick" target="_blank" className="social-icon-link"><svg viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.298 24 12c0-6.627-5.373-12-12-12"/></svg> GITHUB</a>
                        <a href="https://www.linkedin.com/in/levan-natsvlishvili/" target="_blank" className="social-icon-link"><svg viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg> LINKEDIN</a>
                    </div>
                </div>
            </div>
            <div className="auth-form-side">
                <Authenticator loginMechanisms={['email']} formFields={authFormFields} />
            </div>
        </div>
    );
}

export default function App() {
    return (
        <ThemeProvider theme={theme}>
            <Authenticator.Provider>
                <AuthWrapper />
            </Authenticator.Provider>
        </ThemeProvider>
    );
}