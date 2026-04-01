import { useState, useEffect } from 'react';
import { Authenticator, View, Text, Heading } from '@aws-amplify/ui-react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import '@aws-amplify/ui-react/styles.css';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || "https://up5jue5r2l.execute-api.eu-central-1.amazonaws.com/prod/";

const SYMBOLS = [
    "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "ADAUSDT", "AVAXUSDT", "DOTUSDT", "DOGEUSDT", "LINKUSDT",
    "MATICUSDT", "SHIBUSDT", "LTCUSDT", "TRXUSDT", "BCHUSDT", "UNIUSDT", "NEARUSDT", "APTUSDT", "OPUSDT", "ARBUSDT"
];

function Dashboard({ signOut, user }) {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('ALL');
    const [threshold, setThreshold] = useState(0.001);
    const [selectedSymbols, setSelectedSymbols] = useState(["BTCUSDT", "ETHUSDT"]);
    const [toast, setToast] = useState(null);

    const getAlerts = async () => {
        try {
            const session = await fetchAuthSession();
            const token = session.tokens.idToken.toString();
            const response = await fetch(API_URL, { headers: { 'Authorization': token } });
            const data = await response.json();
            setAlerts(data);
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
                body: JSON.stringify({
                    threshold: parseFloat(threshold),
                    trackedSymbols: selectedSymbols.join(", ")
                })
            });
            setToast("CLOUD SYNC COMPLETE");
            setTimeout(() => setToast(null), 3000);
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        getAlerts();
        const interval = setInterval(getAlerts, 30000);
        return () => clearInterval(interval);
    }, []);

    const toggleSymbol = (sym) => {
        setSelectedSymbols(prev =>
            prev.includes(sym) ? prev.filter(s => s !== sym) : [...prev, sym]
        );
    };

    const adjustThreshold = (val) => {
        setThreshold(prev => {
            const newVal = (parseFloat(prev || 0) + val).toFixed(4);
            return newVal >= 0 ? newVal : 0;
        });
    };

    const filteredAlerts = activeTab === 'ALL'
        ? alerts
        : alerts.filter(a => a.symbol === activeTab);

    const chartData = [...filteredAlerts].reverse().map(a => ({
        time: new Date(parseInt(a.timestamp)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        price: parseFloat(a.price)
    }));

    if (loading) return <div className="loading-screen"><Text color="var(--text-muted)" letterSpacing="4px" fontSize="11px" fontWeight="900">NODE INITIALIZATION</Text></div>;

    return (
        <div className="app-layout">
            {toast && <div className="toast">{toast}</div>}

            <aside className="sidebar">
                <div className="sidebar-content">
                    <div className="sidebar-section">
                        <div className="user-box">
                            <div className="user-email-value">{user.signInDetails?.loginId}</div>
                            <button className="btn-logout" onClick={signOut}>LOG OUT</button>
                        </div>
                    </div>

                    <div className="sidebar-section">
                        <span className="sidebar-label">Alert Sensitivity</span>
                        <div className="threshold-control">
                            <button className="threshold-btn" onClick={() => adjustThreshold(-0.0001)}>−</button>
                            <input
                                type="number"
                                step="0.0001"
                                className="input-terminal"
                                value={threshold}
                                onChange={(e) => setThreshold(e.target.value)}
                            />
                            <button className="threshold-btn" onClick={() => adjustThreshold(0.0001)}>+</button>
                        </div>
                    </div>

                    <div className="sidebar-section">
                        <span className="sidebar-label">Watchlist Mapping</span>
                        <div className="symbol-grid">
                            {SYMBOLS.map(sym => (
                                <button
                                    key={sym}
                                    className={`symbol-btn ${selectedSymbols.includes(sym) ? 'active' : ''}`}
                                    onClick={() => toggleSymbol(sym)}
                                >
                                    {sym.replace('USDT', '')}
                                </button>
                            ))}
                        </div>
                        <button className="btn-primary" style={{ marginTop: '24px' }} onClick={saveSettings}>
                            APPLY CONFIG
                        </button>
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
                <header style={{ marginBottom: '30px' }}>
                    <Heading level={2} fontWeight={800} color="var(--accent)">CRYPTOTICK HUB</Heading>
                </header>

                <nav className="tab-nav">
                    <button className={`tab-link ${activeTab === 'ALL' ? 'active' : ''}`} onClick={() => setActiveTab('ALL')}>Aggregate</button>
                    {selectedSymbols.map(sym => (
                        <button key={sym} className={`tab-link ${activeTab === sym ? 'active' : ''}`} onClick={() => setActiveTab(sym)}>
                            {sym.replace('USDT', '')}
                        </button>
                    ))}
                </nav>

                <div className="card" style={{ height: '440px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <span style={{ fontWeight: 800, fontSize: '14px', color: '#fff' }}>TRAJECTORY: {activeTab}</span>
                        <Text color="var(--success)" fontSize="11px" fontWeight={800}>● LIVE TELEMETRY</Text>
                    </div>
                    <ResponsiveContainer width="100%" height="90%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
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
                        <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.01)' }}>
                            <th className="col-asset">Asset</th>
                            <th className="col-transition">Price Transition</th>
                            <th className="col-delta">Delta</th>
                            <th className="col-time">Timestamp</th>
                        </tr>
                        </thead>
                        <tbody>
                        {filteredAlerts.map((alert, index) => {
                            const diff = parseFloat(alert.price) - parseFloat(alert.oldPrice);
                            const pct = ((diff / parseFloat(alert.oldPrice)) * 100).toFixed(4);
                            return (
                                <tr key={index}>
                                    <td style={{ fontWeight: 800 }}>{alert.symbol.replace('USDT', '')}</td>
                                    <td>
                                        <span style={{ color: 'var(--text-muted)' }}>${parseFloat(alert.oldPrice).toLocaleString()}</span>
                                        <span style={{ margin: '0 12px', color: 'var(--accent)', fontWeight: 900 }}>➔</span>
                                        <span style={{ fontWeight: 600 }}>${parseFloat(alert.price).toLocaleString()}</span>
                                    </td>
                                    <td style={{ color: diff >= 0 ? 'var(--success)' : 'var(--error)', fontWeight: 800 }}>
                                        {diff >= 0 ? '▲' : '▼'} {Math.abs(pct)}%
                                    </td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{new Date(parseInt(alert.timestamp)).toLocaleTimeString()}</td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
}

export default function App() {
    return (
        <Authenticator components={{
            Header() {
                return (
                    <View textAlign="center" padding="xl">
                        <Heading level={2} color="var(--accent)" fontWeight={800}>CRYPTOTICK</Heading>
                        <Text color="var(--text-muted)" fontSize="14px">Secure Market Intelligence Terminal</Text>
                    </View>
                );
            }
        }}>
            {({ signOut, user }) => <Dashboard signOut={signOut} user={user} />}
        </Authenticator>
    );
}