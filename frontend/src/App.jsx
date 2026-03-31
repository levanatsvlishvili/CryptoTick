import { useState, useEffect } from 'react';
import { Authenticator } from '@aws-amplify/ui-react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import '@aws-amplify/ui-react/styles.css';

const API_URL = import.meta.env.VITE_API_URL || "https://up5jue5r2l.execute-api.eu-central-1.amazonaws.com/prod/";

function Dashboard({ signOut, user }) {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [threshold, setThreshold] = useState(0.01);
    const [symbols, setSymbols] = useState("BTCUSDT, ETHUSDT");

    const getAlerts = async () => {
        try {
            const session = await fetchAuthSession();
            const token = session.tokens.idToken.toString();
            const response = await fetch(API_URL, { headers: { 'Authorization': token } });
            const data = await response.json();
            setAlerts(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    const saveSettings = async () => {
        const session = await fetchAuthSession();
        const token = session.tokens.idToken.toString();
        await fetch(API_URL, {
            method: 'POST',
            headers: { 'Authorization': token, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                threshold: parseFloat(threshold),
                trackedSymbols: symbols
            })
        });
        alert("Preferences Saved!");
    };

    useEffect(() => {
        getAlerts();
        const interval = setInterval(getAlerts, 30000);
        return () => clearInterval(interval);
    }, []);

    const chartData = [...alerts].reverse().map(a => ({
        time: new Date(parseInt(a.timestamp)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        price: parseFloat(a.price),
        symbol: a.symbol
    }));

    if (loading) {
        return (
            <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
                <div className="spinner" style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #3498db', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 2s linear infinite' }}></div>
                <p style={{ marginTop: '10px', fontFamily: 'Arial' }}>Synchronizing with Binance...</p>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px', maxWidth: '1100px', margin: '0 auto', fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', color: '#333' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f4f4f4', paddingBottom: '15px' }}>
                <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>🚀 CryptoTick <span style={{ fontSize: '0.5em', background: '#e1f5fe', color: '#01579b', padding: '4px 8px', borderRadius: '4px' }}>PRO</span></h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ fontSize: '0.9em', color: '#666' }}>{user.signInDetails?.loginId}</span>
                    <button onClick={signOut} style={{ padding: '8px 16px', background: '#ff5252', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Sign Out</button>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '25px', marginTop: '25px' }}>
                <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #eee' }}>
                    <h3 style={{ marginTop: 0 }}>Configuration</h3>

                    <label style={{ fontSize: '0.85em', fontWeight: 'bold' }}>Volatility Threshold</label>
                    <input type="number" step="0.001" value={threshold} onChange={(e) => setThreshold(e.target.value)} style={{ width: '90%', padding: '10px', margin: '8px 0 20px', borderRadius: '6px', border: '1px solid #ddd' }} />

                    <label style={{ fontSize: '0.85em', fontWeight: 'bold' }}>Tracked Symbols (USDT)</label>
                    <textarea value={symbols} onChange={(e) => setSymbols(e.target.value)} placeholder="BTCUSDT, ETHUSDT..." style={{ width: '90%', height: '80px', padding: '10px', margin: '8px 0', borderRadius: '6px', border: '1px solid #ddd', fontFamily: 'inherit' }} />

                    <button onClick={saveSettings} style={{ width: '100%', padding: '12px', background: '#4caf50', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>Update Preferences</button>
                </div>

                <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #eee', height: '450px' }}>
                    <h3 style={{ marginTop: 0 }}>Price Trend: {alerts[0]?.symbol || 'No Data'}</h3>
                    <ResponsiveContainer width="100%" height="90%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis dataKey="time" fontSize={12} tickMargin={10} />
                            <YAxis domain={['auto', 'auto']} fontSize={12} />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                            <Line type="monotone" dataKey="price" stroke="#2196f3" strokeWidth={3} dot={{ r: 4, fill: '#2196f3' }} activeDot={{ r: 7 }} animationDuration={1000} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <h2 style={{ marginTop: '40px', borderLeft: '4px solid #2196f3', paddingLeft: '15px' }}>Activity Log</h2>
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#fafafa' }}>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
                        <th style={{ padding: '15px' }}>Symbol</th>
                        <th>Change Details</th>
                        <th>Current Price</th>
                        <th>Time</th>
                    </tr>
                    </thead>
                    <tbody>
                    {alerts.map((alert, index) => {
                        const diff = parseFloat(alert.price) - parseFloat(alert.oldPrice);
                        const pct = ((diff / parseFloat(alert.oldPrice)) * 100).toFixed(2);
                        return (
                            <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '15px' }}><strong>{alert.symbol}</strong></td>
                                <td>
                                        <span style={{ color: diff >= 0 ? '#4caf50' : '#f44336', fontWeight: 'bold' }}>
                                            ${parseFloat(alert.oldPrice).toFixed(2)} ➔ ${parseFloat(alert.price).toFixed(2)} ({pct}%)
                                        </span>
                                </td>
                                <td>${parseFloat(alert.price).toFixed(2)}</td>
                                <td style={{ color: '#888', fontSize: '0.9em' }}>{new Date(parseInt(alert.timestamp)).toLocaleString()}</td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>

            <footer style={{ marginTop: '60px', padding: '30px 0', borderTop: '1px solid #eee', textAlign: 'center', color: '#888', fontSize: '0.9em' }}>
                <p>Developed by <strong>Levan Natsvlishvili</strong> • 2026</p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '10px' }}>
                    <a href="https://github.com/your-username" target="_blank" style={{ color: '#2196f3', textDecoration: 'none' }}>GitHub</a>
                    <a href="https://linkedin.com/in/your-username" target="_blank" style={{ color: '#2196f3', textDecoration: 'none' }}>LinkedIn</a>
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