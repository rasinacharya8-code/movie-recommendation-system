import React, { useEffect, useState } from 'react';
import api from '../api';
import MovieCard from '../components/MovieCard';
import Modal from '../components/Modal';
import { useTheme } from '../context/ThemeContext';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const HomePage = () => {
    const [movies, setMovies] = useState([]);
    const [recommended, setRecommended] = useState([]);
    const [selectedMovie, setSelectedMovie] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [cloudStatus, setCloudStatus] = useState('online'); // 'online', 'offline', 'connecting'
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

            const userReviews = snapshot.docs.map(doc => doc.data());
            updateRecommendations(userReviews);
        });

        return () => unsubscribe();
    }, [currentUser, movies]);

    const fetchMovies = async () => {
        let djangoData = [];
        const stopInitialLoading = () => setLoading(false);

        // 1. Priority: Fetch from Local Django API (Internal/SQLite)
        try {
            const res = await api.get('/movies/');
            djangoData = res.data || [];
            if (djangoData.length > 0) {
                setMovies(djangoData);
                stopInitialLoading(); // SHOW LOCAL DATA NOW
            }
        } catch (err) {
            console.warn("Local API unreachable", err);
        }

        // 2. Secondary: Background fetch from Cloud (Firestore) with 3s timeout
        try {
            setCloudStatus('connecting');

            const cloudFetchPromise = (async () => {
                const moviesRef = collection(db, 'movies');
                const snapshot = await getDocs(moviesRef);
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            })();

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Cloud Timeout")), 3000)
            );

            const firestoreMovies = await Promise.race([cloudFetchPromise, timeoutPromise]);

            const movieMap = new Map();
            djangoData.forEach(m => movieMap.set(m.title.toLowerCase(), {
                ...m,
                // Ensure default values for visual consistency (handle null AND undefined)
                average_rating: (m.average_rating !== undefined && m.average_rating !== null) ? m.average_rating : 0,
                rating_count: (m.rating_count !== undefined && m.rating_count !== null) ? m.rating_count : 0
            }));

            firestoreMovies.forEach(m => {
                const key = m.title.toLowerCase();
                const existing = movieMap.get(key);
                if (existing) {
                    movieMap.set(key, {
                        ...existing,
                        ...m,
                        id: existing.id,
                        firestore_id: m.id,
                        // Prioritize LOCAL (django) release_year
                        release_year: existing.release_year || m.release_year || (m.release_date ? m.release_date.split('-')[0] : null),
                        // Prioritize LOCAL (Admin) data over Cloud, so Admin edits capture immediately
                        average_rating: (existing.average_rating !== undefined && existing.average_rating !== null && existing.average_rating > 0)
                            ? existing.average_rating
                            : (m.average_rating !== undefined && m.average_rating !== null ? m.average_rating : 0),
                        rating_count: (existing.rating_count !== undefined && existing.rating_count !== null && existing.rating_count > 0)
                            ? existing.rating_count
                            : (m.rating_count !== undefined && m.rating_count !== null ? m.rating_count : 0)
                    });
                } else {
                    movieMap.set(key, {
                        ...m,
                        // Ensure defaults for Cloud-only movies too
                        average_rating: (m.average_rating !== undefined && m.average_rating !== null) ? m.average_rating : 0,
                        rating_count: (m.rating_count !== undefined && m.rating_count !== null) ? m.rating_count : 0
                    });
                }
            });

            const combinedMovies = Array.from(movieMap.values());
            setMovies(combinedMovies);
            setCloudStatus('online');
            stopInitialLoading();
        } catch (fsErr) {
            // console.log("Cloud connection skipped or timed out:", fsErr.message);
            setCloudStatus('offline');
            stopInitialLoading(); // Critical: ensure loading screen disappears
            if (djangoData.length === 0) {
                setLoading(false);
            }
        }
    };

    const updateRecommendations = (userReviews) => {
        if (!movies || movies.length === 0) return;


        if (userReviews.length === 0) {
            const sortedByRating = [...movies].sort((a, b) =>
                (b.average_rating || 0) - (a.average_rating || 0)
            );
            setRecommended(sortedByRating.slice(0, 6));
            return;
        }

        const ratedMovieIds = userReviews.map(r => r.movieId.toString());
        const unratedMovies = movies.filter(m => !ratedMovieIds.includes(m.id?.toString()) && !ratedMovieIds.includes(m.django_id?.toString()));

        const highRatedMovies = userReviews.filter(r => r.rating >= 7);
        const mediumRatedMovies = userReviews.filter(r => r.rating >= 4 && r.rating <= 6);
        const lowRatedMovies = userReviews.filter(r => r.rating <= 3);


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
                movie.genres.forEach(g => {
                    const name = typeof g === 'string' ? g : g.name;
                    genreScores[name] = (genreScores[name] || 0) + (review.rating * 4 * recencyMultiplier);
                    genreCount[name] = (genreCount[name] || 0) + 1;
                });
            }
        });

        // Very slight positive for medium-rated (gradual adaptation)
        mediumRatedMovies.forEach(review => {
            const movie = movies.find(m => m.id.toString() === review.movieId.toString());
            if (movie && movie.genres) {
                movie.genres.forEach(g => {
                    const name = typeof g === 'string' ? g : g.name;
                    genreScores[name] = (genreScores[name] || 0) + 0.3;
                });
            }
        });

        // Strong negative weight for low-rated genres (avoid completely)
        lowRatedMovies.forEach(review => {
            const movie = movies.find(m => m.id.toString() === review.movieId.toString());
            if (movie && movie.genres) {
                movie.genres.forEach(g => {
                    const name = typeof g === 'string' ? g : g.name;
                    genreScores[name] = (genreScores[name] || 0) - (5 - review.rating) * 2;
                });
            }
        });

        // Identify preferred genres (only positive scores with multiple ratings)
        const preferredGenres = Object.keys(genreScores).filter(genre =>
            genreScores[genre] > 5 && (genreCount[genre] || 0) >= 1
        );


        // STRICT FILTERING: Only recommend movies from preferred genres
        const moviesWithScores = unratedMovies
            .filter(movie => {
                // Movie must have at least one preferred genre
                if (!movie.genres || movie.genres.length === 0) return false;
                return movie.genres.some(g => {
                    const name = typeof g === 'string' ? g : g.name;
                    return preferredGenres.includes(name);
                });
            })
            .map(movie => {
                let score = 0;
                let matchingGenres = 0;
                let hasNegativeGenre = false;

                movie.genres.forEach(g => {
                    const name = typeof g === 'string' ? g : g.name;
                    const genreScore = genreScores[name] || 0;
                    if (genreScore > 0 && preferredGenres.includes(name)) {
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

        // Final Safety Net: If somehow still empty, just show top rated unrated movies
        if (recommendedMovies.length === 0) {
            // console.log("⚠️ Personalization yielded 0 results. Falling back to Top Rated.");
            recommendedMovies = unratedMovies
                .sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0))
                .slice(0, 6);
        }


        setRecommended(recommendedMovies);
    };

    const fetchDefaultRecommendations = async () => {
        // racing timeout for recommendations too
        try {
            const cloudFetchPromise = (async () => {
                const moviesRef = collection(db, 'movies');
                const snapshot = await getDocs(moviesRef);
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            })();

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Cloud Timeout")), 2000)
            );

            const allMovies = await Promise.race([cloudFetchPromise, timeoutPromise]);
            const sorted = allMovies
                .sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0))
                .slice(0, 6);
            setRecommended(sorted);
        } catch (err) {
            // console.log("Using Local API for default recommendations (Offline or Slow)");
            try {
                const res = await api.get('/movies/recommendations/');
                setRecommended(res.data.slice(0, 6));
            } catch (apiErr) {
                // If recommendations fail, just use the first few movies we already have
                if (movies.length > 0) {
                    setRecommended(movies.slice(0, 6));
                }
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
            //gridTemplateColumns: 'repeat(5, 1fr)',
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

            <h1 style={styles.heading}>✨ Recently Added</h1>
            <div style={styles.grid}>
                {[...movies]
                    .sort((a, b) => {
                        // Numeric ID comparison for Django movies
                        const idA = Number(a.id) || 0;
                        const idB = Number(b.id) || 0;
                        return idB - idA;
                    })
                    .slice(0, 10)
                    .map(movie => (
                        <div key={movie.id} onClick={() => handleMovieClick(movie)}>
                            <MovieCard movie={movie} />
                        </div>
                    ))}
            </div>

            <h1 style={styles.heading}>🔥 Top Rated</h1>
            <div style={styles.grid}>
                {movies
                    .filter(m => {
                        const rating = parseFloat(m.average_rating || m.rating || 0);
                        return rating >= 4.0;
                    })
                    .sort((a, b) => {
                        const rA = parseFloat(a.average_rating || 0);
                        const rB = parseFloat(b.average_rating || 0);
                        return rB - rA;
                    })
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
                    .filter(m => {
                        if (!m.genres) return false;
                        const gArr = Array.isArray(m.genres) ? m.genres : m.genres.split(',');
                        return gArr.some(g => {
                            const name = typeof g === 'string' ? g : g.name;
                            return name === 'Action';
                        });
                    })
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
                    .filter(m => {
                        if (!m.genres) return false;
                        const gArr = Array.isArray(m.genres) ? m.genres : m.genres.split(',');
                        return gArr.some(g => {
                            const name = typeof g === 'string' ? g : g.name;
                            return name === 'Comedy';
                        });
                    })
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
                    .filter(m => {
                        if (!m.genres) return false;
                        const gArr = Array.isArray(m.genres) ? m.genres : m.genres.split(',');
                        return gArr.some(g => {
                            const name = typeof g === 'string' ? g : g.name;
                            return name === 'Drama';
                        });
                    })
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

            <Modal
                isOpen={!!selectedMovie}
                onClose={closeModal}
                movie={selectedMovie}
                onReviewSubmitted={fetchMovies}
            />
        </div>
    );
};

export default HomePage;
