import React, { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import MovieCard from '../components/MovieCard';

const ProfilePage = () => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [newName, setNewName] = useState('');
    const [updating, setUpdating] = useState(false);
    const [userMovies, setUserMovies] = useState([]);
    const [userReviews, setUserReviews] = useState([]);
    const [moviesLoading, setMoviesLoading] = useState(true);
    const [reviewsLoading, setReviewsLoading] = useState(true);
    const { colors } = useTheme();
    const navigate = useNavigate();

    useEffect(() => {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            navigate('/login');
            return;
        }

        setUser(currentUser);
        loadOrCreateProfile(currentUser);

        // 1. Real-time listener for user's movie contributions
        const moviesRef = collection(db, 'movies');
        const qMovies = query(moviesRef, where('addedBy', '==', currentUser.uid));

        const unsubscribeMovies = onSnapshot(qMovies, (snapshot) => {
            const myMovies = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setUserMovies(myMovies);
            setMoviesLoading(false);
        }, (err) => {
            setMoviesLoading(false);
        });

        // 2. Real-time listener for user's reviews
        const reviewsRef = collection(db, 'reviews');
        const qReviews = query(reviewsRef, where('userId', '==', currentUser.uid));

        const unsubscribeReviews = onSnapshot(qReviews, (snapshot) => {
            const myReviews = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setUserReviews(myReviews);
            setReviewsLoading(false);
        }, (err) => {
            setReviewsLoading(false);
        });

        return () => {
            unsubscribeMovies();
            unsubscribeReviews();
        };
    }, []);


    const loadOrCreateProfile = async (currentUser) => {
        try {
            const profileRef = doc(db, 'users', currentUser.uid);
            const profileSnap = await getDoc(profileRef);

            if (profileSnap.exists()) {
                const data = profileSnap.data();
                setProfile(data);
                setNewName(data.displayName || currentUser.displayName || '');
            } else {
                // Create profile on first login
                const newProfile = {
                    uid: currentUser.uid,
                    email: currentUser.email,
                    displayName: currentUser.displayName || 'Anonymous',
                    photoURL: currentUser.photoURL || null,
                    createdAt: new Date().toISOString()
                };
                await setDoc(profileRef, newProfile);
                setProfile(newProfile);
                setNewName(newProfile.displayName);
            }
        } catch (err) {
            console.error('Failed to load profile:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        if (!newName.trim()) return;

        setUpdating(true);
        try {
            // 1. Update Firebase Auth Profile
            await updateProfile(auth.currentUser, {
                displayName: newName.trim()
            });

            // 2. Update Firestore User Document
            const profileRef = doc(db, 'users', auth.currentUser.uid);
            await updateDoc(profileRef, {
                displayName: newName.trim()
            });

            setProfile(prev => ({ ...prev, displayName: newName.trim() }));
            setIsEditing(false);
            alert('Profile updated successfully! ✨');
        } catch (err) {
            console.error('Update failed:', err);
            alert('Failed to update profile. Please try again.');
        } finally {
            setUpdating(false);
        }
    };

    const styles = {
        container: {
            padding: '2rem',
            minHeight: '100vh',
            background: colors.background,
            color: colors.text,
        },
        card: {
            maxWidth: '600px',
            margin: '0 auto',
            background: colors.cardBg,
            padding: '2rem',
            borderRadius: '16px',
            border: `1px solid ${colors.border}`,
            backdropFilter: 'blur(10px)',
        },
        header: {
            textAlign: 'center',
            marginBottom: '2rem',
        },
        avatar: {
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            margin: '0 auto 1rem',
            background: `linear-gradient(45deg, ${colors.accent}, ${colors.accentSecondary})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '3rem',
            color: '#fff',
            fontWeight: '700',
        },
        avatarImg: {
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            objectFit: 'cover',
        },
        title: {
            fontSize: '2rem',
            fontWeight: '700',
            margin: '0 0 0.5rem 0',
            background: `linear-gradient(45deg, ${colors.accent}, ${colors.accentSecondary})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
        },
        subtitle: {
            color: colors.textSecondary,
            fontSize: '1rem',
        },
        infoSection: {
            marginTop: '2rem',
        },
        infoItem: {
            padding: '1rem',
            borderBottom: `1px solid ${colors.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        label: {
            fontWeight: '600',
            color: colors.text,
        },
        value: {
            color: colors.textSecondary,
        },
        loading: {
            textAlign: 'center',
            padding: '3rem',
            fontSize: '1.5rem',
            color: colors.textSecondary,
        },
        input: {
            padding: '8px 12px',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            background: colors.inputBg,
            color: colors.text,
            fontSize: '1rem',
            width: '100%',
            maxWidth: '200px',
        },
        editBtn: {
            background: colors.accent,
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: '600',
            marginLeft: '10px',
            transition: 'opacity 0.2s',
        },
        saveBtn: {
            background: colors.accentSecondary || '#4CAF50',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: '600',
        },
        cancelBtn: {
            background: 'transparent',
            color: colors.textSecondary,
            border: `1px solid ${colors.border}`,
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            marginLeft: '10px',
        },
        contributionsSection: {
            marginTop: '3rem',
            maxWidth: '1000px',
            margin: '3rem auto 0',
        },
        sectionTitle: {
            fontSize: '1.8rem',
            fontWeight: '700',
            marginBottom: '1.5rem',
            color: colors.text,
            textAlign: 'center'
        },
        movieGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '1.5rem',
            marginTop: '1rem',
        },
        noMovies: {
            textAlign: 'center',
            padding: '2rem',
            color: colors.textSecondary,
            background: colors.cardBg,
            borderRadius: '12px',
            border: `1px dashed ${colors.border}`,
        }
    };

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.loading}>Loading profile...</div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.header}>
                    <h1 style={styles.title}>{user.displayName || 'User'}</h1>
                    <p style={styles.subtitle}>Member since {new Date(profile?.createdAt).toLocaleDateString()}</p>
                </div>

                <div style={styles.infoSection}>
                    <div style={styles.infoItem}>
                        <span style={styles.label}>Email</span>
                        <span style={styles.value}>{user.email}</span>
                    </div>
                    <div style={styles.infoItem}>
                        <span style={styles.label}>Display Name</span>
                        {isEditing ? (
                            <form onSubmit={handleUpdateProfile} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    style={styles.input}
                                    placeholder="Enter new name"
                                    disabled={updating}
                                    autoFocus
                                />
                                <button type="submit" style={styles.saveBtn} disabled={updating || !newName.trim()}>
                                    {updating ? '...' : 'Save'}
                                </button>
                                <button type="button" onClick={() => setIsEditing(false)} style={styles.cancelBtn} disabled={updating}>
                                    Cancel
                                </button>
                            </form>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <span style={styles.value}>{profile?.displayName || user.displayName || 'Not set'}</span>
                                <button onClick={() => setIsEditing(true)} style={styles.editBtn}>
                                    Edit
                                </button>
                            </div>
                        )}
                    </div>
                    <div style={styles.infoItem}>
                        <span style={styles.label}>User ID</span>
                        <span style={styles.value}>{user.uid.slice(0, 8)}...</span>
                    </div>
                    <div style={styles.infoItem}>
                        <span style={styles.label}>Email Verified</span>
                        <span style={styles.value}>{user.emailVerified ? '✅ Yes' : '❌ No'}</span>
                    </div>
                </div>

                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
                    {/* Add Movie button removed for security */}
                </div>
            </div>

            <div style={{ ...styles.contributionsSection, marginBottom: '4rem' }}>
                <h2 style={styles.sectionTitle}>My Past Reviews ({userReviews.length})</h2>
                {reviewsLoading ? (
                    <div style={styles.loading}>Loading your reviews...</div>
                ) : userReviews.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                        {userReviews.map(review => (
                            <div key={review.id} style={{
                                background: colors.cardBg,
                                padding: '1.5rem',
                                borderRadius: '12px',
                                border: `1px solid ${colors.border}`,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.5rem'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: colors.text }}>{review.movieTitle}</h3>
                                    <span style={{ color: '#ffc107', fontWeight: 'bold' }}>⭐ {review.rating}</span>
                                </div>
                                <p style={{
                                    color: colors.textSecondary,
                                    fontSize: '0.9rem',
                                    margin: '0.5rem 0',
                                    lineHeight: '1.4',
                                    flex: 1
                                }}>
                                    "{review.review}"
                                </p>
                                <button
                                    onClick={() => navigate(`/movie/${review.movieId}`)}
                                    style={{
                                        background: colors.accent,
                                        color: '#fff',
                                        border: 'none',
                                        padding: '6px 12px',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '0.8rem',
                                        alignSelf: 'flex-end'
                                    }}
                                >
                                    View Movie
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={styles.noMovies}>
                        <p>You haven't reviewed any movies yet. ⭐</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfilePage;
