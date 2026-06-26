import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, getDocs, getDoc, doc, updateDoc } from 'firebase/firestore';

const Modal = ({ isOpen, onClose, movie, onReviewSubmitted }) => {
    const { colors } = useTheme();
    const [reviews, setReviews] = useState([]);
    const [userReview, setUserReview] = useState('');
    const [userRating, setUserRating] = useState(0);
    const [hoveredStar, setHoveredStar] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editingReviewId, setEditingReviewId] = useState(null);
    const [watchProgress, setWatchProgress] = useState(0);
    const [isWatching, setIsWatching] = useState(false);
    const [verifiedWatcher, setVerifiedWatcher] = useState(true);

    useEffect(() => {
        const style = document.createElement('style');
        style.innerHTML = `
            @keyframes pulse {
                0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(147, 51, 234, 0.4); }
                70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(147, 51, 234, 0); }
                100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(147, 51, 234, 0); }
            }
        `;
        document.head.appendChild(style);
        return () => document.head.removeChild(style);
    }, []);

    useEffect(() => {
        if (movie && isOpen) {
            setUserReview('');
            setUserRating(0);
            setHoveredStar(0);

            let firestoreUnsubscribe = () => { };

            const fetchAllReviews = async () => {
                try {
                    // Internal discovery: If modal was opened without firestore_id, try to find it
                    let currentFirestoreId = movie.firestore_id;
                    if (!currentFirestoreId && isNaN(parseInt(movie.id))) {
                        currentFirestoreId = movie.id; // It's already a non-numeric (Firestore) ID
                    } else if (!currentFirestoreId) {
                        try {
                            const qTitle = query(collection(db, 'movies'), where('title', '==', movie.title));
                            const snap = await getDocs(qTitle);
                            if (!snap.empty) {
                                currentFirestoreId = snap.docs[0].id;
                            }
                        } catch (e) {
                            console.log("Modal discovery failed", e);
                        }
                    }

                    // Identify all possible IDs for this movie
                    const idsToQuery = [String(movie.id)];
                    if (currentFirestoreId && currentFirestoreId !== String(movie.id)) {
                        idsToQuery.push(String(currentFirestoreId));
                    }

                    // 1. Setup Firestore Listener with support for multiple IDs (merged movies)
                    const q = query(collection(db, 'reviews'), where('movieId', 'in', idsToQuery));

                    firestoreUnsubscribe = onSnapshot(q, async (snapshot) => {
                        const firestoreReviews = snapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data(),
                            source: 'Cloud'
                        }));

                        // 2. Fetch Django Reviews
                        let djangoReviews = [];
                        const numericId = idsToQuery.map(val => parseInt(val)).find(val => !isNaN(val));

                        if (numericId) {
                            try {
                                const api = (await import('../api')).default;
                                const res = await api.get(`/movies/${numericId}/reviews/`);
                                djangoReviews = res.data.map(r => ({ ...r, source: 'Legacy' }));
                            } catch (err) {
                                console.warn('Legacy reviews fetch failed', err);
                            }
                        }

                        // 3. Merge: Combine both
                        const allReviewsMap = new Map();
                        djangoReviews.forEach(r => allReviewsMap.set(`django_${r.id}`, r));
                        firestoreReviews.forEach(r => allReviewsMap.set(`fs_${r.id}`, r));

                        const merged = Array.from(allReviewsMap.values()).sort((a, b) => {
                            const dateA = new Date(a.timestamp?.seconds ? a.timestamp.seconds * 1000 : a.timestamp);
                            const dateB = new Date(b.timestamp?.seconds ? b.timestamp.seconds * 1000 : b.timestamp);
                            return dateB - dateA;
                        });

                        setReviews(merged);

                        // Auto-verify if user already has a review for this movie
                        const user = auth.currentUser;
                        if (user) {
                            const userHasReviewed = merged.some(r => r.userId === user.uid);
                            if (userHasReviewed) {
                                setVerifiedWatcher(true);
                                console.log("User already reviewed this movie - auto-verified!");
                            }
                        }
                    });
                } catch (err) {
                    console.error("Error setting up reviews", err);
                }
            };

            fetchAllReviews();

            // Fetch initial watch progress from local storage
            const user = auth.currentUser;
            if (user) {
                const storageKey = `watch_seconds_${user.uid}_${movie.id}`;
                const savedSeconds = localStorage.getItem(storageKey);
                if (savedSeconds) {
                    const seconds = parseFloat(savedSeconds);
                    const progress = (seconds / ((movie.duration || 1) * 60)) * 100;
                    setWatchProgress(Math.min(progress, 100));
                    if (progress >= 90) setVerifiedWatcher(true);
                }
            }

            return () => firestoreUnsubscribe();
        }
    }, [movie, isOpen, movie?.firestore_id]);

    useEffect(() => {
        let interval;
        if (isWatching && movie && movie.duration > 0) {
            const user = auth.currentUser;
            if (!user) return;

            if (!user.uid || !movie.id) return;

            // Timestamp-based tracking
            const storageKey = `watch_start_${user.uid}_${movie.id}`;
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

                // Calculate percentage based on movie duration
                const progress = (elapsedSeconds / (movie.duration * 60)) * 100;

                setWatchProgress(Math.min(progress, 100));

                if (progress >= 90) {
                    setVerifiedWatcher(true);
                }
            };

            // Update visible progress every second
            interval = setInterval(updateTracking, 1000);
            updateTracking(); // Immediate check
        }
        return () => clearInterval(interval);
    }, [isWatching, movie?.id, movie?.duration, auth.currentUser?.uid]);

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        const user = auth.currentUser;

        if (!user) {
            alert('Please login to submit a review');
            return;
        }

        if (userRating === 0) {
            alert('Please select a rating (1-5 stars)');
            return;
        }

        if (!userReview.trim()) {
            alert('Please write a review');
            return;
        }

        // Check if user has already reviewed this movie (only for new reviews, not edits)
        if (!editMode) {
            const existingReview = reviews.find(review => review.userId === user.uid);
            if (existingReview) {
                alert('You have already reviewed this movie. Click the Edit button on your review to update it.');
                return;
            }
        }

        setSubmitting(true);
        try {
            // 1. Save to Django
            console.log("Attempting Django submission from Modal...");
            const apiInstance = (await import('../api')).default;
            try {
                const response = await apiInstance.post(`/movies/${movie.id}/rate_movie/`, {
                    rating: userRating,
                    review_text: userReview,
                    user_email: user.email || 'anonymous@example.com',
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

            // 2. Save overlay to Firebase
            console.log("Attempting Firebase submission from Modal...");
            if (editMode && editingReviewId) {
                const { doc, updateDoc } = await import('firebase/firestore');
                await updateDoc(doc(db, 'reviews', editingReviewId), {
                    rating: userRating,
                    review: userReview,
                    timestamp: serverTimestamp(),
                    isVerified: verifiedWatcher
                });
            } else {
                await addDoc(collection(db, 'reviews'), {
                    movieId: String(movie.id),
                    movieTitle: movie.title,
                    userId: user.uid,
                    userName: user.displayName || user.email,
                    rating: userRating,
                    review: userReview,
                    timestamp: serverTimestamp(),
                    isVerified: verifiedWatcher
                });
            }
            console.log("Firebase submission successful");

            // --- Aggregate Average Rating Update (Cloud) ---
            try {
                const { getDocs, query, where, updateDoc, doc } = await import('firebase/firestore');

                // 1. Identify all IDs for this movie
                const idsToQuery = [String(movie.id)];
                if (movie.firestore_id && movie.firestore_id !== String(movie.id)) {
                    idsToQuery.push(String(movie.firestore_id));
                }

                // 2. Fetch all reviews for these IDs
                const reviewsSnap = await getDocs(query(
                    collection(db, 'reviews'),
                    where('movieId', 'in', idsToQuery)
                ));
                const allRatings = reviewsSnap.docs.map(d => Number(d.data().rating || 0));

                if (allRatings.length > 0) {
                    const newAverage = allRatings.reduce((a, b) => a + b, 0) / allRatings.length;

                    // 3. Update the movie document in Firestore if it exists
                    const movieDocIds = [String(movie.id)];
                    if (movie.firestore_id) movieDocIds.push(String(movie.firestore_id));

                    for (const docId of movieDocIds) {
                        try {
                            const movieRef = doc(db, 'movies', docId);
                            const movieSnap = await getDoc(movieRef);
                            if (movieSnap.exists()) {
                                await updateDoc(movieRef, {
                                    average_rating: newAverage,
                                    review_count: allRatings.length
                                });
                            }
                        } catch (docErr) {
                            // Ignored
                        }
                    }
                }
            } catch (avgErr) {
                console.warn("Aggregate rating update failed", avgErr);
            }
            // -----------------------------------------------

            setUserReview('');
            setUserRating(0);
            if (editMode) {
                setEditMode(false);
                setEditingReviewId(null);
                alert('Review updated successfully!');
            } else {
                alert('Review submitted successfully!');
            }

            if (onReviewSubmitted) {
                onReviewSubmitted();
            } else {
                // Fallback if no callback provided
                window.location.reload();
            }
        } catch (err) {
            console.error(err);
            alert('Failed to submit review. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditReview = (review) => {
        setEditMode(true);
        setEditingReviewId(review.id);
        setUserRating(review.rating);
        setUserReview(review.review);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditMode(false);
        setEditingReviewId(null);
        setUserRating(0);
        setUserReview('');
    };

    const handleWatchClick = async () => {
        setIsWatching(true);
        // Inform user tracking has started
        console.log("Watch tracking started for", movie.title);
    };

    if (!isOpen || !movie) return null;

    const renderStars = (rating, interactive = false, size = '24px') => {
        const stars = [];
        const displayRating = interactive ? (hoveredStar || userRating) : rating;

        for (let i = 1; i <= 5; i++) {
            stars.push(
                <span
                    key={i}
                    onClick={interactive ? () => setUserRating(i) : undefined}
                    onMouseEnter={interactive ? () => setHoveredStar(i) : undefined}
                    onMouseLeave={interactive ? () => setHoveredStar(0) : undefined}
                    style={{
                        fontSize: size,
                        color: i <= displayRating ? '#ffc107' : '#555',
                        cursor: interactive ? 'pointer' : 'default',
                        transition: 'color 0.2s',
                    }}
                >
                    ★
                </span>
            );
        }
        return stars;
    };

    const styles = {
        overlay: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            animation: 'fadeIn 0.3s ease-out',
            padding: '1rem',
        },
        modal: {
            backgroundColor: colors.modalBg,
            color: colors.text,
            borderRadius: '16px',
            maxWidth: '900px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            border: `1px solid ${colors.border}`,
            animation: 'scaleUp 0.3s ease-out',
            position: 'relative',
        },
        closeBtn: {
            position: 'sticky',
            top: '15px',
            right: '15px',
            float: 'right',
            background: 'rgba(255, 0, 0, 0.2)',
            border: 'none',
            color: '#fff',
            fontSize: '1.5rem',
            cursor: 'pointer',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s',
            zIndex: 10,
        },
        header: {
            position: 'relative',
            height: '400px',
            backgroundColor: '#000',
            borderRadius: '16px 16px 0 0',
            overflow: 'hidden',
        },
        headerImage: {
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            position: 'absolute',
            top: 0,
            left: 0,
        },
        headerOverlay: {
            background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: '2rem',
            borderRadius: '16px 16px 0 0',
        },
        title: {
            fontSize: '2rem',
            fontWeight: '700',
            margin: '0 0 0.5rem 0',
            textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
        },
        metadata: {
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
            fontSize: '0.9rem',
            color: '#ddd',
        },
        rating: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(255, 200, 0, 0.2)',
            padding: '4px 12px',
            borderRadius: '20px',
            fontWeight: '600',
        },
        genreContainer: {
            display: 'flex',
            gap: '0.5rem',
            flexWrap: 'wrap',
            marginTop: '0.75rem',
        },
        genreBadge: {
            background: `linear-gradient(135deg, ${colors.accent}, ${colors.accentSecondary})`,
            color: '#fff',
            padding: '4px 12px',
            borderRadius: '15px',
            fontSize: '0.75rem',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
        },
        content: {
            padding: '2rem',
        },
        section: {
            marginBottom: '2rem',
        },
        sectionTitle: {
            fontSize: '1.3rem',
            marginBottom: '1rem',
            fontWeight: '600',
            borderLeft: `4px solid ${colors.accent}`,
            paddingLeft: '12px',
        },
        description: {
            lineHeight: '1.6',
            fontSize: '1rem',
            color: colors.textSecondary,
        },
        castGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
            gap: '1rem',
        },
        castMember: {
            textAlign: 'center',
            fontSize: '0.85rem',
        },
        divider: {
            height: '1px',
            background: colors.border,
            margin: '2rem 0',
        },
        reviewForm: {
            background: colors.cardBg,
            padding: '1.5rem',
            borderRadius: '12px',
            marginBottom: '2rem',
            border: `1px solid ${colors.border}`,
        },
        starRating: {
            display: 'flex',
            gap: '0.25rem',
            marginTop: '0.5rem',
            marginBottom: '0.5rem',
            fontSize: '2rem',
        },
        ratingText: {
            marginBottom: '1rem',
            color: colors.textSecondary,
            fontSize: '0.9rem',
        },
        textarea: {
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            background: colors.inputBg,
            color: colors.text,
            fontSize: '1rem',
            fontFamily: 'inherit',
            marginTop: '0.5rem',
            resize: 'vertical',
            boxSizing: 'border-box',
            minHeight: '100px',
            outline: 'none',
            lineHeight: '1.5',
        },
        submitBtn: {
            padding: '12px 24px',
            borderRadius: '8px',
            border: 'none',
            background: `linear-gradient(90deg, ${colors.accent}, ${colors.accentSecondary})`,
            color: '#fff',
            cursor: 'pointer',
            fontWeight: '600',
            marginTop: '1rem',
            width: '100%',
            fontSize: '1rem',
        },
        reviewsList: {
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
        },
        reviewCard: {
            background: colors.cardBg,
            padding: '1rem',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
        },
        reviewHeader: {
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '0.5rem',
            flexWrap: 'wrap',
            gap: '0.5rem',
        },
        reviewAuthor: {
            fontWeight: '600',
            color: colors.text,
        },
        reviewRating: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
        },
        reviewText: {
            color: colors.textSecondary,
            lineHeight: '1.5',
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
            fontSize: '1rem',
            boxShadow: '0 4px 15px rgba(255, 0, 204, 0.4)',
            transition: 'transform 0.2s ease',
        },
    };

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
                <button style={styles.closeBtn} onClick={onClose}>&times;</button>

                <div style={styles.header}>
                    <img
                        src={movie.poster_url}
                        alt={movie.title}
                        style={styles.headerImage}
                        referrerPolicy="no-referrer"
                    />
                    <div style={styles.headerOverlay}>
                        <h2 style={styles.title}>{movie.title}</h2>
                        <div style={styles.metadata}>
                            <span>
                                {movie.release_year || movie.year || (movie.release_date && movie.release_date.split('-')[0]) || 'N/A'}
                            </span>
                            <span style={{ margin: '0 8px', color: colors.textSecondary }}>|</span>
                            <span>{movie.duration || 'N/A'} min</span>
                            <span style={{ margin: '0 8px', color: colors.textSecondary }}>|</span>
                            <div style={styles.rating}>
                                <span style={{ color: '#ffc107' }}>★</span>
                                <span>
                                    {reviews.length > 0
                                        ? (reviews.reduce((acc, r) => acc + Number(r.rating || 0), 0) / reviews.length).toFixed(1)
                                        : (movie.average_rating !== undefined && movie.average_rating !== null
                                            ? Number(movie.average_rating).toFixed(1)
                                            : '0.0')}
                                </span>
                                <span style={{ fontSize: '0.7rem', marginLeft: '4px', opacity: 0.8 }}>
                                    ({reviews.length} Ratings)
                                </span>
                            </div>
                        </div>
                        {movie.genres && (Array.isArray(movie.genres) ? movie.genres : movie.genres.split(',')).length > 0 && (
                            <div style={styles.genreContainer}>
                                {(Array.isArray(movie.genres) ? movie.genres : movie.genres.split(',')).map((genre, idx) => (
                                    <span key={idx} style={styles.genreBadge}>
                                        {typeof genre === 'string' ? genre : genre.name}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div style={styles.content}>
                    {/* Description Section */}
                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>Description</h3>
                        <p style={styles.description}>{movie.description || movie.overview || 'No description available.'}</p>
                        {movie.duration && (
                            <p style={{
                                ...styles.description,
                                marginTop: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <span style={{ fontSize: '1.2rem' }}>⏱️</span>
                                Duration: {movie.duration} minutes
                            </p>
                        )}
                    </div>

                    {/* Cast Section */}
                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>Cast</h3>
                        <div style={styles.castGrid}>
                            {movie.cast ? (
                                Array.isArray(movie.cast)
                                    ? movie.cast.slice(0, 6).map((actor, idx) => (
                                        <div key={idx} style={styles.castMember}>{actor.trim()}</div>
                                    ))
                                    : movie.cast.split(',').slice(0, 6).map((actor, idx) => (
                                        <div key={idx} style={styles.castMember}>{actor.trim()}</div>
                                    ))
                            ) : <p style={styles.description}>Cast information not available.</p>}
                        </div>
                    </div>

                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <a
                            href={movie.watch_url || `https://www.google.com/search?q=${encodeURIComponent(movie.title + " watch online streaming")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                ...styles.watchBtn,
                                animation: isWatching ? 'pulse 2s infinite' : 'none'
                            }}
                            onClick={handleWatchClick}
                        >
                            <span style={{ marginRight: '8px' }}>▶️</span>
                            {movie.watch_url ? 'Watch Movie Now' : 'Find Streaming Options'}
                        </a>
                    </div>

                    <div style={styles.divider}></div>

                    {/* Rate & Review Section */}
                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>Rate & Review</h3>
                        <form onSubmit={handleSubmitReview} style={styles.reviewForm}>
                            <label>
                                <strong>Your Rating:</strong>
                                <div style={styles.starRating}>
                                    {renderStars(userRating, true, '2rem')}
                                </div>
                                {userRating > 0 && (
                                    <div style={styles.ratingText}>
                                        {userRating} out of 5 stars
                                        {userRating >= 4 && ' - Great! We\'ll recommend similar movies.'}
                                        {userRating <= 2 && ' - Thanks! We\'ll avoid similar recommendations.'}
                                    </div>
                                )}
                            </label>
                            <label style={{ display: 'block' }}>
                                <strong>Your Review:</strong>
                                <textarea
                                    value={userReview}
                                    onChange={(e) => setUserReview(e.target.value)}
                                    style={styles.textarea}
                                    placeholder={verifiedWatcher ? "Share your thoughts about this movie..." : "Please watch at least 90% of the movie to leave a review."}
                                    required
                                    disabled={!verifiedWatcher}
                                />
                            </label>
                            {!verifiedWatcher && (
                                <div style={{
                                    background: 'rgba(255, 193, 7, 0.1)',
                                    padding: '10px',
                                    borderRadius: '8px',
                                    marginTop: '10px',
                                    fontSize: '0.85rem',
                                    color: '#ffc107',
                                    border: '1px solid rgba(255, 193, 7, 0.3)'
                                }}>
                                    ⚠️ <strong>Review Locked:</strong> You've watched {watchProgress.toFixed(1)}% of this movie.
                                    Please watch 90% or more to submit a review.
                                    {isWatching && (
                                        <div style={{ marginTop: '5px', color: '#4caf50', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                            ● Watch time tracking is active...
                                        </div>
                                    )}
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    type="submit"
                                    style={{
                                        ...styles.submitBtn,
                                        opacity: (!verifiedWatcher || submitting) ? 0.6 : 1,
                                        cursor: (!verifiedWatcher || submitting) ? 'not-allowed' : 'pointer'
                                    }}
                                    disabled={submitting || !verifiedWatcher}
                                >
                                    {submitting ? (editMode ? 'Updating...' : 'Submitting...') : (editMode ? 'Update Review' : 'Submit Review')}
                                </button>
                                {editMode && (
                                    <button type="button" onClick={handleCancelEdit} style={{ ...styles.submitBtn, background: colors.textSecondary }}>
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* All Reviews Section */}
                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>All Reviews ({reviews.length})</h3>
                        <div style={styles.reviewsList}>
                            {reviews.length > 0 ? reviews.map(review => (
                                <div key={review.id} style={styles.reviewCard}>
                                    <div style={styles.reviewHeader}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span style={styles.reviewAuthor}>{review.userName}</span>
                                        </div>                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <span style={styles.reviewRating}>
                                                {renderStars(review.rating, false, '1rem')}
                                            </span>
                                            {auth.currentUser && review.userId === auth.currentUser.uid && (
                                                <button
                                                    onClick={() => handleEditReview(review)}
                                                    style={{
                                                        background: colors.accent,
                                                        color: '#fff',
                                                        border: 'none',
                                                        padding: '4px 12px',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        fontSize: '0.8rem'
                                                    }}
                                                >
                                                    Edit
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <p style={styles.reviewText}>{review.review}</p>
                                </div>
                            )) : (
                                <p style={styles.description}>No reviews yet. Be the first to review this movie!</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default Modal;
