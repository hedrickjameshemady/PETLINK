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

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setLoading(true);
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
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

      {/* Card */}
      <div style={s.card}>
        <img src={logo} style={s.logo} alt="PetLink" />
        <h2 style={s.title}>Join PetLink!</h2>

        {error && <div style={s.errBox}>{error}</div>}

        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.row}>
            <div style={{ ...s.group, flex: 1 }}>
              <label style={s.label}>First Name</label>
              <input
                style={s.input}
                type="text"
                placeholder="e.g John"
                value={form.first_name}
                onChange={e => setForm({ ...form, first_name: e.target.value })}
                required
              />
            </div>
            <div style={{ ...s.group, flex: 1 }}>
              <label style={s.label}>Last Name</label>
              <input
                style={s.input}
                type="text"
                placeholder="e.g Liam"
                value={form.last_name}
                onChange={e => setForm({ ...form, last_name: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={s.group}>
            <label style={s.label}>Email Address</label>
            <input
              style={s.input}
              type="email"
              placeholder="John@gmail.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div style={s.group}>
            <label style={s.label}>Phone Number</label>
            <input
              style={s.input}
              type="tel"
              placeholder="+639504783956"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          <div style={s.group}>
            <label style={s.label}>Password</label>
            <input
              style={s.input}
              type="password"
              placeholder="Create a strong password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
            />
            <span style={s.hint}>Password must at least 8 characters with letters and numbers</span>
          </div>

          <button type="submit" style={s.btn} disabled={loading}>
            {loading ? 'Creating account...' : 'Create my account'}
          </button>
        </form>

        <div style={s.dividerRow}>
          <div style={s.line} />
          <span style={s.orText}>Or continue with</span>
          <div style={s.line} />
        </div>

        <p style={s.switchText}>
          Already have an account?{' '}
          <Link to="/login" style={s.link}>Sign in here!</Link>
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
  pawsLeft:  { position: 'fixed', top: '28%', left: '11%', width: 100, pointerEvents: 'none', zIndex: 0 },
  pawsRight: { position: 'fixed', top: '18%', right: '9%', width: 110, pointerEvents: 'none', zIndex: 0 },

  card: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    maxWidth: 460,
    padding: '0 20px',
  },
  logo: { width: 72, height: 72, borderRadius: '50%', marginBottom: 12, objectFit: 'cover' },
  title: { fontSize: 20, fontWeight: 700, marginBottom: 24, textAlign: 'center', color: '#111' },

  errBox: {
    background: '#fff5f5', border: '1px solid #fecaca',
    borderRadius: 8, padding: '10px 14px',
    color: '#dc2626', fontSize: 13, marginBottom: 12, width: '100%',
  },

  form: { display: 'flex', flexDirection: 'column', gap: 14, width: '100%' },

  row: { display: 'flex', gap: 12 },
  group: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: 14, fontWeight: 500, color: '#222' },
  input: {
    padding: '12px 18px',
    borderRadius: 50,
    border: '1.5px solid #d1d5db',
    fontSize: 14,
    outline: 'none',
    background: '#fff',
    color: '#333',
    width: '100%',
    boxSizing: 'border-box',
  },
  hint: { fontSize: 12, color: '#2d6a4f', marginTop: 2 },

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
};