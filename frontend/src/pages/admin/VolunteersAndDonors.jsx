import { useState, useEffect } from 'react';
import { API } from '../../context/AuthContext';

export default function VolunteersAndDonors() {
  // ✅ Start empty — no demo data pre-filling the tables
  const [volunteers, setVolunteers] = useState([]);
  const [volApps, setVolApps] = useState([]);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddVol, setShowAddVol] = useState(false);
  const [viewVol, setViewVol] = useState(null);
  const [editVol, setEditVol] = useState(null);
  const [editVolForm, setEditVolForm] = useState({});
  const [viewVolApp, setViewVolApp] = useState(null);
  const [toast, setToast] = useState('');
  const [volForm, setVolForm] = useState({ name: '', email: '', phone: '', availability: 'Weekdays', role: '', status: 'Active' });

  // ✅ Real stats from the API
  const [stats, setStats] = useState([
    { label: 'Total Volunteers', value: '—', sub: '', icon: '🙋', color: '#e8f5e9' },
    { label: 'Active this month', value: '—', sub: '', icon: '🤜', color: '#e3f2fd' },
    { label: 'Total Donors', value: '—', sub: '', icon: '💝', color: '#fce4ec' },
    { label: 'Fund Raised', value: '—', sub: '', icon: '💰', color: '#fff3e0' },
  ]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      API.get('/volunteers').catch(() => null),
      API.get('/volunteers/applications').catch(() => null),
      API.get('/volunteers/donations').catch(() => null),
      API.get('/volunteers/stats').catch(() => null),
    ]).then(([v, a, d, s]) => {
      if (v) setVolunteers(v.data);
      if (a) setVolApps(a.data);
      if (d) setDonations(d.data);
      // ✅ Map real stats from DB into the cards
      if (s) {
        const { volunteers: vs, donations: ds } = s.data;
        setStats([
          { label: 'Total Volunteers', value: vs.total ?? 0, sub: '', icon: '🙋', color: '#e8f5e9' },
          { label: 'Active Volunteers', value: vs.active ?? 0, sub: 'Currently active', icon: '🤜', color: '#e3f2fd' },
          { label: 'Total Donors', value: ds.total_donors ?? 0, sub: '', icon: '💝', color: '#fce4ec' },
          { label: 'Fund Raised', value: `₱${Number(ds.raised ?? 0).toLocaleString()}`, sub: '', icon: '💰', color: '#fff3e0' },
        ]);
      }
    }).finally(() => setLoading(false));
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };


