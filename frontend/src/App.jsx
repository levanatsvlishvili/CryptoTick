import { useState, useEffect } from 'react';
import { Authenticator } from '@aws-amplify/ui-react';
import { fetchAuthSession } from 'aws-amplify/auth';
import '@aws-amplify/ui-react/styles.css';

const API_URL = "https://up5jue5r2l.execute-api.eu-central-1.amazonaws.com/prod/";

function Dashboard({ signOut, user }) {
    const [alerts, setAlerts] = useState([]);
    const [threshold, setThreshold] = useState(0.01);

const getAlerts = async () => {
    try {
        const session = await fetchAuthSession();
        if (!session.tokens) return;

        const token = session.tokens.idToken.toString();
        const response = await fetch(API_URL, {
            headers: { 'Authorization': token }
        });
        const data = await response.json();
        setAlerts(Array.isArray(data) ? data : []);
    } catch (err) {
        console.error("Error fetching alerts:", err);
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
    }, []);

    return (
        <div style={{ padding: '20px' }}>
            <h1>CryptoTick Dashboard</h1>
            <p>Welcome, {user.signInDetails?.loginId}</p>
            
            <div style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '10px' }}>
                <h3>Settings</h3>
                <input 
                    type="number" 
                    step="0.001" 
                    value={threshold} 
                    onChange={(e) => setThreshold(e.target.value)} 
                />
                <button onClick={saveSettings}>Save Threshold</button>
            </div>

            <button onClick={getAlerts}>Refresh Alerts</button>
            <button onClick={signOut} style={{ marginLeft: '10px' }}>Sign Out</button>

            <h2>Recent Alerts</h2>
            <ul>
                {alerts.map((alert, index) => (
                    <li key={index}>
                        {alert.symbol}: ${alert.price} ({new Date(parseInt(alert.timestamp)).toLocaleString()})
                    </li>
                ))}
            </ul>
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