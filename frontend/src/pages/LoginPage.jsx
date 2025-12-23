import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { useTheme } from '../context/ThemeContext';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { colors } = useTheme();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate('/');
        } catch (err) {
            console.error(err);
            let msg = 'Login Failed';
            if (err.code === 'auth/user-not-found') msg = 'User not found.';
            if (err.code === 'auth/wrong-password') msg = 'Incorrect password.';
            if (err.code === 'auth/invalid-credential') msg = 'Invalid email or password.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
            navigate('/');
        } catch (err) {
            console.error(err);
            setError('Google Sign-In Failed');
        }
    };

    const styles = {
        container: {
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
        },
        card: {
            background: colors.cardBg,
            backdropFilter: 'blur(10px)',
            border: `1px solid ${colors.border}`,
            padding: '40px',
            borderRadius: '15px',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
            textAlign: 'center',
            color: colors.text,
        },
        title: {
            margin: '0 0 10px 0',
            fontSize: '2rem',
            fontWeight: '700',
            background: `linear-gradient(45deg, ${colors.accent}, ${colors.accentSecondary})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
        },
        subtitle: {
            margin: '0 0 30px 0',
            color: colors.textSecondary,
            fontSize: '0.9rem',
        },
        form: {
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
        },
        input: {
            padding: '12px 15px',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            background: colors.inputBg,
            color: colors.text,
            fontSize: '1rem',
            outline: 'none',
            transition: 'all 0.3s ease',
        },
        button: {
            padding: '12px',
            borderRadius: '8px',
            border: 'none',
            background: `linear-gradient(90deg, ${colors.accent}, ${colors.accentSecondary})`,
            color: '#fff',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'transform 0.2s ease',
            marginTop: '10px',
        },
        googleBtn: {
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            border: 'none',
            background: '#fff',
            color: '#333',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            marginBottom: '20px',
            transition: 'transform 0.2s ease',
        },
        googleIcon: {
            width: '20px',
            height: '20px',
        },
        divider: {
            display: 'flex',
            alignItems: 'center',
            margin: '20px 0',
        },
        dividerText: {
            width: '100%',
            textAlign: 'center',
            borderBottom: `1px solid ${colors.border}`,
            lineHeight: '0.1em',
            margin: '10px 0 20px',
            color: colors.textSecondary,
        },
        error: {
            background: 'rgba(255, 0, 0, 0.1)',
            color: '#ff6b6b',
            padding: '10px',
            borderRadius: '5px',
            marginBottom: '15px',
            fontSize: '0.9rem',
            border: '1px solid rgba(255, 0, 0, 0.2)',
        },
        footerText: {
            marginTop: '20px',
            color: colors.textSecondary,
            fontSize: '0.9rem',
        },
        link: {
            color: colors.text,
            textDecoration: 'none',
            fontWeight: 'bold',
        },
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h2 style={styles.title}>Welcome Back</h2>
                <p style={styles.subtitle}>Sign in to continue</p>

                {error && <div style={styles.error}>{error}</div>}

                <button onClick={handleGoogleSignIn} style={styles.googleBtn}>
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={styles.googleIcon} />
                    Sign in with Google
                </button>

                <div style={styles.divider}>
                    <span style={styles.dividerText}>or</span>
                </div>

                <form onSubmit={handleLogin} style={styles.form}>
                    <input
                        type="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        style={styles.input}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        style={styles.input}
                        required
                    />
                    <button type="submit" style={styles.button} disabled={loading}>
                        {loading ? 'Signing In...' : 'Sign In'}
                    </button>
                </form>
                <p style={styles.footerText}>
                    Don't have an account? <Link to="/register" style={styles.link}>Register</Link>
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
