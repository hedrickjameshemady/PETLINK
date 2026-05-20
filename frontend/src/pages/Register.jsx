import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '', phone: '', city: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setLoading(true);
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed.');
    } finally { setLoading(false); }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <Link to="/" style={styles.logo}>
          <span style={{ fontSize: 28 }}>🐾</span>
          <span style={styles.logoText}>PETLINK</span>
        </Link>
        <h2 style={styles.title}>Create an account</h2>
        <p style={styles.subtitle}>Join PETLINK and help animals find loving homes</p>

        {error && <div style={styles.errBox}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input className="form-input" placeholder="Juan" value={form.first_name} onChange={set('first_name')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input className="form-input" placeholder="Dela Cruz" value={form.last_name} onChange={set('last_name')} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="form-input" type="email" placeholder="your@email.com" value={form.email} onChange={set('email')} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder="At least 8 characters" value={form.password} onChange={set('password')} required minLength={6} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" placeholder="09XX XXX XXXX" value={form.phone} onChange={set('phone')} />
            </div>
            <div className="form-group">
              <label className="form-label">City</label>
              <input className="form-input" placeholder="Naga City" value={form.city} onChange={set('city')} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 12, fontSize: 15, borderRadius: 8 }} disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p style={styles.switchText}>
          Already have an account? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign In</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 20 },
  card: { background: 'white', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', padding: '40px 36px', width: '100%', maxWidth: 480, boxShadow: 'var(--shadow-md)' },
  logo: { display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginBottom: 28 },
  logoText: { fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: 20, color: 'var(--text-dark)' },
  title: { fontFamily: "'Fraunces',serif", fontSize: 26, fontWeight: 700, marginBottom: 6 },
  subtitle: { color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 },
  errBox: { background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: 16 },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  switchText: { textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-muted)' },
};
