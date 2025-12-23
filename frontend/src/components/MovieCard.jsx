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
            background: colors.cardBg,
            border: `1px solid ${colors.border}`,
            borderRadius: '12px',
            overflow: 'hidden',
            cursor: 'pointer',
            transition: 'transform 0.3s, box-shadow 0.3s',
            backdropFilter: 'blur(10px)',
            transform: isHovered ? 'translateY(-8px)' : 'translateY(0)',
            boxShadow: isHovered ? '0 12px 24px rgba(0,0,0,0.3)' : '0 4px 8px rgba(0,0,0,0.1)',
        },
        img: {
            width: '100%',
            height: '270px',
            objectFit: 'cover',
            display: imageError ? 'none' : 'block',
        },
        placeholder: {
            width: '100%',
            height: '270px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(135deg, ${colors.cardBg}, ${colors.inputBg})`,
            color: colors.textSecondary,
            fontSize: '0.9rem',
            textAlign: 'center',
            padding: '1rem',
        },
        info: {
            padding: '1rem',
        },
        title: {
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
        }
    };

    const renderStars = (rating) => {
        const stars = [];
        // Rating is already on 5-star scale, no conversion needed

        for (let i = 1; i <= 5; i++) {
            if (i <= Math.floor(rating)) {
                stars.push(<span key={i} style={{ color: '#ffc107' }}>★</span>);
            } else if (i === Math.ceil(rating) && rating % 1 !== 0) {
                stars.push(<span key={i} style={{ color: '#ffc107' }}>★</span>);
            } else {
                stars.push(<span key={i} style={{ color: '#555' }}>★</span>);
            }
        }
        return { stars, rating };
    };

    return (
        <div
            style={styles.card}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {!imageError && movie.poster_url ? (
                <img
                    src={movie.poster_url}
                    alt={movie.title}
                    style={styles.img}
                    onError={handleImageError}
                    referrerPolicy="no-referrer"
                />
            ) : (
                <div style={styles.placeholder}>
                    🎬<br />{movie.title}
                </div>
            )}
            <div style={styles.info}>
                <h3 style={styles.title}>{movie.title}</h3>
                <p style={styles.year}>{movie.release_date?.split('-')[0] || 'N/A'}</p>
                {movie.average_rating && (
                    <div style={styles.rating}>
                        {renderStars(movie.average_rating).stars}
                        <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem' }}>
                            {movie.average_rating.toFixed(1)}/5
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MovieCard;
