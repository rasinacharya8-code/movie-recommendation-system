import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import api from '../api';
import { useTheme } from '../context/ThemeContext';
import MovieCard from '../components/MovieCard';
import Modal from '../components/Modal';

const SearchPage = () => {
    const [searchParams] = useSearchParams();
    const queryStr = searchParams.get('query') || '';
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedMovie, setSelectedMovie] = useState(null);
    const { colors } = useTheme();
    const [hoveredCard, setHoveredCard] = useState(null);

    useEffect(() => {
        if (queryStr) {
            fetchResults();
        }
    }, [queryStr]);

    const fetchResults = async () => {
        setLoading(true);
        setError(null);
        let djangoResults = [];

        // 1. Priority: Local Django Search (Internal/SQLite)
        // Works offline and provides fast results from core catalog
        try {
            const res = await api.get(`/movies/?search=${queryStr}`);
            // Normalize Django results immediately (Handle null AND undefined)
            djangoResults = Array.isArray(res.data) ? res.data.map(m => ({
                ...m,
                average_rating: (m.average_rating !== undefined && m.average_rating !== null) ? m.average_rating : 0
            })) : [];
            setResults(djangoResults); // Show local results immediately
            setLoading(false);         // Stop loading spinner
        } catch (djangoErr) {
            console.warn("Local search failed or Django server is down", djangoErr);
        }

        // 2. Secondary: Cloud Search (Firestore)
        // Fetched in background to enrich results with user-added movies
        try {
            const moviesRef = collection(db, 'movies');
            const snapshot = await getDocs(moviesRef);
            const firestoreMovies = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })).filter(movie => {
                const titleMatch = movie.title?.toLowerCase().includes(queryStr.toLowerCase());
                const genreMatch = movie.genres?.some(g => {
                    const name = typeof g === 'string' ? g : g.name;
                    return name?.toLowerCase().includes(queryStr.toLowerCase());
                });
                return titleMatch || genreMatch;
            });

            // Merge logic (runs in background)
            const movieMap = new Map();
            djangoResults.forEach(m => movieMap.set(m.title.toLowerCase(), m));

            firestoreMovies.forEach(m => {
                const key = m.title.toLowerCase();
                const existing = movieMap.get(key);
                if (existing) {
                    movieMap.set(key, {
                        ...existing,
                        ...m,
                        id: existing.id,
                        firestore_id: m.id
                    });
                } else {
                    movieMap.set(key, {
                        ...m,
                        // Ensure defaults for Cloud-only movies too (Handle null)
                        average_rating: (m.average_rating !== undefined && m.average_rating !== null) ? m.average_rating : 0
                    });
                }
            });

            const combinedResults = Array.from(movieMap.values());
            setResults(combinedResults);
        } catch (err) {
            // console.log("Cloud search failed", err);
            if (djangoResults.length === 0) {
                setError('Could not fetch results. Please check your connection.');
            }
        } finally {
            setLoading(false);
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
            minHeight: '100vh',
            background: colors.background,
            color: colors.text,
            width: '100%',
            boxSizing: 'border-box',
        },
        title: {
            fontSize: '2rem',
            marginBottom: '2rem',
            borderBottom: `2px solid ${colors.border}`,
            paddingBottom: '1rem',
        },
        grid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '1.5rem',
            width: '100%',
        },
        loading: {
            textAlign: 'center',
            padding: '3rem',
            fontSize: '1.2rem',
            color: colors.textSecondary,
        },
        noResults: {
            textAlign: 'center',
            padding: '3rem',
            fontSize: '1.1rem',
            color: colors.textSecondary,
        },
        error: {
            textAlign: 'center',
            padding: '3rem',
            fontSize: '1.1rem',
            color: '#ff6b6b',
        },
        resultCount: {
            fontSize: '1rem',
            color: colors.textSecondary,
            marginBottom: '1rem',
        }
    };

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>Search Results for "{queryStr}"</h2>

            {loading ? (
                <div style={styles.loading}>Searching...</div>
            ) : error ? (
                <div style={styles.error}>{error}</div>
            ) : results.length > 0 ? (
                <>
                    <div style={styles.resultCount}>
                        Found {results.length} {results.length === 1 ? 'movie' : 'movies'}
                    </div>
                    <div style={styles.grid}>
                        {results.map(movie => (
                            <div key={movie.id} onClick={() => handleMovieClick(movie)}>
                                <MovieCard movie={movie} />
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div style={styles.noResults}>
                    No movies found for "{queryStr}". Try a different search term.
                </div>
            )}

            <Modal isOpen={!!selectedMovie} onClose={closeModal} movie={selectedMovie} />
        </div>
    );
};

export default SearchPage;
