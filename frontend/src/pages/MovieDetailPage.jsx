import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, orderBy } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';

const MovieDetailPage = () => {
    const { id } = useParams();
    const { colors } = useTheme();
    const [movie, setMovie] = useState(null);
    const [score, setScore] = useState(5);
    const [review, setReview] = useState('');
    const [reviews, setReviews] = useState([]);
    const [loadingReviews, setLoadingReviews] = useState(true);
    const [watchProgress, setWatchProgress] = useState(0);
    const [isWatching, setIsWatching] = useState(false);
    const [verifiedWatcher, setVerifiedWatcher] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchMovie();
        fetchWatchProgress();
    }, [id]);

    useEffect(() => {
        let interval;
        if (isWatching && movie && movie.duration > 0) {
            const user = auth.currentUser;
            if (!user) return;

            if (!user.uid || !id) return;

            // Timestamp-based tracking
            const storageKey = `watch_start_${user.uid}_${id}`;
            let startTime = localStorage.getItem(storageKey);

            if (!startTime) {
                console.log("Starting new watch timer for:", storageKey);
                startTime = Date.now().toString();
                localStorage.setItem(storageKey, startTime);
            } else {
                console.log("Resuming watch timer for:", storageKey, "Started at:", new Date(parseInt(startTime)).toLocaleTimeString());
            }

            const updateTracking = () => {
                const now = Date.now();
                const elapsedSeconds = (now - parseInt(startTime)) / 1000;

                const progress = (elapsedSeconds / (movie.duration * 60)) * 100;

                setWatchProgress(Math.min(progress, 100));

                if (progress >= 90 && !verifiedWatcher) {
                    setVerifiedWatcher(true);
                    // Sync verification to Cloud
                    const historyRef = collection(db, 'watchHistory');
                    addDoc(historyRef, {
                        userId: user.uid,
                        movieId: id,
                        watchedAt: serverTimestamp(),
                        isVerified: true
                    }).then(() => console.log("Verification synced to Cloud"))
                        .catch(err => console.error("Failed to sync verification:", err));
                }
            };

            interval = setInterval(updateTracking, 1000);
            updateTracking(); // Immediate check
        }
        return () => clearInterval(interval);
    }, [isWatching, movie?.id, movie?.duration, id, auth.currentUser?.uid, verifiedWatcher]);

    useEffect(() => {
        if (!id) return;
        // Real-time listener for reviews
        const q = query(
            collection(db, 'reviews'),
            where('movieId', '==', id),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedReviews = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setReviews(fetchedReviews);
            setLoadingReviews(false);

            // Auto-verify if user already has a review for this movie
            const user = auth.currentUser;
            if (user) {
                const userHasReviewed = fetchedReviews.some(r => r.userId === user.uid);
                if (userHasReviewed) {
                    setVerifiedWatcher(true);
                    console.log("User already reviewed this movie - auto-verified!");
                }
            }
        }, (error) => {
            console.error("Error fetching reviews: ", error);
            setLoadingReviews(false);
        });

        return () => unsubscribe();
    }, [id]);

    const fetchMovie = async () => {
        try {
            const res = await api.get(`/movies/${id}/`);
            setMovie(res.data);
        } catch (err) {
            console.error("Failed to fetch movie details", err);
        }
    };

    const fetchWatchProgress = async () => {
        const user = auth.currentUser;
        if (!user) return;

        // 1. Check local storage (current device progress)
        const storageKey = `watch_seconds_${user.uid}_${id}`;
        const savedSeconds = localStorage.getItem(storageKey);
        if (savedSeconds) {
            // Guard: movie may not be loaded yet when this runs
            const durationMins = (movie && movie.duration) ? movie.duration : 1;
            const seconds = parseFloat(savedSeconds);
            const progress = (seconds / (durationMins * 60)) * 100;
            setWatchProgress(Math.min(progress, 100));
            if (progress >= 90) {
                setVerifiedWatcher(true);
                return; // Already verified locally
            }
        }

        // 2. Check Cloud (cross-device verification)
        try {
            const { getDocs, query, where, collection } = await import('firebase/firestore');
            const q = query(
                collection(db, 'watchHistory'),
                where('userId', '==', user.uid),
                where('movieId', '==', id)
            );
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                setVerifiedWatcher(true);
                console.log("Verified via Cloud History!");
            }
        } catch (err) {
            console.error("Error checking cloud history:", err);
        }
    };

    const submitRating = async () => {
        const user = auth.currentUser;
        if (!user) {
            alert('Please login to submit a review.');
            return;
        }

        if (!review.trim()) {
            alert('Please write a review.');
            return;
        }

        setSubmitting(true);

        try {
            // 1. Save to Django
            console.log("Attempting Django submission...");
            try {
                const response = await api.post(`/movies/${id}/rate_movie/`, {
                    rating: Number(score),
                    review_text: review,
                    user_email: user.email,
                    user_uid: user.uid,
                    is_verified: verifiedWatcher
                });
                console.log("Django submission successful:", response.data);
            } catch (apiErr) {
                console.error("Django API Error:", apiErr);
                console.error("Error response:", apiErr.response?.data);
                const errorMsg = apiErr.response?.data?.error || 'Submission failed.';
                alert(`❌ ${errorMsg}`);
                setSubmitting(false);
                return;
            }

            // 2. Save to Firebase
            console.log("Attempting Firebase submission...");
            await addDoc(collection(db, 'reviews'), {
                movieId: id,
                userId: user.uid,
                userName: user.displayName || user.email,
                rating: Number(score),
                review: review,
                reviewText: review,
                createdAt: serverTimestamp(),
                isVerified: verifiedWatcher
            });
            console.log("Firebase submission successful");

            setReview('');
            alert('Review submitted successfully!');
        } catch (err) {
            console.error("Submission error:", err);
            alert('Failed to submit review. Check your connection.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleWatchClick = async () => {
        setIsWatching(true);
        console.log("Watch tracking started for detail page");
    };

    if (!movie) return <div style={{ color: colors.text, padding: '20px' }}>Loading...</div>;

    // Theme-aware styles (replaces old hardcoded dark-only styles)
    const dynStyles = {
        container: { padding: '40px', maxWidth: '1000px', margin: '0 auto', color: colors.text },
        header: { display: 'flex', gap: '30px', flexWrap: 'wrap', marginBottom: '30px' },
        poster: { width: '300px', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' },
        info: { flex: 1, minWidth: '300px' },
        title: { fontSize: '2.5rem', marginBottom: '10px', color: colors.text },
        meta: { color: colors.textSecondary, marginBottom: '20px' },
        desc: { lineHeight: '1.6', fontSize: '1.1rem', color: colors.textSecondary },
        castGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
            gap: '1rem',
            marginTop: '15px'
        },
        castMember: {
            textAlign: 'center',
            fontSize: '0.9rem',
            background: colors.cardBg,
            padding: '10px',
            borderRadius: '8px',
            color: colors.textSecondary,
            border: `1px solid ${colors.border}`,
        },
        watchBtn: {
            display: 'inline-flex',
            alignItems: 'center',
            padding: '12px 25px',
            background: 'linear-gradient(90deg, #ff00cc, #333399)',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '50px',
            marginTop: '20px',
            fontWeight: 'bold',
            fontSize: '1.1rem',
            boxShadow: '0 4px 15px rgba(255, 0, 204, 0.4)',
            transition: 'transform 0.2s ease',
        },
        divider: { borderColor: colors.border, margin: '40px 0' },
        reviewSection: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px' },
        sectionTitle: { gridColumn: '1 / -1', fontSize: '1.8rem', borderLeft: '4px solid #ff00cc', paddingLeft: '15px', color: colors.text },
        formCard: { background: colors.cardBg, padding: '25px', borderRadius: '12px', height: 'fit-content', border: `1px solid ${colors.border}` },
        inputGroup: { marginBottom: '15px' },
        select: { width: '100%', padding: '10px', background: colors.inputBg, border: `1px solid ${colors.border}`, color: colors.text, borderRadius: '5px' },
        textarea: { width: '100%', padding: '15px', background: colors.inputBg, border: `1px solid ${colors.border}`, color: colors.text, borderRadius: '5px', marginBottom: '15px', resize: 'vertical' },
        submitBtn: { width: '100%', padding: '12px', background: 'linear-gradient(45deg, #ff00cc, #333399)', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' },
        reviewsList: { display: 'flex', flexDirection: 'column', gap: '15px' },
        reviewCard: { background: colors.cardBg, padding: '15px', borderRadius: '8px', borderLeft: `3px solid ${colors.accentSecondary}`, border: `1px solid ${colors.border}` },
        reviewHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px' },
        scoreBadge: { background: '#ff00cc', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' },
        reviewText: { color: colors.textSecondary, margin: 0 },
    };

    return (
        <div style={dynStyles.container}>
            <div style={dynStyles.header}>
                <img src={movie.poster_url} alt={movie.title} style={dynStyles.poster} loading="lazy" />
                <div style={dynStyles.info}>
                    <h1 style={dynStyles.title}>{movie.title}</h1>
                    <p style={dynStyles.meta}>Release Year: {movie.release_year || (movie.release_date && movie.release_date.split('-')[0]) || 'N/A'}</p>
                    <p style={{
                        ...dynStyles.meta,
                        marginTop: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <span style={{ fontSize: '1.1rem' }}>⏱️</span>
                        Duration: {movie.duration || 'N/A'} minutes
                    </p>

                    {/* Official Rating Display */}
                    <div style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            background: 'rgba(255, 193, 7, 0.2)',
                            padding: '6px 15px',
                            borderRadius: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontWeight: 'bold',
                            border: '1px solid #ffc107'
                        }}>
                            <span style={{ color: '#ffc107' }}>★</span>
                            <span style={{ fontSize: '1.2rem' }}>
                                {reviews.length > 0
                                    ? (reviews.reduce((acc, r) => acc + Number(r.rating || r.score || 0), 0) / reviews.length).toFixed(1)
                                    : (movie.average_rating || '0.0')}
                            </span>
                            <span style={{ fontSize: '0.8rem', opacity: 0.7, fontWeight: 'normal' }}>
                                ({reviews.length} Ratings)
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Cast Section */}
            <div style={{ marginBottom: '30px' }}>
                <h3 style={dynStyles.sectionTitle}>Cast</h3>
                <div style={dynStyles.castGrid}>
                    {movie.cast ? (
                        Array.isArray(movie.cast)
                            ? movie.cast.slice(0, 6).map((actor, idx) => (
                                <div key={idx} style={dynStyles.castMember}>{actor.trim()}</div>
                            ))
                            : movie.cast.split(',').slice(0, 6).map((actor, idx) => (
                                <div key={idx} style={dynStyles.castMember}>{actor.trim()}</div>
                            ))
                    ) : <p style={dynStyles.desc}>Cast information not available.</p>}
                </div>
            </div>

            <div style={{ textAlign: 'center', margin: '40px 0' }}>
                <a
                    href={movie.watch_url || `https://www.google.com/search?q=${encodeURIComponent(movie.title + " watch online streaming")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        ...dynStyles.watchBtn,
                        animation: isWatching ? 'pulse 2s infinite' : 'none'
                    }}
                    onClick={handleWatchClick}
                >
                    <span style={{ marginRight: '8px' }}>▶️</span>
                    {movie.watch_url ? 'Watch Movie Now' : 'Find Streaming Options'}
                </a>
            </div>

            <hr style={dynStyles.divider} />

            <div style={dynStyles.reviewSection}>
                <h3 style={dynStyles.sectionTitle}>Reviews &amp; Ratings</h3>

                <div style={dynStyles.formCard}>
                    <h4 style={{ margin: '0 0 10px 0', color: colors.text }}>Rate this Movie</h4>
                    <div style={dynStyles.inputGroup}>
                        <label style={{ display: 'block', marginBottom: '5px', color: colors.text }}>Score:</label>
                        <select
                            value={score}
                            onChange={e => setScore(e.target.value)}
                            style={dynStyles.select}
                        >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </div>
                    <textarea
                        placeholder={verifiedWatcher ? "Write your review here..." : "Review locked until 90% completion."}
                        value={review}
                        onChange={e => setReview(e.target.value)}
                        rows={4}
                        style={{
                            ...dynStyles.textarea,
                            opacity: verifiedWatcher ? 1 : 0.6,
                            cursor: verifiedWatcher ? 'text' : 'not-allowed'
                        }}
                        disabled={!verifiedWatcher}
                    />
                    {!verifiedWatcher && (
                        <div style={{
                            background: 'rgba(255, 193, 7, 0.1)',
                            padding: '10px',
                            borderRadius: '8px',
                            marginBottom: '15px',
                            fontSize: '0.85rem',
                            color: '#ffc107',
                            border: '1px solid rgba(255, 193, 7, 0.3)'
                        }}>
                            ⚠️ Review Locked: You must watch at least 90% of this movie to submit a review. Current progress: {watchProgress.toFixed(1)}%.
                            {isWatching && (
                                <div style={{ marginTop: '5px', color: '#4caf50', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                    ● Tracking active. Please keep the movie open...
                                </div>
                            )}
                        </div>
                    )}
                    <button
                        onClick={submitRating}
                        style={{
                            ...dynStyles.submitBtn,
                            opacity: (submitting || !verifiedWatcher) ? 0.6 : 1,
                            cursor: (submitting || !verifiedWatcher) ? 'not-allowed' : 'pointer'
                        }}
                        disabled={submitting || !verifiedWatcher}
                    >
                        {submitting ? 'Submitting...' : 'Post Review'}
                    </button>
                </div>

                <div style={dynStyles.reviewsList}>
                    {loadingReviews ? (
                        <p style={{ color: colors.textSecondary }}>Loading reviews...</p>
                    ) : reviews.length === 0 ? (
                        <p style={{ color: colors.textSecondary }}>No reviews yet. Be the first!</p>
                    ) : (
                        reviews.map(r => (
                            <div key={r.id} style={dynStyles.reviewCard}>
                                <div style={dynStyles.reviewHeader}>
                                    <div>
                                        <strong style={{ color: colors.text }}>{r.userName}</strong>
                                    </div>
                                    <span style={dynStyles.scoreBadge}>{r.rating || r.score}/10</span>
                                </div>
                                <p style={dynStyles.reviewText}>{r.reviewText || r.review || ''}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default MovieDetailPage;
