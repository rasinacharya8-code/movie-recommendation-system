import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, orderBy, getDocs } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';
import MovieCard from '../components/MovieCard';

const MovieDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { colors } = useTheme();
    const [movie, setMovie] = useState(null);
    const [rating, setRating] = useState(0);
    const [hoveredStar, setHoveredStar] = useState(0);
    const [review, setReview] = useState('');
    const [reviews, setReviews] = useState([]);
    const [loadingReviews, setLoadingReviews] = useState(true);
    const [recommendations, setRecommendations] = useState([]);
    const [loadingRecs, setLoadingRecs] = useState(true);

    useEffect(() => {
        fetchMovie();
        fetchRecommendations();
    }, [id]);

    useEffect(() => {
        if (!id) return;
        const q = query(
            collection(db, 'reviews'),
            where('movieId', '==', id)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedReviews = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setReviews(fetchedReviews);
            setLoadingReviews(false);
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

    const fetchRecommendations = async () => {
        try {
            // Get user's ratings to understand preferences
            const user = auth.currentUser;
            if (!user) {
                setLoadingRecs(false);
                return;
            }

            const userReviewsQuery = query(
                collection(db, 'reviews'),
                where('userId', '==', user.uid)
            );
            const userReviewsSnap = await getDocs(userReviewsQuery);
            const userRatings = userReviewsSnap.docs.map(doc => doc.data());

            // Get all movies
            const moviesRes = await api.get('/movies/');
            const allMovies = moviesRes.data;

            // Filter out current movie and recommend based on user's high ratings
            const highRatedMovies = userRatings.filter(r => r.rating >= 4);

            // Simple recommendation: show random movies, prioritizing similar genres
            const recommended = allMovies
                .filter(m => m.id !== parseInt(id))
                .slice(0, 6);

            setRecommendations(recommended);
        } catch (err) {
            console.error("Failed to fetch recommendations", err);
        } finally {
            setLoadingRecs(false);
        }
    };

    const submitRating = async () => {
        const user = auth.currentUser;
        if (!user) {
            alert('Please login to submit a review.');
            return;
        }

        if (rating === 0) {
            alert('Please select a rating.');
            return;
        }

        if (!review.trim()) {
            alert('Please write a review.');
            return;
        }

        try {
            await addDoc(collection(db, 'reviews'), {
                movieId: id,
                movieTitle: movie.title,
                userId: user.uid,
                userName: user.displayName || user.email,
                rating: Number(rating),
                review: review,
                timestamp: serverTimestamp()
            });
            setReview('');
            setRating(0);
            alert('Review submitted successfully!');
            fetchRecommendations(); // Refresh recommendations
        } catch (err) {
            console.error(err);
            alert('Failed to submit review. Check your connection.');
        }
    };

    const renderStars = (currentRating, interactive = false, size = '24px') => {
        const stars = [];
        const displayRating = interactive ? (hoveredStar || rating) : currentRating;

        for (let i = 1; i <= 5; i++) {
            stars.push(
                <span
                    key={i}
                    onClick={interactive ? () => setRating(i) : undefined}
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

    if (!movie) return <div style={{ ...styles.container, color: colors.text }}>Loading...</div>;

    const styles = {
        container: {
            padding: '2rem',
            minHeight: '100vh',
            background: colors.background,
            color: colors.text,
        },
        header: {
            display: 'flex',
            gap: '2rem',
            flexWrap: 'wrap',
            marginBottom: '3rem',
        },
        poster: {
            width: '300px',
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        },
        info: {
            flex: 1,
            minWidth: '300px',
        },
        title: {
            fontSize: '2.5rem',
            marginBottom: '1rem',
            background: `linear-gradient(45deg, ${colors.accent}, ${colors.accentSecondary})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
        },
        meta: {
            color: colors.textSecondary,
            marginBottom: '1.5rem',
            fontSize: '1.1rem',
        },
        desc: {
            lineHeight: '1.6',
            fontSize: '1.1rem',
            color: colors.textSecondary,
        },
        section: {
            marginTop: '3rem',
        },
        sectionTitle: {
            fontSize: '1.8rem',
            marginBottom: '1.5rem',
            borderLeft: `4px solid ${colors.accent}`,
            paddingLeft: '15px',
        },
        formCard: {
            background: colors.cardBg,
            padding: '2rem',
            borderRadius: '12px',
            border: `1px solid ${colors.border}`,
            marginBottom: '2rem',
        },
        starRating: {
            display: 'flex',
            gap: '0.25rem',
            marginBottom: '1rem',
            fontSize: '2rem',
        },
        ratingText: {
            marginBottom: '1rem',
            color: colors.textSecondary,
        },
        textarea: {
            width: '100%',
            padding: '15px',
            background: colors.inputBg,
            border: `1px solid ${colors.border}`,
            color: colors.text,
            borderRadius: '8px',
            marginBottom: '1rem',
            resize: 'vertical',
            fontSize: '1rem',
            boxSizing: 'border-box',
        },
        submitBtn: {
            width: '100%',
            padding: '12px',
            background: `linear-gradient(90deg, ${colors.accent}, ${colors.accentSecondary})`,
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '1rem',
        },
        reviewsList: {
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
        },
        reviewCard: {
            background: colors.cardBg,
            padding: '1.5rem',
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
        recsGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '1.5rem',
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <img src={movie.poster_url} alt={movie.title} style={styles.poster} />
                <div style={styles.info}>
                    <h1 style={styles.title}>{movie.title}</h1>
                    <p style={styles.meta}>Release Date: {movie.release_date}</p>
                    {movie.average_rating && (
                        <p style={styles.meta}>⭐ Average Rating: {movie.average_rating.toFixed(1)}/10</p>
                    )}
                    <p style={styles.desc}>{movie.description || 'No description available.'}</p>
                </div>
            </div>

            {/* Rate & Review Section */}
            <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Rate & Review</h3>
                <div style={styles.formCard}>
                    <h4 style={{ margin: '0 0 1rem 0' }}>Your Rating</h4>
                    <div style={styles.starRating}>
                        {renderStars(rating, true, '2.5rem')}
                    </div>
                    {rating > 0 && (
                        <p style={styles.ratingText}>
                            {rating} out of 5 stars
                            {rating >= 4 && ' - We\'ll recommend similar movies!'}
                            {rating <= 2 && ' - We\'ll avoid recommending similar movies.'}
                        </p>
                    )}
                    <textarea
                        placeholder="Write your review here..."
                        value={review}
                        onChange={e => setReview(e.target.value)}
                        rows={4}
                        style={styles.textarea}
                    />
                    <button onClick={submitRating} style={styles.submitBtn}>Post Review</button>
                </div>

                <h4 style={{ marginBottom: '1rem' }}>All Reviews ({reviews.length})</h4>
                <div style={styles.reviewsList}>
                    {loadingReviews ? (
                        <p style={{ color: colors.textSecondary }}>Loading reviews...</p>
                    ) : reviews.length === 0 ? (
                        <p style={{ color: colors.textSecondary }}>No reviews yet. Be the first!</p>
                    ) : (
                        reviews.map(r => (
                            <div key={r.id} style={styles.reviewCard}>
                                <div style={styles.reviewHeader}>
                                    <span style={styles.reviewAuthor}>{r.userName}</span>
                                    <span style={styles.reviewRating}>
                                        {renderStars(r.rating, false, '1rem')}
                                    </span>
                                </div>
                                <p style={styles.reviewText}>{r.review}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Recommendations Section */}
            {recommendations.length > 0 && (
                <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>You Might Also Like</h3>
                    <div style={styles.recsGrid}>
                        {recommendations.map(movie => (
                            <div key={movie.id} onClick={() => navigate(`/movie/${movie.id}`)}>
                                <MovieCard movie={movie} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MovieDetailPage;
