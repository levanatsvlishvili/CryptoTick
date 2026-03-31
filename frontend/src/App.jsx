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
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
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
            showToast("Settings synchronized successfully!");
        } catch (err) {
            showToast("Failed to update settings", "error");
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
            <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', background: '#f8f9fa' }}>
                <div className="spinner"></div>
                <p style={{ marginTop: '20px', fontFamily: 'Inter, sans-serif', color: '#666' }}>Fetching Market Data...</p>
                <style>{`.spinner { border: 4px solid rgba(0,0,0,0.1); border-top: 4px solid #2196f3; borderRadius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; } @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif', backgroundColor: '#fdfdfd' }}>
            {toast.show && (
                <div style={{ position: 'fixed', top: '20px', right: '20px', padding: '15px 25px', background: toast.type === 'success' ? '#4caf50' : '#f44336', color: '#fff', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000, animation: 'slideIn 0.3s ease-out' }}>
                    {toast.message}
                    <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
                </div>
            )}

            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '2rem' }}>⚡</span>
                    <h1 style={{ margin: 0, letterSpacing: '-1px' }}>CryptoTick <span style={{ color: '#2196f3' }}>Analytics</span></h1>
                </div>
                <button onClick={signOut} style={{ padding: '10px 20px', background: '#fff', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Sign Out</button>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '30px' }}>
                <aside style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ background: '#fff', padding: '25px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid #eee' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Control Panel</h3>

                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#888', marginBottom: '8px' }}>VOLATILITY THRESHOLD (%)</label>
                        <input type="number" step="0.0001" value={threshold} onChange={(e) => setThreshold(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '25px', borderRadius: '8px', border: '1px solid #eee', boxSizing: 'border-box' }} />

                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#888', marginBottom: '12px' }}>WATCHLIST (SELECT 20)</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '250px', overflowY: 'auto', padding: '5px' }}>
                            {AVAILABLE_SYMBOLS.map(sym => (
                                <button key={sym} onClick={() => toggleSymbol(sym)} style={{ padding: '6px 12px', borderRadius: '20px', border: '1px solid', borderColor: selectedSymbols.includes(sym) ? '#2196f3' : '#eee', background: selectedSymbols.includes(sym) ? '#e3f2fd' : '#fff', color: selectedSymbols.includes(sym) ? '#2196f3' : '#666', fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                                    {sym.replace("USDT", "")}
                                </button>
                            ))}
                        </div>

                        <button onClick={saveSettings} style={{ width: '100%', padding: '14px', background: '#2196f3', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', marginTop: '25px', boxShadow: '0 4px 10px rgba(33, 150, 243, 0.3)' }}>Sync Preferences</button>
                    </div>
                </aside>

                <main style={{ background: '#fff', padding: '25px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid #eee', minHeight: '500px' }}>
                    <h3 style={{ marginTop: 0 }}>Price Volatility Index</h3>
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={400}>
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                                <XAxis dataKey="time" fontSize={11} tickMargin={10} />
                                <YAxis domain={['auto', 'auto']} fontSize={11} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 5px 15px rgba(0,0,0,0.1)' }} />
                                <Legend />
                                <Line name="Market Price" type="stepAfter" dataKey="price" stroke="#2196f3" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{ height: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#ccc', flexDirection: 'column' }}>
                            <span style={{ fontSize: '3rem', marginBottom: '10px' }}>📊</span>
                            <p>No volatility events detected for selected symbols yet.</p>
                        </div>
                    )}
                </main>
            </div>

            <section style={{ marginTop: '40px' }}>
                <h3 style={{ marginBottom: '20px' }}>Live Activity Stream</h3>
                <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #eee', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#fcfcfc' }}>
                        <tr style={{ textAlign: 'left' }}>
                            <th style={{ padding: '20px', color: '#888', fontSize: '0.8rem' }}>ASSET</th>
                            <th style={{ padding: '20px', color: '#888', fontSize: '0.8rem' }}>VOLATILITY SHIFT</th>
                            <th style={{ padding: '20px', color: '#888', fontSize: '0.8rem' }}>CURRENT</th>
                            <th style={{ padding: '20px', color: '#888', fontSize: '0.8rem' }}>TIMESTAMP</th>
                        </tr>
                        </thead>
                        <tbody>
                        {alerts.map((alert, index) => {
                            const diff = parseFloat(alert.price) - parseFloat(alert.oldPrice);
                            const pct = ((diff / parseFloat(alert.oldPrice)) * 100).toFixed(3);
                            return (
                                <tr key={index} style={{ borderTop: '1px solid #eee' }}>
                                    <td style={{ padding: '20px' }}><strong>{alert.symbol}</strong></td>
                                    <td style={{ padding: '20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: diff >= 0 ? '#4caf50' : '#f44336' }}>
                                            <span>{diff >= 0 ? '↗' : '↘'}</span>
                                            <span style={{ fontWeight: 700 }}>{pct}%</span>
                                            <span style={{ fontSize: '0.8rem', color: '#aaa' }}>(${parseFloat(alert.oldPrice).toFixed(2)})</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '20px', fontWeight: 600 }}>${parseFloat(alert.price).toLocaleString()}</td>
                                    <td style={{ padding: '20px', color: '#aaa', fontSize: '0.85rem' }}>{new Date(parseInt(alert.timestamp)).toLocaleString()}</td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
            </section>

            <footer style={{ marginTop: '60px', padding: '40px 0', borderTop: '1px solid #eee', textAlign: 'center' }}>
                <p style={{ margin: 0, color: '#999', fontSize: '0.9rem' }}>Built with AWS Serverless Architecture by <strong>Levan Natsvlishvili</strong></p>
                <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'center', gap: '25px' }}>
                    <a href="https://github.com/levanatsvlishvili/CryptoTick" style={{ color: '#2196f3', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>GitHub</a>
                    <a href="https://www.linkedin.com/in/levan-natsvlishvili/" style={{ color: '#2196f3', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>LinkedIn</a>
                </div>
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