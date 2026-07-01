import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { API, useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    API.get('/auth/me')
      .then(({ data }) => setForm(data))
      .catch(() => setForm(null));
  }, []);

  const handlePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('photo', file);
    try {
      const { data } = await API.put('/auth/profile/photo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm(prev => ({ ...prev, profile_photo: data.profile_photo }));
      updateUser({ profile_photo: data.profile_photo });
      setMsg('Photo updated');
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to upload photo');
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMsg('');
      const { data } = await API.put('/auth/profile', {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone,
        address: form.address,
        city: form.city,
        province: form.province,
      });
      setForm(data);
      updateUser({
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        profile_photo: data.profile_photo,
      });
      setMsg('Profile saved');
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  if (!form) return <div className="loading-spinner"><div className="spinner" /></div>;

  const avatar = form.profile_photo
    ? `http://localhost:5000${form.profile_photo}`
    : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(`${form.first_name} ${form.last_name}`) + '&background=e5e7eb&color=374151&size=200';

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button onClick={() => navigate(-1)} style={styles.back}>←</button>
        <h1 style={styles.title}>Profile</h1>
      </div>

      <div style={styles.card}>
        <div style={styles.avatarWrap}>
          <img src={avatar} alt="Profile" style={styles.avatar} />
          <button style={styles.changePic} onClick={() => fileRef.current.click()}>Change Picture</button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handlePhoto} />
        </div>

        <Field label="First Name" value={form.first_name} onChange={v => setForm({ ...form, first_name: v })} />
        <Field label="Last Name" value={form.last_name} onChange={v => setForm({ ...form, last_name: v })} />
        <Field label="Email" value={form.email} onChange={v => setForm({ ...form, email: v })} type="email" />
        <Field label="Phone Number" value={form.phone || ''} onChange={v => setForm({ ...form, phone: v })} />
        <Field label="Address" value={form.address || ''} onChange={v => setForm({ ...form, address: v })} />
        <Field label="City" value={form.city || ''} onChange={v => setForm({ ...form, city: v })} />
        <Field label="Province" value={form.province || ''} onChange={v => setForm({ ...form, province: v })} />

        {/* Read-only info */}
        <div style={styles.readonlyRow}>
          <span style={styles.roLabel}>Account Type</span>
          <span className="badge badge-blue" style={{ textTransform: 'capitalize' }}>{form.role}</span>
        </div>
        {form.created_at && (
          <div style={styles.readonlyRow}>
            <span style={styles.roLabel}>Member Since</span>
            <span style={styles.roValue}>
              {new Date(form.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        )}

        {msg && <div style={styles.msg}>{msg}</div>}

        <button className="btn btn-primary" style={styles.saveBtn} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        <button style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <div style={styles.group}>
      <label style={styles.label}>{label}</label>
      <input style={styles.input} type={type} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#fff', padding: '24px' },
  header: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, maxWidth: 480, margin: '0 auto 24px' },
  back: { background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-dark)' },
  title: { fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 700, margin: 0 },
  card: { maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 },
  avatarWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 8 },
  avatar: { width: 140, height: 140, borderRadius: '50%', objectFit: 'cover', border: '3px solid #f0f0f0' },
  changePic: { background: 'none', border: 'none', color: 'var(--text-dark)', fontSize: 14, cursor: 'pointer', textDecoration: 'underline' },
  group: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontWeight: 700, fontSize: 14, color: 'var(--text-dark)' },
  input: { border: '1.5px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', color: 'var(--text-dark)', outline: 'none' },
  readonlyRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' },
  roLabel: { fontWeight: 600, fontSize: 13, color: 'var(--text-muted)' },
  roValue: { fontSize: 13, color: 'var(--text-dark)' },
  msg: { fontSize: 13, color: 'var(--primary-dark)', textAlign: 'center', padding: '4px 0' },
  saveBtn: { marginTop: 8, width: '100%', justifyContent: 'center' },
  logoutBtn: { width: '100%', padding: '12px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 4 },
};