const handleVolStatus = async (id, status) => {
  try {
    await API.patch(`/volunteers/applications/${id}/status`, { status });
    if (status === 'Approved') {
      const { data } = await API.get('/volunteers');
      setVolunteers(data);
    }
  } catch { /* demo */ }
  setVolApps(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  showToast(`Application ${status}`);
};

  const handleEditVol = async (e) => {
    e.preventDefault();
    try {
      await API.put(`/volunteers/${editVol.id}`, editVolForm);
      showToast('Volunteer updated!');
    } catch { /* demo */ }
    setVolunteers(prev => prev.map(v => v.id === editVol.id ? { ...v, ...editVolForm } : v));
    setEditVol(null);
  };

  const handleDeleteVol = async (vol) => {
    if (!window.confirm(`Remove ${vol.name} from volunteers?`)) return;
    try {
      await API.delete(`/volunteers/${vol.id}`);
    } catch { /* demo */ }
    setVolunteers(prev => prev.filter(v => v.id !== vol.id));
    showToast('Volunteer removed.');
  };

  // ✅ Add volunteer now saves to DB via POST /volunteers
  const handleAddVol = async (e) => {
    e.preventDefault();
    try {
      const { data } = await API.post('/volunteers', volForm);
      setVolunteers(prev => [...prev, { id: data.id, ...volForm }]);
      showToast('Volunteer added!');
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to add volunteer.');
      return;
    }
    setShowAddVol(false);
    setVolForm({ name: '', email: '', phone: '', availability: 'Weekdays', role: '', status: 'Active' });
  };

  const statusBadge = (s) => {
    const map = { Active: 'green', Inactive: 'gray', Pending: 'yellow', Approved: 'green', Rejected: 'red' };
    return <span className={`badge badge-${map[s] || 'gray'}`}>{s}</span>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {toast && <div className="toast" style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}>{toast}</div>}

      {/* ─── STAT CARDS ─── */}
      <div style={styles.statsRow}>
        {stats.map(s => (
          <div key={s.label} className="card" style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Fraunces',serif", marginBottom: 4 }}>{s.value}</div>
                {s.sub && <div style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 500 }}>{s.sub}</div>}
              </div>
              <div style={{ width: 48, height: 48, background: s.color, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{s.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── VOLUNTEER RECORD ─── */}
      <div className="card">
        <div style={styles.tableHeader}>
          <h2 style={styles.sectionTitle}>Volunteer Record</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline btn-sm">▾ Filter</button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddVol(true)}>+ Add Volunteer</button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>NAME</th><th>CONTACT</th><th>AVAILABILITY</th><th>ROLE</th><th>STATUS</th><th></th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>Loading...</td></tr>
              ) : volunteers.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No volunteers yet.</td></tr>
              ) : volunteers.map(v => (
                <tr key={v.id}>
                  <td>
                    <div style={styles.nameCell}>
                      <div style={styles.avatarCircle}>{(v.name || '?')[0]}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{v.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{v.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{v.phone}</td>
                  <td>{v.availability}</td>
                  <td>{v.role}</td>
                  <td>{statusBadge(v.status)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button style={styles.linkBtn} onClick={() => setViewVol(v)}>View</button>
                      <button style={styles.linkBtn} onClick={() => { setEditVol(v); setEditVolForm({ availability: v.availability, role: v.role, status: v.status }); }}>Edit</button>
                      <button style={{ ...styles.linkBtn, color: '#dc3545' }} onClick={() => handleDeleteVol(v)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── VOLUNTEER APPLICATIONS ─── */}
      <div className="card">
        <div style={styles.tableHeader}>
          <h2 style={styles.sectionTitle}>Volunteer Application</h2>
          <button className="btn btn-outline btn-sm">▾ Filter</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>NAME/EMAIL</th><th>CONTACT</th><th>AVAILABILITY</th><th>PREFERRED ROLE</th><th>STATUS</th><th></th></tr></thead>
            <tbody>
              {volApps.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No applications yet.</td></tr>
              ) : volApps.map(a => (
                <tr key={a.id}>
                  <td>
                    <div style={styles.nameCell}>
                      <div style={styles.avatarCircle}>{(a.name || '?')[0]}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{a.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{a.phone}</td>
                  <td>{a.availability}</td>
                  <td>{a.preferred_role}</td>
                  <td>{statusBadge(a.status)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button style={styles.linkBtn} onClick={() => setViewVolApp(a)}>View</button>
                      <button style={{ ...styles.linkBtn, color: '#198754' }} onClick={() => handleVolStatus(a.id, 'Approved')}>Approve</button>
                      <button style={{ ...styles.linkBtn, color: '#dc3545' }} onClick={() => handleVolStatus(a.id, 'Rejected')}>Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── DONATIONS RECORD ─── */}
      <div className="card">
        <div style={styles.tableHeader}>
          <h2 style={styles.sectionTitle}>Donations Record</h2>
          <button className="btn btn-outline btn-sm">▾ Filter</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>NAME</th><th>CONTACT</th><th>TYPE</th><th>AMOUNT</th><th>DATE</th></tr></thead>
            <tbody>
              {donations.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No donations yet.</td></tr>
              ) : donations.map(d => (
                <tr key={d.id}>
                  <td>
                    <div style={styles.nameCell}>
                      <div style={styles.avatarCircle}>{(d.donor_name || d.name || 'D')[0]}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{d.donor_name || d.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.donor_email || d.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{d.donor_phone || d.phone}</td>
                  <td>{d.type}</td>
                  <td style={{ fontWeight: 600 }}>₱{Number(d.amount).toLocaleString()}</td>
                  <td>{new Date(d.donated_at || d.date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── ADD VOLUNTEER MODAL ─── */}
      {showAddVol && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAddVol(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Add Volunteer</h2>
              <button className="modal-close" onClick={() => setShowAddVol(false)}>✕</button>
            </div>
            <form onSubmit={handleAddVol} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="form-input" value={volForm.name} onChange={e => setVolForm({ ...volForm, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" value={volForm.email} onChange={e => setVolForm({ ...volForm, email: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={volForm.phone} onChange={e => setVolForm({ ...volForm, phone: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Availability</label>
                  <select className="form-select" value={volForm.availability} onChange={e => setVolForm({ ...volForm, availability: e.target.value })}>
                    {['Weekdays','Weekends','Both','Flexible'].map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <input className="form-input" placeholder="e.g. Pet Care, Cleaning" value={volForm.role} onChange={e => setVolForm({ ...volForm, role: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={volForm.status} onChange={e => setVolForm({ ...volForm, status: e.target.value })}>
                    <option>Active</option><option>Inactive</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddVol(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Volunteer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── VIEW VOLUNTEER MODAL ─── */}
      {viewVol && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewVol(null)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Volunteer Details</h2>
              <button className="modal-close" onClick={() => setViewVol(null)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
              {[['Name', viewVol.name], ['Email', viewVol.email], ['Phone', viewVol.phone], ['Availability', viewVol.availability], ['Role', viewVol.role], ['Status', viewVol.status]].map(([l, v]) => (
                <div key={l} style={styles.detailRow}>
                  <span style={styles.detailLbl}>{l}</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
            <button className="btn btn-outline" style={{ marginTop: 20 }} onClick={() => setViewVol(null)}>Close</button>
          </div>
        </div>
      )}

      {/* ─── EDIT VOLUNTEER MODAL ─── */}
      {editVol && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditVol(null)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Edit Volunteer — {editVol.name}</h2>
              <button className="modal-close" onClick={() => setEditVol(null)}>✕</button>
            </div>
            <form onSubmit={handleEditVol} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Availability</label>
                  <select className="form-select" value={editVolForm.availability} onChange={e => setEditVolForm({ ...editVolForm, availability: e.target.value })}>
                    {['Weekdays','Weekends','Both','Flexible'].map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={editVolForm.status} onChange={e => setEditVolForm({ ...editVolForm, status: e.target.value })}>
                    <option>Active</option><option>Inactive</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Role</label>
                  <input className="form-input" value={editVolForm.role} onChange={e => setEditVolForm({ ...editVolForm, role: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setEditVol(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── VIEW VOLUNTEER APPLICATION MODAL ─── */}
      {viewVolApp && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewVolApp(null)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Application Details</h2>
              <button className="modal-close" onClick={() => setViewVolApp(null)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
              {[
                ['Name', viewVolApp.name],
                ['Email', viewVolApp.email],
                ['Phone', viewVolApp.phone],
                ['Availability', viewVolApp.availability],
                ['Preferred Role', viewVolApp.preferred_role],
                ['Motivation', viewVolApp.motivation],
                ['Experience', viewVolApp.experience],
              ].filter(([, v]) => v).map(([l, v]) => (
                <div key={l} style={styles.detailRow}>
                  <span style={styles.detailLbl}>{l}</span>
                  <span style={{ flex: 1 }}>{v}</span>
                </div>
              ))}
              <div style={styles.detailRow}>
                <span style={styles.detailLbl}>Status</span>
                {statusBadge(viewVolApp.status)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="btn btn-danger btn-sm" onClick={() => { handleVolStatus(viewVolApp.id, 'Rejected'); setViewVolApp(null); }}>Reject</button>
              <button className="btn btn-success btn-sm" onClick={() => { handleVolStatus(viewVolApp.id, 'Approved'); setViewVolApp(null); }}>Approve</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 },
  tableHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontWeight: 700, fontSize: 16 },
  nameCell: { display: 'flex', alignItems: 'center', gap: 10 },
  avatarCircle: { width: 36, height: 36, background: 'var(--green-200)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--primary-dark)', flexShrink: 0 },
  linkBtn: { background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: 0 },
  detailRow: { display: 'flex', gap: 12, paddingBottom: 10, borderBottom: '1px solid var(--border)', alignItems: 'center' },
  detailLbl: { minWidth: 100, color: 'var(--text-muted)', fontWeight: 500 },
};