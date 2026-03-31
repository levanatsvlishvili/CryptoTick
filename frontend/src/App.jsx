import { useState, useEffect } from 'react';
import { Authenticator } from '@aws-amplify/ui-react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import '@aws-amplify/ui-react/styles.css';

const API_URL = import.meta.env.VITE_API_URL || "https://up5jue5r2l.execute-api.eu-central-1.amazonaws.com/prod/";

function Dashboard({ signOut, user }) {
    const [alerts, setAlerts] = useState([]);
    const [threshold, setThreshold] = useState(0.01);

    const getAlerts = async () => {
        try {
            const session = await fetchAuthSession();
            const token = session.tokens.idToken.toString();

            const response = await fetch(API_URL, {
                headers: { 'Authorization': token }
            });
            const data = await response.json();
            setAlerts(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to fetch alerts", err);
        }
    };

    const saveSettings = async () => {
        const session = await fetchAuthSession();
        const token = session.tokens.idToken.toString();

        await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ threshold: parseFloat(threshold) })
        });
        alert("Settings Saved!");
    };

    useEffect(() => {
        getAlerts();
        const interval = setInterval(getAlerts, 30000);
        return () => clearInterval(interval);
    }, []);

    const chartData = alerts
        .map(a => ({
            time: new Date(parseInt(a.timestamp)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            price: parseFloat(a.price),
            symbol: a.symbol
        }))
        .reverse();

    return (
        <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'Arial' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1>🚀 CryptoTick</h1>
                <button onClick={signOut} style={{ backgroundColor: '#ff4d4d', color: 'white', border: 'none', padding: '10px', borderRadius: '5px' }}>Sign Out</button>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginTop: '20px' }}>
                {}
                <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '10px', backgroundColor: '#f9f9f9' }}>
                    <h3>Alert Settings</h3>
                    <label>Volatility Threshold (e.g. 0.01 for 1%):</label>
                    <input
                        type="number"
                        step="0.001"
                        value={threshold}
                        onChange={(e) => setThreshold(e.target.value)}
                        style={{ width: '100%', padding: '10px', margin: '10px 0' }}
                    />
                    <button onClick={saveSettings} style={{ width: '100%', padding: '10px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px' }}>
                        Save Preferences
                    </button>
                </div>

                {}
                <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '10px', height: '400px' }}>
                    <h3>Live Price Movement (Last Alerts)</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="time" />
                            <YAxis domain={['auto', 'auto']} />
                            <Tooltip />
                            <Line type="monotone" dataKey="price" stroke="#8884d8" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <h2 style={{ marginTop: '40px' }}>Recent Activity Log</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                    <th style={{ padding: '10px' }}>Symbol</th>
                    <th>Price</th>
                    <th>Time</th>
                </tr>
                </thead>
                <tbody>
                {alerts.map((alert, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '10px' }}><b>{alert.symbol}</b></td>
                        <td>${parseFloat(alert.price).toFixed(2)}</td>
                        <td>{new Date(parseInt(alert.timestamp)).toLocaleString()}</td>
                    </tr>
                ))}
                </tbody>
            </table>
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