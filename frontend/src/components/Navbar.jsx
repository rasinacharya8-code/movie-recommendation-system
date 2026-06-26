import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useTheme } from '../context/ThemeContext';
import { auth, db } from '../firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';

const Navbar = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const searchRef = useRef(null);
    const { isDark, toggleTheme, colors } = useTheme();

    useEffect(() => {
        // Listen to auth state changes
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchTerm.trim()) {
                fetchSearchResults();
            } else {
                setResults([]);
                setShowDropdown(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    const fetchSearchResults = async () => {
        try {
            // 1. Fetch from Firestore
            const moviesRef = collection(db, 'movies');
            const snapshot = await getDocs(moviesRef);
            const firestoreMovies = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })).filter(movie =>
                movie.title?.toLowerCase().includes(searchTerm.toLowerCase())
            );

            // 2. Fetch from Local Django API
            let djangoMovies = [];
            try {
                const res = await api.get(`/movies/?search=${searchTerm}`);
                djangoMovies = res.data;
            } catch (djangoErr) {
                console.error("Django search fallback failed", djangoErr);
            }

            // 3. Merge results (Avoid duplicates by title)
            const movieMap = new Map();

            // Prioritize Django results for titles because they have calculated ratings/years
            djangoMovies.forEach(m => movieMap.set(m.title.toLowerCase(), m));

            // Add Firestore results if not already present
            firestoreMovies.forEach(m => {
                const key = m.title.toLowerCase();
                if (!movieMap.has(key)) {
                    movieMap.set(key, m);
                }
            });

            const combinedResults = Array.from(movieMap.values());
            setResults(combinedResults);
            setShowDropdown(combinedResults.length > 0);
        } catch (err) {
            console.error("Hybrid search failed", err);
            setShowDropdown(false);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/login');
        } catch (err) {
            console.error('Logout failed', err);
        }
    };

    const handleResultClick = (movie) => {
        setShowDropdown(false);
        setSearchTerm('');
        navigate(`/search?query=${encodeURIComponent(movie.title)}`);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && searchTerm.trim()) {
            setShowDropdown(false);
            navigate(`/search?query=${encodeURIComponent(searchTerm)}`);
        }
    };

    const handleViewAll = () => {
        setShowDropdown(false);
        navigate(`/search?query=${encodeURIComponent(searchTerm)}`);
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const styles = {
        nav: {
            display: 'flex',
            justifyContent: 'space-between',
            padding: '1rem 2rem',
            background: colors.navBg,
            backdropFilter: 'blur(10px)',
            color: colors.text,
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 1000,
            boxShadow: '0 4px 30px rgba(0, 0, 0, 0.5)',
            borderBottom: `1px solid ${colors.border}`,
            flexWrap: 'wrap',
            gap: '1rem',
        },
        logo: {
            fontWeight: '900',
            fontSize: '1.8rem',
            background: `linear-gradient(45deg, ${colors.accent}, ${colors.accentSecondary})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textDecoration: 'none',
        },
        searchContainer: {
            position: 'relative',
            width: '100%',
            maxWidth: '500px',
            flex: '1',
            minWidth: '200px',
            zIndex: 1001,
        },
        searchInput: {
            width: '100%',
            padding: '10px 15px',
            borderRadius: '20px',
            border: `1px solid ${colors.border}`,
            background: colors.inputBg,
            color: colors.text,
            fontSize: '1rem',
            outline: 'none',
            transition: 'all 0.3s',
        },
        dropdown: {
            position: 'absolute',
            top: '110%',
            left: 0,
            right: 0,
            background: colors.modalBg,
            borderRadius: '10px',
            overflow: 'hidden',
            boxShadow: '0 10px 40px rgba(0,0,0,0.7)',
            border: `1px solid ${colors.border}`,
            zIndex: 1002,
        },
        dropdownItem: {
            display: 'flex',
            alignItems: 'center',
            padding: '10px',
            cursor: 'pointer',
            borderBottom: `1px solid ${colors.border}`,
            transition: 'background 0.2s',
        },
        thumb: {
            width: '40px',
            height: '60px',
            objectFit: 'cover',
            borderRadius: '4px',
            marginRight: '10px',
        },
        itemInfo: {
            flex: 1,
        },
        itemTitle: {
            fontWeight: 'bold',
            fontSize: '0.95rem',
            color: colors.text,
        },
        itemYear: {
            fontSize: '0.8rem',
            color: colors.textSecondary,
        },
        viewAll: {
            padding: '12px',
            textAlign: 'center',
            background: colors.inputBg,
            cursor: 'pointer',
            color: colors.accent,
            fontWeight: '600',
            fontSize: '0.9rem',
        },
        links: {
            display: 'flex',
            gap: '1.5rem',
            alignItems: 'center',
            flexWrap: 'wrap',
        },
        link: {
            color: colors.text,
            textDecoration: 'none',
            fontSize: '1rem',
            fontWeight: '500',
            transition: 'color 0.2s',
            opacity: 0.9,
        },
        text: {
            marginRight: '10px',
            color: colors.textSecondary,
        },
        button: {
            background: 'transparent',
            color: '#ff6b6b',
            border: '1px solid #ff6b6b',
            padding: '6px 15px',
            cursor: 'pointer',
            borderRadius: '20px',
            fontSize: '0.9rem',
            transition: 'all 0.2s',
        },
        themeToggle: {
            background: 'transparent',
            border: `1px solid ${colors.border}`,
            color: colors.text,
            padding: '8px 12px',
            borderRadius: '50%',
            cursor: 'pointer',
            fontSize: '1.2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s',
        },
        avatar: {
            width: '35px',
            height: '35px',
            borderRadius: '50%',
            background: `linear-gradient(45deg, ${colors.accent}, ${colors.accentSecondary})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.85rem',
            color: '#fff',
            fontWeight: '700',
            cursor: 'pointer',
            border: `2px solid ${colors.border}`,
            textDecoration: 'none',
        },
        avatarImg: {
            width: '35px',
            height: '35px',
            borderRadius: '50%',
            objectFit: 'cover',
            border: `2px solid ${colors.border}`,
        }
    };

    return (
        <nav style={styles.nav}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <Link to="/" style={{ ...styles.logo, fontSize: '1.4rem' }}>🎬 Movie Recommendation System</Link>
            </div>

            <div style={styles.searchContainer} ref={searchRef}>
                <input
                    type="text"
                    placeholder="Search movies..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
                    style={styles.searchInput}
                />
                {showDropdown && results.length > 0 && (
                    <div style={styles.dropdown}>
                        {results.slice(0, 5).map(movie => (
                            <div
                                key={movie.id}
                                onClick={() => handleResultClick(movie)}
                                style={styles.dropdownItem}
                            >
                                <img src={movie.poster_url} alt={movie.title} style={styles.thumb} />
                                <div style={styles.itemInfo}>
                                    <div style={styles.itemTitle}>{movie.title}</div>
                                    <div style={styles.itemYear}>
                                        {movie.release_year || movie.release_date?.split('-')[0]}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {results.length > 5 && (
                            <div onClick={handleViewAll} style={styles.viewAll}>
                                View all results for "{searchTerm}"
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div style={styles.links}>
                <button onClick={toggleTheme} style={styles.themeToggle} title="Toggle theme">
                    {isDark ? '☀️' : '🌙'}
                </button>
                <Link to="/" style={styles.link}>Home</Link>

                {user ? (
                    <>
                        <span style={styles.text}>Hi, {user.displayName?.split(' ')[0] || user.email.split('@')[0]}</span>
                        <button onClick={handleLogout} style={styles.button}>Logout</button>
                        <Link to="/profile" style={styles.link}>Profile</Link>
                    </>
                ) : (
                    <>
                        <Link to="/login" style={styles.link}>Login</Link>
                        <Link to="/register" style={styles.link}>Register</Link>
                    </>
                )}
            </div>
        </nav >
    );
};

export default Navbar;
