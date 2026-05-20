import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setLoading(true);
      const user = await login(form.email, form.password);
      if (user.role === 'admin' || user.role === 'staff') navigate('/admin');
      else navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <Link to="/" style={styles.logo}>
          <span style={{ fontSize: 28 }}>🐾</span>
          <span style={styles.logoText}>PETLINK</span>
        </Link>
        <h2 style={styles.title}>Welcome back</h2>
        <p style={styles.subtitle}>Sign in to continue to PETLINK</p>

        {error && <div style={styles.errBox}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="form-input" type="email" placeholder="your@email.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder="Enter password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 12, fontSize: 15, borderRadius: 8 }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={styles.demoBox}>
          <div style={styles.demoTitle}>Demo Accounts</div>
          <div style={styles.demoRow}><span>Admin:</span> <code>admin@petlink.com</code> / <code>admin123</code></div>
          <div style={styles.demoRow}><span>User:</span> <code>jaceco@gmail.com</code> / <code>admin123</code></div>
        </div>

        <p style={styles.switchText}>
          Don't have an account? <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>Register</Link>
        </p>
      </div>
      <div style={styles.bg} />
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 20, position: 'relative', overflow: 'hidden' },
  bg: { position: 'fixed', bottom: -100, left: -100, width: 400, height: 400, background: 'var(--primary)', borderRadius: '50%', opacity: 0.06, pointerEvents: 'none' },
  card: { background: 'white', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', padding: '40px 36px', width: '100%', maxWidth: 420, position: 'relative', zIndex: 1, boxShadow: 'var(--shadow-md)' },
  logo: { display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginBottom: 28 },
  logoText: { fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: 20, color: 'var(--text-dark)' },
  title: { fontFamily: "'Fraunces',serif", fontSize: 26, fontWeight: 700, marginBottom: 6 },
  subtitle: { color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 },
  errBox: { background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: 16 },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  demoBox: { background: 'var(--green-50)', border: '1px solid var(--green-200)', borderRadius: 8, padding: '12px 16px', marginTop: 20, fontSize: 12 },
  demoTitle: { fontWeight: 600, color: 'var(--primary-dark)', marginBottom: 6 },
  demoRow: { display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, color: 'var(--text-mid)', flexWrap: 'wrap' },
  switchText: { textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-muted)' },
};
