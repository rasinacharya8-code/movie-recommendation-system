import React, { useState, useEffect } from 'react';
import api from '../api';
import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';

const SyncPage = () => {
    const [status, setStatus] = useState('idle'); // idle, fetching, syncing, complete, error
    const [logs, setLogs] = useState([]);
    const [progress, setProgress] = useState(0);
    const [stats, setStats] = useState({ total: 0, updated: 0, skipped: 0, errors: 0 });

    const addLog = (msg) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);

    const startSync = async () => {
        setStatus('fetching');
        setLogs([]);
        setStats({ total: 0, updated: 0, skipped: 0, errors: 0 });
        addLog("Starting sync process...");

        try {
            // 1. Fetch Local Data
            addLog("Fetching movies from Local API...");
            const res = await api.get('/movies/');
            const localMovies = res.data;
            addLog(`Fetched ${localMovies.length} movies from local database.`);

            // 2. Fetch Cloud Data
            setStatus('syncing');
            addLog("Fetching movies from Cloud (Firestore)...");
            const moviesRef = collection(db, 'movies');
            const snapshot = await getDocs(moviesRef);
            const cloudMovies = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            addLog(`Fetched ${cloudMovies.length} movies from cloud database.`);

            // Map content for faster lookup
            const cloudMap = new Map();
            cloudMovies.forEach(m => {
                if (m.title) cloudMap.set(m.title.toLowerCase(), m);
            });

            // 3. Sync Logic
            let updatedCount = 0;
            let errorCount = 0;
            let skippedCount = 0;
            const batchSize = 400; // Firestore batch limit is 500
            let batch = writeBatch(db);
            let batchCount = 0;

            for (let i = 0; i < localMovies.length; i++) {
                const local = localMovies[i];
                const key = local.title.toLowerCase();
                const cloud = cloudMap.get(key);

                if (cloud) {
                    // Update existing cloud record
                    const docRef = doc(db, 'movies', cloud.id);

                    // Prepare update specific fields
                    const updates = {};
                    let needsUpdate = false;

                    if (local.release_year && cloud.release_year !== local.release_year) {
                        updates.release_year = local.release_year;
                        needsUpdate = true;
                    }
                    // Also ensure release_date is cleaned up if it exists as a full string in cloud
                    // but we prefer year. Or just leave it, but ensure release_year is set.
                    // Actually, let's just force set release_year.

                    if (needsUpdate) {
                        batch.update(docRef, updates);
                        updatedCount++;
                        batchCount++;
                    } else {
                        skippedCount++;
                    }

                } else {
                    // Movie doesn't exist in cloud (optional: create it? user only asked for update)
                    // For now, let's just log it.
                    // addLog(`Skipping new movie ${local.title} (not in cloud)`);
                    skippedCount++;
                }

                if (batchCount >= batchSize) {
                    await batch.commit();
                    addLog(`Committed batch of ${batchCount} updates...`);
                    batch = writeBatch(db);
                    batchCount = 0;
                }

                setProgress(Math.round(((i + 1) / localMovies.length) * 100));
            }

            if (batchCount > 0) {
                await batch.commit();
                addLog(`Committed final batch of ${batchCount} updates.`);
            }

            setStats({ total: localMovies.length, updated: updatedCount, skipped: skippedCount, errors: errorCount });
            setStatus('complete');
            addLog("Sync complete!");

        } catch (err) {
            console.error(err);
            addLog(`Error: ${err.message}`);
            setStatus('error');
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', color: '#fff' }}>
            <h1>Cloud Database Sync Tool</h1>
            <p>This tool will fetch all movies from your local database (SQLite) and update the Release Year in the Cloud Database (Firestore).</p>

            <div style={{ margin: '2rem 0', padding: '1rem', background: '#333', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <strong>Status: {status.toUpperCase()}</strong>
                    <span>Progress: {progress}%</span>
                </div>

                {status === 'idle' && (
                    <button
                        onClick={startSync}
                        style={{
                            padding: '10px 20px',
                            background: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '1rem'
                        }}
                    >
                        Start Sync
                    </button>
                )}
            </div>

            {status === 'complete' && (
                <div style={{ padding: '1rem', background: '#28a74533', borderRadius: '8px', marginBottom: '1rem' }}>
                    <h3>Sync Results</h3>
                    <p>Total Processed: {stats.total}</p>
                    <p>Updated: {stats.updated}</p>
                    <p>Skipped (Already correct/Missing in Cloud): {stats.skipped}</p>
                    <p>Errors: {stats.errors}</p>
                </div>
            )}

            <div style={{ background: '#111', padding: '1rem', borderRadius: '4px', height: '300px', overflowY: 'auto', fontFamily: 'monospace' }}>
                {logs.map((log, i) => <div key={i}>{log}</div>)}
            </div>
        </div>
    );
};

export default SyncPage;
