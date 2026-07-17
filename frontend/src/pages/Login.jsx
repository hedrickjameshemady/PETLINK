import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import logo      from '../assets/image 16.png';
import cornerTL  from '../assets/Group 51.png';
import cornerBL  from '../assets/Group 77.png';
import cornerBR  from '../assets/Group 73.png';
import cornerTR  from '../assets/Group 79.png';
import pawsLeft  from '../assets/Group 80.png';
import pawsRight from '../assets/Group 80.png';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [remember, setRemember] = useState(false);
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
    <div style={s.page}>

      {/* Corner decorations */}
      <img src={cornerTL} style={s.cornerTL} alt="" />
      <img src={cornerTR} style={s.cornerTR} alt="" />
      <img src={cornerBL} style={s.cornerBL} alt="" />
      <img src={cornerBR} style={s.cornerBR} alt="" />

      {/* Paw decorations */}
      <img src={pawsLeft}  style={s.pawsLeft}  alt="" />
      <img src={pawsRight} style={s.pawsRight} alt="" />
      <img src={pawsLeft}  style={s.pawsLeft2} alt="" />

      {/* Card */}
      <div style={s.card}>
        <Link to="/" style={s.backBtn}>← Back to Home</Link>
        <img src={logo} style={s.logo} alt="PetLink" />
        <h2 style={s.title}>Sign in your PetLink Account!</h2>

        {error && <div style={s.errBox}>{error}</div>}

        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.group}>
            <label style={s.label}>Email Address:</label>
            <input
              style={s.input}
              type="email"
              placeholder="Enter your Email Address"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div style={s.group}>
            <label style={s.label}>Password:</label>
            <input
              style={s.input}
              type="password"
              placeholder="Enter your Password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          <div style={s.row}>
            <label style={s.remember}>
              <input
                type="checkbox"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
                style={{ marginRight: 6 }}
              />
              Remember me
            </label>
            <a href="#" style={s.forgot}>Forgot Password?</a>
          </div>

          <button type="submit" style={s.btn} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={s.dividerRow}>
          <div style={s.line} />
          <span style={s.orText}>Or continue with</span>
          <div style={s.line} />
        </div>

        <p style={s.switchText}>
          Don't have an account?{' '}
          <Link to="/register" style={s.link}>Sign up here!</Link>
        </p>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: '100vh',
    background: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: "'Inter', sans-serif",
  },

  /* Corners */
  cornerTL: { position: 'fixed', top: 0,    left: 0,   width: 220, pointerEvents: 'none', zIndex: 0 },
  cornerTR: { position: 'fixed', top: 0,    right: 0,  width: 80,  pointerEvents: 'none', zIndex: 0 },
  cornerBL: { position: 'fixed', bottom: 0, left: 0,   width: 220, pointerEvents: 'none', zIndex: 0 },
  cornerBR: { position: 'fixed', bottom: 0, right: 0,  width: 340, pointerEvents: 'none', zIndex: 0 },

  /* Paws */
  pawsLeft:  { position: 'fixed', top: '22%',  left: '12%', width: 100, pointerEvents: 'none', zIndex: 0 },
  pawsRight: { position: 'fixed', top: '12%',  right: '9%', width: 110, pointerEvents: 'none', zIndex: 0 },
  pawsLeft2: { position: 'fixed', top: '55%',  left: '10%', width: 110, pointerEvents: 'none', zIndex: 0 },

  card: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    maxWidth: 420,
    padding: '0 20px',
  },
  logo: { width: 72, height: 72, borderRadius: '50%', marginBottom: 16, objectFit: 'cover' },
  title: { fontSize: 20, fontWeight: 700, marginBottom: 28, textAlign: 'center', color: '#111' },

  errBox: {
    background: '#fff5f5', border: '1px solid #fecaca',
    borderRadius: 8, padding: '10px 14px',
    color: '#dc2626', fontSize: 13, marginBottom: 12, width: '100%',
  },

  form: { display: 'flex', flexDirection: 'column', gap: 16, width: '100%' },

  group: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 14, fontWeight: 500, color: '#222' },
  input: {
    padding: '12px 16px',
    borderRadius: 50,
    border: '1.5px solid #d1d5db',
    fontSize: 14,
    outline: 'none',
    background: '#fff',
    color: '#333',
  },

  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  remember: { display: 'flex', alignItems: 'center', fontSize: 13, color: '#444', cursor: 'pointer' },
  forgot: { fontSize: 13, color: '#2d6a4f', textDecoration: 'none', fontWeight: 500 },

  btn: {
    marginTop: 8,
    padding: '14px',
    borderRadius: 50,
    background: '#2d6a4f',
    color: '#fff',
    fontWeight: 600,
    fontSize: 15,
    border: 'none',
    cursor: 'pointer',
    width: '100%',
  },

  dividerRow: { display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0 8px', width: '100%' },
  line: { flex: 1, height: 1, background: '#2d6a4f' },
  orText: { fontSize: 13, color: '#555', whiteSpace: 'nowrap' },

  switchText: { fontSize: 14, color: '#555', textAlign: 'center' },
  link: { color: '#2d6a4f', fontWeight: 600, textDecoration: 'none' },
  backBtn: { position: 'absolute', top: -40, left: 20, fontSize: 14, color: '#2d6a4f', fontWeight: 600, textDecoration: 'none', zIndex: 2 },
};