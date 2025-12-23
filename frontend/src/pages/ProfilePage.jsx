import React, { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const ProfilePage = () => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
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
    }, []);

    const loadOrCreateProfile = async (currentUser) => {
        try {
            const profileRef = doc(db, 'users', currentUser.uid);
            const profileSnap = await getDoc(profileRef);

            if (profileSnap.exists()) {
                setProfile(profileSnap.data());
            } else {
                // Create profile on first login
                const newProfile = {
                    uid: currentUser.uid,
                    email: currentUser.email,
                    displayName: currentUser.displayName || 'Anonymous',
                    photoURL: currentUser.photoURL || null,
                    createdAt: new Date().toISOString(),
                };
                await setDoc(profileRef, newProfile);
                setProfile(newProfile);
            }
        } catch (err) {
            console.error('Failed to load profile:', err);
        } finally {
            setLoading(false);
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
                    {user.photoURL ? (
                        <img src={user.photoURL} alt="Profile" style={styles.avatarImg} />
                    ) : (
                        <div style={styles.avatar}>
                            {getInitials(user.displayName || user.email)}
                        </div>
                    )}
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
                        <span style={styles.value}>{user.displayName || 'Not set'}</span>
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
            </div>
        </div>
    );
};

export default ProfilePage;
