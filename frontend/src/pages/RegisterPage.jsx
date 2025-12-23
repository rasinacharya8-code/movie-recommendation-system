import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';

const RegisterPage = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, {
                displayName: username
            });

            alert('Registration Successful! Welcome.');
            navigate('/');
        } catch (err) {
            console.error(err);
            let msg = 'Registration Failed';
            if (err.code === 'auth/email-already-in-use') msg = 'Email already in use.';
            if (err.code === 'auth/weak-password') msg = 'Password should be at least 6 characters.';
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

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h2 style={styles.title}>Create Account</h2>
                <p style={styles.subtitle}>Join our movie community</p>

                {error && <div style={styles.error}>{error}</div>}

                <button onClick={handleGoogleSignIn} style={styles.googleBtn}>
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={styles.googleIcon} />
                    Sign up with Google
                </button>

                <div style={styles.divider}>
                    <span style={styles.dividerText}>or</span>
                </div>

                <form onSubmit={handleRegister} style={styles.form}>
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        style={styles.input}
                        required
                    />
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
                        {loading ? 'Creating Account...' : 'Sign Up'}
                    </button>
                </form>
                <p style={styles.footerText}>
                    Already have an account? <Link to="/login" style={styles.link}>Login</Link>
                </p>
            </div>
        </div>
    );
};

const styles = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
        fontFamily: "'Inter', sans-serif",
    },
    card: {
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '40px',
        borderRadius: '15px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        textAlign: 'center',
        color: '#fff',
    },
    title: {
        margin: '0 0 10px 0',
        fontSize: '2rem',
        fontWeight: '700',
        background: 'linear-gradient(45deg, #ff00cc, #333399)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
    },
    subtitle: {
        margin: '0 0 30px 0',
        color: '#ccc',
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
        border: '1px solid rgba(255, 255, 255, 0.1)',
        background: 'rgba(0, 0, 0, 0.2)',
        color: '#fff',
        fontSize: '1rem',
        outline: 'none',
        transition: 'all 0.3s ease',
    },
    button: {
        padding: '12px',
        borderRadius: '8px',
        border: 'none',
        background: 'linear-gradient(90deg, #ff00cc, #333399)',
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
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        lineHeight: '0.1em',
        margin: '10px 0 20px',
        color: 'rgba(255,255,255,0.5)',
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
        color: '#aaa',
        fontSize: '0.9rem',
    },
    link: {
        color: '#fff',
        textDecoration: 'none',
        fontWeight: 'bold',
    },
};

export default RegisterPage;
