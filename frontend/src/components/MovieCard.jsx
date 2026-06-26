import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

const MovieCard = ({ movie }) => {
    const { colors } = useTheme();
    const [isHovered, setIsHovered] = useState(false);
    const [imageError, setImageError] = useState(false);

    const handleImageError = () => {
        setImageError(true);
    };

    const styles = {
        card: {
            position: 'relative',
            borderRadius: '12px',
            overflow: 'hidden',
            backgroundColor: colors.cardBg,
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            cursor: 'pointer',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            transform: isHovered ? 'translateY(-5px)' : 'none',
            border: `1px solid ${colors.border}`,
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
        },
        img: {
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.5s ease',
            transform: isHovered ? 'scale(1.05)' : 'none',
        },
        placeholder: {
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#2a2a2a',
            color: '#555',
            fontSize: '1.2rem',
            textAlign: 'center',
        },
        info: {
            padding: '1rem',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
        },
        title: {
            fontSize: '1rem',
            fontWeight: '600',
            marginBottom: '0.5rem',
            color: colors.text,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
        },
        overlay: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '1.5rem',
            textAlign: 'center',
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.3s ease',
            zIndex: 2,
        },
        descText: {
            fontSize: '0.85rem',
            lineHeight: '1.4',
            display: '-webkit-box',
            WebkitLineClamp: 4,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            marginBottom: '1rem',
        }
    };

    return (
        <div
            style={styles.card}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div style={{ position: 'relative', height: '270px', overflow: 'hidden' }}>
                {!imageError && movie.poster_url ? (
                    <img
                        src={movie.poster_url}
                        alt={movie.title}
                        style={styles.img}
                        onError={handleImageError}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                    />
                ) : (
                    <div style={styles.placeholder}>
                        🎬<br />{movie.title}
                    </div>
                )}
                <div style={styles.overlay}>
                    <p style={styles.descText}>
                        {movie.description || movie.overview || 'Discover more details about this masterpiece...'}
                    </p>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <span style={{
                            fontSize: '0.8rem',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            background: colors.accent,
                            boxShadow: `0 4px 10px ${colors.accent}66`
                        }}>
                            Details
                        </span>
                        <a
                            href={movie.watch_url || `https://www.google.com/search?q=${encodeURIComponent(movie.title + " watch online streaming")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                fontSize: '0.8rem',
                                padding: '6px 12px',
                                borderRadius: '20px',
                                background: 'linear-gradient(90deg, #ff00cc, #333399)',
                                color: '#fff',
                                textDecoration: 'none',
                                fontWeight: 'bold'
                            }}
                        >
                            ▶ Watch
                        </a>
                    </div>
                </div>
            </div>
            <div style={styles.info}>
                <h3 style={styles.title}>{movie.title}</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                    {movie.genres && (Array.isArray(movie.genres) ? movie.genres : movie.genres.split(',')).slice(0, 2).map((g, i) => {
                        const name = typeof g === 'string' ? g : g.name;
                        return (
                            <span key={i} style={{
                                fontSize: '0.7rem',
                                background: colors.accent + '22',
                                color: colors.accent,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                border: `1px solid ${colors.accent}44`
                            }}>
                                {name}
                            </span>
                        );
                    })}
                    {movie.duration && (
                        <span style={{
                            fontSize: '0.7rem',
                            color: '#aaa',
                            padding: '2px 6px',
                            display: 'flex',
                            alignItems: 'center'
                        }}>
                            🕒 {movie.duration} min
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                    <span style={{ color: colors.textSecondary }}>
                        {movie.release_year || movie.year || (movie.release_date && movie.release_date.split('-')[0]) || 'N/A'}
                    </span>
                    {(() => {
                        const rating = movie.average_rating !== undefined && movie.average_rating !== null
                            ? movie.average_rating
                            : movie.rating;

                        if (rating !== undefined && rating !== null) {
                            return (
                                <>
                                    <span style={{ color: colors.textSecondary, opacity: 0.5 }}>•</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ffc107', fontWeight: '600' }}>
                                        <span>★</span>
                                        <span>{Number(rating).toFixed(1)}</span>
                                    </div>
                                </>
                            );
                        }
                        return null;
                    })()}
                </div>
            </div>
        </div>
    );
};

export default MovieCard;
