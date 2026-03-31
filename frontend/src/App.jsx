import { useState, useEffect } from 'react';
import { Authenticator } from '@aws-amplify/ui-react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import '@aws-amplify/ui-react/styles.css';

const API_URL = import.meta.env.VITE_API_URL || "https://up5jue5r2l.execute-api.eu-central-1.amazonaws.com/prod/";

const AVAILABLE_SYMBOLS = [
    "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "ADAUSDT", "AVAXUSDT", "DOTUSDT", "DOGEUSDT", "LINKUSDT",
    "MATICUSDT", "SHIBUSDT", "LTCUSDT", "TRXUSDT", "BCHUSDT", "UNIUSDT", "NEARUSDT", "APTUSDT", "OPUSDT", "ARBUSDT"
];

function Dashboard({ signOut, user }) {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [threshold, setThreshold] = useState(0.001);
    const [selectedSymbols, setSelectedSymbols] = useState(["BTCUSDT", "ETHUSDT"]);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false }), 4000);
    };

    const getAlerts = async () => {
        try {
            const session = await fetchAuthSession();
            const token = session.tokens.idToken.toString();
            const response = await fetch(API_URL, { headers: { 'Authorization': token } });
            const data = await response.json();
            setAlerts(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
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
            showToast("Success! Your preferences are synchronized with the cloud.");
        } catch (err) {
            showToast("Error updating preferences", "error");
        }
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

    const chartData = alerts
        .filter(a => selectedSymbols.includes(a.symbol))
        .map(a => ({
            time: new Date(parseInt(a.timestamp)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            price: parseFloat(a.price),
            symbol: a.symbol,
            rawTime: parseInt(a.timestamp)
        }))
        .sort((a, b) => a.rawTime - b.rawTime);

    if (loading) {
        return (
            <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', background: '#fff' }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="spinner"></div>
                    <p style={{ marginTop: '20px', color: '#666', letterSpacing: '1px' }}>INITIALIZING ENGINE...</p>
                </div>
                <style>{`.spinner { width: 50px; height: 50px; border: 3px solid #f3f3f3; border-top: 3px solid #2196f3; border-radius: 50%; animation: spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite; } @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto', background: '#fcfcfc', minHeight: '100vh' }}>
            {toast.show && (
                <div style={{ position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)', background: toast.type === 'success' ? '#2e7d32' : '#c62828', color: '#fff', padding: '12px 30px', borderRadius: '50px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', zIndex: 1000, fontWeight: 600, animation: 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
                    {toast.message}
                    <style>{`@keyframes popIn { 0% { bottom: -50px; opacity: 0; } 100% { bottom: 30px; opacity: 1; } }`}</style>
                </div>
            )}

            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>CRYPTOTICK <span style={{ color: '#2196f3' }}>HUB</span></h1>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.9rem', color: '#888' }}>{user.signInDetails?.loginId}</span>
                    <button onClick={signOut} style={{ padding: '8px 20px', border: '1px solid #eee', background: '#fff', borderRadius: '8px', cursor: 'pointer' }}>LOGOUT</button>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '40px' }}>
                <aside style={{ background: '#fff', padding: '30px', borderRadius: '24px', border: '1px solid #f0f0f0', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '25px' }}>Terminal Config</h3>

                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#bbb', display: 'block', marginBottom: '10px' }}>ALERT THRESHOLD (%)</label>
                    <input type="number" step="0.0001" value={threshold} onChange={(e) => setThreshold(e.target.value)} style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #eee', marginBottom: '30px', fontSize: '1rem' }} />

                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#bbb', display: 'block', marginBottom: '15px' }}>ACTIVE WATCHLIST</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                        {AVAILABLE_SYMBOLS.map(sym => (
                            <button key={sym} onClick={() => toggleSymbol(sym)} style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', background: selectedSymbols.includes(sym) ? '#2196f3' : '#f5f5f5', color: selectedSymbols.includes(sym) ? '#fff' : '#666', fontSize: '0.8rem', cursor: 'pointer', transition: '0.2s' }}>
                                {sym.replace("USDT", "")}
                            </button>
                        ))}
                    </div>

                    <button onClick={saveSettings} style={{ width: '100%', padding: '16px', background: '#000', color: '#fff', border: 'none', borderRadius: '14px', marginTop: '35px', fontWeight: 700, cursor: 'pointer', letterSpacing: '1px' }}>SYNC TO CLOUD</button>
                </aside>

                <main style={{ background: '#fff', padding: '30px', borderRadius: '24px', border: '1px solid #f0f0f0', minHeight: '600px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                        <h3 style={{ margin: 0 }}>Market Trajectory</h3>
                        <div style={{ fontSize: '0.8rem', color: '#4caf50', fontWeight: 700 }}>● LIVE FEED ACTIVE</div>
                    </div>
                    <ResponsiveContainer width="100%" height={500}>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#f9f9f9" />
                            <XAxis dataKey="time" fontSize={10} axisLine={false} tickLine={false} />
                            <YAxis domain={['auto', 'auto']} fontSize={10} axisLine={false} tickLine={false} orientation="right" />
                            <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                            <Legend verticalAlign="top" align="right" height={36}/>
                            <Line name="Price Movement" type="monotone" dataKey="price" stroke="#2196f3" strokeWidth={4} dot={{ r: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} animationDuration={1500} />
                        </LineChart>
                    </ResponsiveContainer>
                </main>
            </div>

            <section style={{ marginTop: '60px' }}>
                <h3 style={{ marginBottom: '30px', letterSpacing: '-0.5px' }}>Historical Activity Stream</h3>
                <div style={{ background: '#fff', borderRadius: '24px', border: '1px solid #f0f0f0', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                        <tr style={{ background: '#fafafa', textAlign: 'left' }}>
                            <th style={{ padding: '25px', fontSize: '0.7rem', color: '#aaa' }}>ASSET</th>
                            <th style={{ padding: '25px', fontSize: '0.7rem', color: '#aaa' }}>DELTA SHIFT</th>
                            <th style={{ padding: '25px', fontSize: '0.7rem', color: '#aaa' }}>VALUATION</th>
                            <th style={{ padding: '25px', fontSize: '0.7rem', color: '#aaa' }}>UTC TIMESTAMP</th>
                        </tr>
                        </thead>
                        <tbody>
                        {alerts.map((alert, index) => {
                            const diff = parseFloat(alert.price) - parseFloat(alert.oldPrice);
                            const pct = ((diff / parseFloat(alert.oldPrice)) * 100).toFixed(4);
                            return (
                                <tr key={index} style={{ borderBottom: '1px solid #f9f9f9' }}>
                                    <td style={{ padding: '20px 25px' }}><strong>{alert.symbol}</strong></td>
                                    <td style={{ padding: '20px 25px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: diff >= 0 ? '#4caf50' : '#f44336', fontWeight: 800 }}>
                                            {diff >= 0 ? '▲' : '▼'} {pct}%
                                        </div>
                                    </td>
                                    <td style={{ padding: '20px 25px', fontWeight: 600 }}>${parseFloat(alert.price).toLocaleString()}</td>
                                    <td style={{ padding: '20px 25px', color: '#ccc', fontSize: '0.8rem' }}>{new Date(parseInt(alert.timestamp)).toLocaleString()}</td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
            </section>

            <footer style={{ marginTop: '80px', padding: '40px 0', borderTop: '1px solid #f0f0f0', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', marginBottom: '20px' }}>
                    <a href="https://github.com/levanatsvlishvili/CryptoTick" target="_blank" style={{ color: '#000', textDecoration: 'none', fontWeight: 700, fontSize: '0.8rem' }}>GITHUB</a>
                    <a href="https://www.linkedin.com/in/levan-natsvlishvili/" target="_blank" style={{ color: '#000', textDecoration: 'none', fontWeight: 700, fontSize: '0.8rem' }}>LINKEDIN</a>
                </div>
                <p style={{ color: '#bbb', fontSize: '0.75rem' }}>ENGINEERED BY LEVAN NATSVLISHVILI • 2026</p>
            </footer>
        </div>
    );
}

export default function App() {
    return (
        <Authenticator>
            {({ signOut, user }) => <Dashboard signOut={signOut} user={user} />}
        </Authenticator>
    );
}