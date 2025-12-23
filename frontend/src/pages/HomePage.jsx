import React, { useEffect, useState } from 'react';
import api from '../api';
import MovieCard from '../components/MovieCard';
import Modal from '../components/Modal';
import { useTheme } from '../context/ThemeContext';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const HomePage = () => {
    const [movies, setMovies] = useState([]);
    const [recommended, setRecommended] = useState([]);
    const [selectedMovie, setSelectedMovie] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const { colors } = useTheme();

    useEffect(() => {
        fetchMovies();

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!currentUser) {
            fetchDefaultRecommendations();
            return;
        }

        const reviewsQuery = query(
            collection(db, 'reviews'),
            where('userId', '==', currentUser.uid)
        );

        const unsubscribe = onSnapshot(reviewsQuery, (snapshot) => {
            console.log('Reviews updated! Refreshing recommendations...');
            const userReviews = snapshot.docs.map(doc => doc.data());
            updateRecommendations(userReviews);
        });

        return () => unsubscribe();
    }, [currentUser, movies]);

    const fetchMovies = async () => {
        try {
            const res = await api.get('/movies/');
            setMovies(res.data);
        } catch (err) {
            console.error("Failed to fetch movies", err);
        } finally {
            setLoading(false);
        }
    };

    const updateRecommendations = (userReviews) => {
        if (!movies || movies.length === 0) return;

        console.log('🎬 Updating recommendations with', userReviews.length, 'reviews');

        if (userReviews.length === 0) {
            const sortedByRating = [...movies].sort((a, b) =>
                (b.average_rating || 0) - (a.average_rating || 0)
            );
            setRecommended(sortedByRating.slice(0, 6));
            return;
        }

        const ratedMovieIds = userReviews.map(r => r.movieId.toString());
        const unratedMovies = movies.filter(m => !ratedMovieIds.includes(m.id.toString()));

        const highRatedMovies = userReviews.filter(r => r.rating >= 4);
        const mediumRatedMovies = userReviews.filter(r => r.rating === 3);
        const lowRatedMovies = userReviews.filter(r => r.rating <= 2);

        console.log('📊 Ratings:', {
            high: highRatedMovies.length,
            medium: mediumRatedMovies.length,
            low: lowRatedMovies.length
        });

        if (highRatedMovies.length === 0) {
            const sortedByRating = [...unratedMovies].sort((a, b) =>
                (b.average_rating || 0) - (a.average_rating || 0)
            );
            setRecommended(sortedByRating.slice(0, 6));
            return;
        }

        // Calculate genre preference scores with recency weighting
        const genreScores = {};
        const genreCount = {};

        // Strong positive weight for high-rated genres (more recent = more weight)
        highRatedMovies.forEach((review, index) => {
            const movie = movies.find(m => m.id.toString() === review.movieId.toString());
            if (movie && movie.genres) {
                // Recency bonus: more recent reviews get slightly more weight
                const recencyMultiplier = 1 + (index / highRatedMovies.length) * 0.3;
                movie.genres.forEach(genre => {
                    genreScores[genre.name] = (genreScores[genre.name] || 0) + (review.rating * 4 * recencyMultiplier);
                    genreCount[genre.name] = (genreCount[genre.name] || 0) + 1;
                });
            }
        });

        // Very slight positive for medium-rated (gradual adaptation)
        mediumRatedMovies.forEach(review => {
            const movie = movies.find(m => m.id.toString() === review.movieId.toString());
            if (movie && movie.genres) {
                movie.genres.forEach(genre => {
                    genreScores[genre.name] = (genreScores[genre.name] || 0) + 0.3;
                });
            }
        });

        // Strong negative weight for low-rated genres (avoid completely)
        lowRatedMovies.forEach(review => {
            const movie = movies.find(m => m.id.toString() === review.movieId.toString());
            if (movie && movie.genres) {
                movie.genres.forEach(genre => {
                    genreScores[genre.name] = (genreScores[genre.name] || 0) - (5 - review.rating) * 2;
                });
            }
        });

        // Identify preferred genres (only positive scores with multiple ratings)
        const preferredGenres = Object.keys(genreScores).filter(genre =>
            genreScores[genre] > 5 && (genreCount[genre] || 0) >= 1
        );

        console.log('🎭 Genre scores:', genreScores);
        console.log('✅ Preferred genres:', preferredGenres);

        // STRICT FILTERING: Only recommend movies from preferred genres
        const moviesWithScores = unratedMovies
            .filter(movie => {
                // Movie must have at least one preferred genre
                if (!movie.genres || movie.genres.length === 0) return false;
                return movie.genres.some(genre => preferredGenres.includes(genre.name));
            })
            .map(movie => {
                let score = 0;
                let matchingGenres = 0;
                let hasNegativeGenre = false;

                movie.genres.forEach(genre => {
                    const genreScore = genreScores[genre.name] || 0;
                    if (genreScore > 0 && preferredGenres.includes(genre.name)) {
                        matchingGenres++;
                        score += genreScore;
                    } else if (genreScore < -5) {
                        // Heavily penalize movies with disliked genres
                        hasNegativeGenre = true;
                        score += genreScore * 2;
                    }
                });

                // Exclude movies with strongly disliked genres
                if (hasNegativeGenre && score < 0) {
                    return { movie, score: -1000, matchingGenres: 0 };
                }

                // Big bonus for movies with multiple preferred genres
                if (matchingGenres > 1) {
                    score *= (1 + (matchingGenres * 0.3));
                }

                // Minimal boost from average rating (genre is primary)
                if (movie.average_rating) {
                    score += movie.average_rating * 0.03;
                }

                return { movie, score, matchingGenres };
            });

        // Sort by score and matching genres
        let recommendedMovies = moviesWithScores
            .filter(item => item.score > 0)
            .sort((a, b) => {
                // First by number of matching preferred genres
                if (a.matchingGenres !== b.matchingGenres) {
                    return b.matchingGenres - a.matchingGenres;
                }
                // Then by score
                return b.score - a.score;
            })
            .slice(0, 6)
            .map(item => item.movie);

        // If not enough strict matches, gradually include medium-scored genres
        if (recommendedMovies.length < 6) {
            const mediumGenres = Object.keys(genreScores).filter(genre =>
                genreScores[genre] > 0 && genreScores[genre] <= 5
            );

            const additionalMovies = unratedMovies
                .filter(m => !recommendedMovies.includes(m))
                .filter(movie => {
                    if (!movie.genres) return false;
                    return movie.genres.some(genre => mediumGenres.includes(genre.name));
                })
                .sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0))
                .slice(0, 6 - recommendedMovies.length);

            recommendedMovies = [...recommendedMovies, ...additionalMovies];
        }

        console.log('✅ Recommended:', recommendedMovies.length, 'movies from preferred genres only');
        setRecommended(recommendedMovies);
    };

    const fetchDefaultRecommendations = async () => {
        try {
            const res = await api.get('/movies/recommendations/');
            setRecommended(res.data.slice(0, 6));
        } catch (err) {
            console.error("Failed to fetch default recommendations", err);
            if (movies.length > 0) {
                const sortedByRating = [...movies].sort((a, b) =>
                    (b.average_rating || 0) - (a.average_rating || 0)
                );
                setRecommended(sortedByRating.slice(0, 6));
            }
        }
    };

    const handleMovieClick = (movie) => {
        setSelectedMovie(movie);
    };

    const closeModal = () => {
        setSelectedMovie(null);
    };

    const styles = {
        container: {
            padding: '2rem',
            background: colors.background,
            minHeight: '100vh',
            color: colors.text,
            width: '100%',
            boxSizing: 'border-box',
        },
        heading: {
            fontSize: '2rem',
            marginBottom: '1.5rem',
            background: `linear-gradient(45deg, ${colors.accent}, ${colors.accentSecondary})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: '700',
        },
        subtitle: {
            fontSize: '0.9rem',
            color: colors.textSecondary,
            marginTop: '-1rem',
            marginBottom: '1.5rem',
        },
        grid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '1.5rem',
            marginBottom: '3rem',
            width: '100%',
        },
        loading: {
            textAlign: 'center',
            padding: '3rem',
            fontSize: '1.2rem',
            color: colors.textSecondary,
        }
    };

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.loading}>Loading movies...</div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {recommended.length > 0 && (
                <>
                    <h1 style={styles.heading}>Recommendations For You</h1>
                    <p style={styles.subtitle}>
                        {currentUser
                            ? '🎯 Based on genre similarity to your highly-rated movies'
                            : 'Login to get personalized recommendations'}
                    </p>
                    <div style={styles.grid}>
                        {recommended.map(movie => (
                            <div key={movie.id} onClick={() => handleMovieClick(movie)}>
                                <MovieCard movie={movie} />
                            </div>
                        ))}
                    </div>
                </>
            )}

            <h1 style={styles.heading}>🔥 Top Rated</h1>
            <div style={styles.grid}>
                {movies
                    .filter(m => m.average_rating && m.average_rating >= 4.0)
                    .sort((a, b) => b.average_rating - a.average_rating)
                    .slice(0, 10)
                    .map(movie => (
                        <div key={movie.id} onClick={() => handleMovieClick(movie)}>
                            <MovieCard movie={movie} />
                        </div>
                    ))}
            </div>

            <h1 style={styles.heading}>💥 Action Movies</h1>
            <div style={styles.grid}>
                {movies
                    .filter(m => m.genres && m.genres.some(g => g.name === 'Action'))
                    .slice(0, 10)
                    .map(movie => (
                        <div key={movie.id} onClick={() => handleMovieClick(movie)}>
                            <MovieCard movie={movie} />
                        </div>
                    ))}
            </div>

            <h1 style={styles.heading}>😂 Comedy Hits</h1>
            <div style={styles.grid}>
                {movies
                    .filter(m => m.genres && m.genres.some(g => g.name === 'Comedy'))
                    .slice(0, 10)
                    .map(movie => (
                        <div key={movie.id} onClick={() => handleMovieClick(movie)}>
                            <MovieCard movie={movie} />
                        </div>
                    ))}
            </div>

            <h1 style={styles.heading}>🎭 Critical Dramas</h1>
            <div style={styles.grid}>
                {movies
                    .filter(m => m.genres && m.genres.some(g => g.name === 'Drama'))
                    .slice(0, 10)
                    .map(movie => (
                        <div key={movie.id} onClick={() => handleMovieClick(movie)}>
                            <MovieCard movie={movie} />
                        </div>
                    ))}
            </div>

            <h1 style={styles.heading}>🍿 All Movies</h1>
            <div style={styles.grid}>
                {movies.map(movie => (
                    <div key={movie.id} onClick={() => handleMovieClick(movie)}>
                        <MovieCard movie={movie} />
                    </div>
                ))}
            </div>

            <Modal isOpen={!!selectedMovie} onClose={closeModal} movie={selectedMovie} />
        </div>
    );
};

export default HomePage;
