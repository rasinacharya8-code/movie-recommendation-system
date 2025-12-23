import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp } from 'firebase/firestore';

const Modal = ({ isOpen, onClose, movie }) => {
    const { colors } = useTheme();
    const [reviews, setReviews] = useState([]);
    const [userReview, setUserReview] = useState('');
    const [userRating, setUserRating] = useState(0);
    const [hoveredStar, setHoveredStar] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editingReviewId, setEditingReviewId] = useState(null);

    useEffect(() => {
        if (movie && isOpen) {
            // Clear form when opening a new movie
            setUserReview('');
            setUserRating(0);
            setHoveredStar(0);

            const q = query(collection(db, 'reviews'), where('movieId', '==', String(movie.id)));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const reviewsData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setReviews(reviewsData);
            });

            return () => unsubscribe();
        }
    }, [movie, isOpen]);

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
            if (editMode && editingReviewId) {
                // Update existing review in Firebase
                const { doc, updateDoc } = await import('firebase/firestore');
                await updateDoc(doc(db, 'reviews', editingReviewId), {
                    rating: userRating,
                    review: userReview,
                    timestamp: serverTimestamp()
                });
            } else {
                // Save new review to Firebase
                await addDoc(collection(db, 'reviews'), {
                    movieId: String(movie.id),
                    movieTitle: movie.title,
                    userId: user.uid,
                    userName: user.displayName || user.email,
                    rating: userRating,
                    review: userReview,
                    timestamp: serverTimestamp()
                });
            }

            // Also save/update to Django for average rating calculation
            try {
                const api = (await import('../api')).default;
                await api.post(`/movies/${movie.id}/rate_movie/`, {
                    score: userRating,
                    review_text: userReview,
                    user_email: user.email || 'anonymous@example.com'
                });
                console.log('✅ Rating saved to Django successfully');
            } catch (apiErr) {
                console.error('❌ Django API error:', apiErr);
                // Continue even if Django save fails - Firebase review is saved
            }

            setUserReview('');
            setUserRating(0);
            if (editMode) {
                setEditMode(false);
                setEditingReviewId(null);
                alert('Review updated successfully!');
            } else {
                alert('Review submitted successfully!');
            }

            // Reload page to show updated average rating
            window.location.reload();
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
                            <span>{movie.release_date?.split('-')[0]}</span>
                            {movie.average_rating && (
                                <span style={styles.rating}>
                                    ⭐ {movie.average_rating.toFixed(1)}
                                </span>
                            )}
                        </div>
                        {movie.genres && movie.genres.length > 0 && (
                            <div style={styles.genreContainer}>
                                {movie.genres.map((genre, idx) => (
                                    <span key={idx} style={styles.genreBadge}>
                                        {genre.name}
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
                        <p style={styles.description}>{movie.description || 'No description available.'}</p>
                    </div>

                    {/* Cast Section */}
                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>Cast</h3>
                        <div style={styles.castGrid}>
                            {movie.cast ? movie.cast.split(',').slice(0, 6).map((actor, idx) => (
                                <div key={idx} style={styles.castMember}>{actor.trim()}</div>
                            )) : <p style={styles.description}>Cast information not available.</p>}
                        </div>
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
                                    placeholder="Share your thoughts about this movie..."
                                    required
                                />
                            </label>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="submit" style={styles.submitBtn} disabled={submitting}>
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
                                        <span style={styles.reviewAuthor}>{review.userName}</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
