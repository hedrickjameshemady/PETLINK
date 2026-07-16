import { useState, useEffect } from 'react';
import { API } from '../../context/AuthContext';

const ROLE_OPTIONS = [
  { value: 'staff', label: 'Staff' },
  { value: 'admin', label: 'Admin' },
  { value: 'foster', label: 'Foster' },
  { value: 'lost_found_manager', label: 'Lost & Found Manager' },
];

const ROLE_LABELS = {
  admin: 'Admin', staff: 'Staff', foster: 'Foster', lost_found_manager: 'Lost & Found Manager',
};
const ROLE_BADGE = {
  admin: 'badge-red', staff: 'badge-blue', foster: 'badge-green', lost_found_manager: 'badge-yellow',
};

const EMPTY = { first_name: '', last_name: '', email: '', password: '', phone: '', role: 'staff' };

export default function ManageAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/auth/admin/accounts');
      setAccounts(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const showToast = (msg, err = false) => { setToast({ msg, err }); setTimeout(() => setToast(''), 3000); };

  const handleCreate = async () => {
    if (!form.first_name || !form.last_name || !form.email || !form.password) {
      showToast('Please fill in name, email and password.', true); return;
    }
    if (form.password.length < 6) { showToast('Password must be at least 6 characters.', true); return; }
    try {
      setSaving(true);
      await API.post('/auth/admin/create-account', form);
      showToast('Account created.');
      setShowForm(false);
      setForm(EMPTY);
      load();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to create account.', true);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this account? This cannot be undone.')) return;
    try {
      await API.delete(`/auth/admin/accounts/${id}`);
      showToast('Account deleted.');
      load();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to delete.', true);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces',serif", fontSize: 24, fontWeight: 700, margin: 0 }}>Manage Accounts</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '4px 0 0' }}>
            Create logins for staff, admins, fosters and lost &amp; found managers.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Create Account</button>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={th}>Name</th><th style={th}>Email</th><th style={th}>Phone</th>
                <th style={th}>Role</th><th style={th}>Created</th><th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No accounts yet.</td></tr>
              ) : accounts.map(a => (
                <tr key={a.id}>
                  <td style={td}>{a.first_name} {a.last_name}</td>
                  <td style={td}>{a.email}</td>
                  <td style={td}>{a.phone || '—'}</td>
                  <td style={td}><span className={`badge ${ROLE_BADGE[a.role] || 'badge-gray'}`}>{ROLE_LABELS[a.role] || a.role}</span></td>
                  <td style={td}>{new Date(a.created_at).toLocaleDateString()}</td>
                  <td style={td}>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(a.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Create Account</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">First Name</label>
                  <input className="form-input" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Last Name</label>
                  <input className="form-input" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Temporary Password</label>
                <input className="form-input" type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="At least 6 characters" />
              </div>
              <div className="form-group">
                <label className="form-label">Phone (optional)</label>
                <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
                <button className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
                  {saving ? 'Creating…' : 'Create Account'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: toast.err ? '#dc3545' : '#52a872', color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 14, fontWeight: 500, zIndex: 999 }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

const th = { textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)', background: 'var(--bg)' };
const td = { padding: '12px 16px', fontSize: 14, borderBottom: '1px solid #f0f0f0' };