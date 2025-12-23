import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import { useTheme } from '../context/ThemeContext';
import Modal from '../components/Modal';

const SearchPage = () => {
    const [searchParams] = useSearchParams();
    const query = searchParams.get('query');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedMovie, setSelectedMovie] = useState(null);
    const { colors } = useTheme();
    const [hoveredCard, setHoveredCard] = useState(null);

    useEffect(() => {
        if (query) {
            fetchResults();
        }
    }, [query]);

    const fetchResults = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get(`/movies/?search=${query}`);
            setResults(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Search error:', err);
            setError('Failed to fetch search results');
            setResults([]);
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
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '1.5rem',
            width: '100%',
        },
        card: {
            background: colors.cardBg,
            border: `1px solid ${colors.border}`,
            borderRadius: '12px',
            overflow: 'hidden',
            cursor: 'pointer',
            transition: 'transform 0.3s, box-shadow 0.3s',
            backdropFilter: 'blur(10px)',
        },
        cardHover: {
            transform: 'translateY(-8px)',
            boxShadow: '0 12px 24px rgba(0,0,0,0.3)',
        },
        poster: {
            width: '100%',
            height: '270px',
            objectFit: 'cover',
        },
        info: {
            padding: '1rem',
        },
        movieTitle: {
            margin: '0 0 0.5rem 0',
            fontSize: '1rem',
            fontWeight: '600',
            color: colors.text,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
        },
        year: {
            margin: '0 0 0.25rem 0',
            fontSize: '0.85rem',
            color: colors.textSecondary,
        },
        rating: {
            margin: 0,
            fontSize: '0.85rem',
            color: '#ffc107',
            fontWeight: '600',
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
            <h2 style={styles.title}>Search Results for "{query}"</h2>

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
                            <div
                                key={movie.id}
                                style={{
                                    ...styles.card,
                                    ...(hoveredCard === movie.id ? styles.cardHover : {})
                                }}
                                onClick={() => handleMovieClick(movie)}
                                onMouseEnter={() => setHoveredCard(movie.id)}
                                onMouseLeave={() => setHoveredCard(null)}
                            >
                                <img
                                    src={movie.poster_url || 'https://via.placeholder.com/200x300?text=No+Image'}
                                    alt={movie.title}
                                    style={styles.poster}
                                />
                                <div style={styles.info}>
                                    <h3 style={styles.movieTitle}>{movie.title}</h3>
                                    <p style={styles.year}>{movie.release_date?.split('-')[0] || 'N/A'}</p>
                                    {movie.average_rating && (
                                        <p style={styles.rating}>⭐ {movie.average_rating.toFixed(1)}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div style={styles.noResults}>
                    No movies found for "{query}". Try a different search term.
                </div>
            )}

            <Modal isOpen={!!selectedMovie} onClose={closeModal} movie={selectedMovie} />
        </div>
    );
};

export default SearchPage;
