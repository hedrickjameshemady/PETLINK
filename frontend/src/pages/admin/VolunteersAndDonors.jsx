import { useState, useEffect } from 'react';
import { API } from '../../context/AuthContext';

// Use your actual uploaded image paths — adjust if your assets folder differs
import fundRaisingIcon from '../../assets/fund-raising 1.png';
import bloodDonationIcon from '../../assets/blood-donation 1.png';
import volunteeringIcon from '../../assets/volunteering 2.png';
import animalCareIcon from '../../assets/animal-care 1.png';

export default function VolunteersAndDonors() {
  const [volunteers, setVolunteers]   = useState([]);
  const [volApps,    setVolApps]      = useState([]);
  const [donations,  setDonations]    = useState([]);
  const [loading,    setLoading]      = useState(true);
  const [showAddVol, setShowAddVol]   = useState(false);
  const [viewVol,    setViewVol]      = useState(null);
  const [editVol,    setEditVol]      = useState(null);
  const [editVolForm,setEditVolForm]  = useState({});
  const [viewVolApp, setViewVolApp]   = useState(null);
  const [toast,      setToast]        = useState('');
  const [volFilter,  setVolFilter]    = useState('');
  const [appFilter,  setAppFilter]    = useState('');
  const [donFilter,  setDonFilter]    = useState('');
  const [volForm, setVolForm] = useState({
    name: '', email: '', phone: '', availability: 'Weekdays', role: '', status: 'Active',
  });

  const [stats, setStats] = useState({
    totalVolunteers:  { value: '—', weekDelta: null },
    activeThisMonth:  { value: '—', label: '' },
    totalDonors:      { value: '—', weekDelta: null },
    fundRaised:       { value: '—', weekPct: null },
  });

  /* ─── FETCH ─── */
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
      if (s) {
        const { volunteers: vs, donations: ds } = s.data;
        setStats({
          totalVolunteers: {
            value:     vs.total ?? 0,
            weekDelta: vs.added_this_week ?? null,
          },
          activeThisMonth: {
            value: vs.active ?? 0,
            label: 'This week',
          },
          totalDonors: {
            value:     ds.total_donors ?? 0,
            weekDelta: ds.added_this_week ?? null,
          },
          fundRaised: {
            value:   `₱${Number(ds.raised ?? 0).toLocaleString()}`,
            weekPct: ds.week_percent ?? null,
          },
        });
      }
    }).finally(() => setLoading(false));
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  /* ─── ACTIONS ─── */
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
    try { await API.put(`/volunteers/${editVol.id}`, editVolForm); showToast('Volunteer updated!'); }
    catch { /* demo */ }
    setVolunteers(prev => prev.map(v => v.id === editVol.id ? { ...v, ...editVolForm } : v));
    setEditVol(null);
  };

  const handleDeleteVol = async (vol) => {
    if (!window.confirm(`Remove ${vol.name} from volunteers?`)) return;
    try { await API.delete(`/volunteers/${vol.id}`); } catch { /* demo */ }
    setVolunteers(prev => prev.filter(v => v.id !== vol.id));
    showToast('Volunteer removed.');
  };

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

  /* ─── FILTERED DATA ─── */
  const filteredVols = volunteers.filter(v =>
    !volFilter || v.name?.toLowerCase().includes(volFilter.toLowerCase()) ||
    v.role?.toLowerCase().includes(volFilter.toLowerCase())
  );
  const filteredApps = volApps.filter(a =>
    !appFilter || a.name?.toLowerCase().includes(appFilter.toLowerCase()) ||
    a.preferred_role?.toLowerCase().includes(appFilter.toLowerCase())
  );
  const filteredDons = donations.filter(d =>
    !donFilter || d.name?.toLowerCase().includes(donFilter.toLowerCase()) ||
    d.type?.toLowerCase().includes(donFilter.toLowerCase())
  );

  /* ─── HELPERS ─── */
  const statusBadge = (s) => {
    const map = { Active: 'green', Inactive: 'gray', Pending: 'yellow', Approved: 'green', Rejected: 'red' };
    return <span className={`badge badge-${map[s] || 'gray'}`}>{s}</span>;
  };

  const avatarCircle = (name, bg = 'var(--green-200)') => (
    <div style={{ width: 36, height: 36, background: bg, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--primary-dark)', flexShrink: 0 }}>
      {(name || '?')[0].toUpperCase()}
    </div>
  );

  /* ─── STAT CARD ─── */
  const StatCard = ({ label, value, sub, subColor, icon, bg }) => (
    <div className="card" style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, whiteSpace: 'nowrap' }}>{label}</div>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Fraunces',serif", marginBottom: 2, lineHeight: 1.1 }}>{value}</div>
          {sub != null && (
            <div style={{ fontSize: 12, color: subColor || 'var(--primary)', fontWeight: 500 }}>
              {sub}
            </div>
          )}
        </div>
        <div style={{ width: 56, height: 56, background: bg, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 8 }}>
          <img src={icon} alt="" style={{ width: 32, height: 32, objectFit: 'contain' }} />
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {toast && (
        <div className="toast" style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}>{toast}</div>
      )}

      {/* ─── STAT CARDS ─── */}
      <div style={s.statsRow}>
        <StatCard
          label="Total Volunteers"
          value={stats.totalVolunteers.value}
          sub={stats.totalVolunteers.weekDelta != null ? `+${stats.totalVolunteers.weekDelta} this week` : null}
          subColor="var(--primary)"
          icon={volunteeringIcon}
          bg="#e8f5e9"
        />
        <StatCard
          label="Active this month"
          value={stats.activeThisMonth.value}
          sub={stats.activeThisMonth.label || null}
          subColor="var(--primary)"
          icon={animalCareIcon}
          bg="#e3f2fd"
        />
        <StatCard
          label="Total Donors"
          value={stats.totalDonors.value}
          sub={stats.totalDonors.weekDelta != null ? `+${stats.totalDonors.weekDelta} this week` : null}
          subColor="#e91e8c"
          icon={bloodDonationIcon}
          bg="#fce4ec"
        />
        <StatCard
          label="Fund Raised"
          value={stats.fundRaised.value}
          sub={stats.fundRaised.weekPct != null ? `+${stats.fundRaised.weekPct}% this week` : null}
          subColor="var(--primary)"
          icon={fundRaisingIcon}
          bg="#fff3e0"
        />
      </div>

      {/* ─── VOLUNTEER RECORD ─── */}
      <div className="card">
        <div style={s.tableHeader}>
          <h2 style={s.sectionTitle}>Volunteer Record</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              className="form-input"
              placeholder="Search name or role…"
              value={volFilter}
              onChange={e => setVolFilter(e.target.value)}
              style={{ height: 32, fontSize: 13, width: 180 }}
            />
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddVol(true)}>+ Add Volunteer</button>
          </div>
        </div>
        {/* SCROLL TABLE — same pattern as PetsAndAdoptions */}
        <div style={s.scrollTable}>
          <table style={{ minWidth: 620 }}>
            <thead>
              <tr>
                <th>NAME</th><th>CONTACT</th><th>AVAILABILITY</th>
                <th>ROLE</th><th>STATUS</th><th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={s.empty}>Loading…</td></tr>
              ) : filteredVols.length === 0 ? (
                <tr><td colSpan={6} style={s.empty}>No volunteers found.</td></tr>
              ) : filteredVols.map(v => (
                <tr key={v.id}>
                  <td>
                    <div style={s.nameCell}>
                      {avatarCircle(v.name)}
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
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button style={s.linkBtn} onClick={() => setViewVol(v)}>View</button>
                      <button style={s.linkBtn} onClick={() => { setEditVol(v); setEditVolForm({ availability: v.availability, role: v.role, status: v.status }); }}>Edit</button>
                      <button style={{ ...s.linkBtn, color: '#e53935' }} onClick={() => handleDeleteVol(v)}>Remove</button>
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
        <div style={s.tableHeader}>
          <h2 style={s.sectionTitle}>Volunteer Application</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              className="form-input"
              placeholder="Search applicants…"
              value={appFilter}
              onChange={e => setAppFilter(e.target.value)}
              style={{ height: 32, fontSize: 13, width: 180 }}
            />
          </div>
        </div>
        <div style={s.scrollTable}>
          <table style={{ minWidth: 680 }}>
            <thead>
              <tr>
                <th>NAME / EMAIL</th><th>CONTACT</th><th>AVAILABILITY</th>
                <th>PREFERRED ROLE</th><th>STATUS</th><th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={s.empty}>Loading…</td></tr>
              ) : filteredApps.length === 0 ? (
                <tr><td colSpan={6} style={s.empty}>No applications found.</td></tr>
              ) : filteredApps.map(a => (
                <tr key={a.id}>
                  <td>
                    <div style={s.nameCell}>
                      {avatarCircle(a.name, '#e3f2fd')}
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
                    <div style={{ display: 'flex', gap: 8 }}>
                      {a.status === 'Pending' && (
                        <button
                          style={{ ...s.linkBtn, color: '#2e7d32' }}
                          onClick={() => handleVolStatus(a.id, 'Approved')}
                        >Approve</button>
                      )}
                      <button style={s.linkBtn} onClick={() => setViewVolApp(a)}>View</button>
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
        <div style={s.tableHeader}>
          <h2 style={s.sectionTitle}>Donations Record</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              className="form-input"
              placeholder="Search donor or type…"
              value={donFilter}
              onChange={e => setDonFilter(e.target.value)}
              style={{ height: 32, fontSize: 13, width: 180 }}
            />
          </div>
        </div>
        <div style={s.scrollTable}>
          <table style={{ minWidth: 600 }}>
            <thead>
              <tr>
                <th>NAME / EMAIL</th><th>CONTACT</th><th>TYPE</th>
                <th>AMOUNT</th><th>DATE</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={s.empty}>Loading…</td></tr>
              ) : filteredDons.length === 0 ? (
                <tr><td colSpan={5} style={s.empty}>No donations found.</td></tr>
              ) : filteredDons.map((d, i) => (
                <tr key={d.id ?? i}>
                  <td>
                    <div style={s.nameCell}>
                      {avatarCircle(d.name, '#fff3e0')}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{d.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{d.phone}</td>
                  <td>{d.type}</td>
                  <td style={{ fontWeight: 600 }}>
                    ₱{Number(d.amount ?? 0).toLocaleString()}
                  </td>
                  <td>{d.date ? new Date(d.date).toLocaleDateString('en-PH', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ════════════════ MODALS ════════════════ */}

      {/* ADD VOLUNTEER */}
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

      {/* VIEW VOLUNTEER */}
      {viewVol && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewVol(null)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Volunteer Details</h2>
              <button className="modal-close" onClick={() => setViewVol(null)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
              {[['Name', viewVol.name],['Email', viewVol.email],['Phone', viewVol.phone],
                ['Availability', viewVol.availability],['Role', viewVol.role],['Status', viewVol.status]]
                .map(([l, v]) => (
                  <div key={l} style={s.detailRow}>
                    <span style={s.detailLbl}>{l}</span>
                    <span>{l === 'Status' ? statusBadge(v) : v}</span>
                  </div>
              ))}
            </div>
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-outline" onClick={() => setViewVol(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT VOLUNTEER */}
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

      {/* VIEW APPLICATION */}
      {viewVolApp && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewVolApp(null)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Application Details</h2>
              <button className="modal-close" onClick={() => setViewVolApp(null)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
              {[
                ['Name',          viewVolApp.name],
                ['Email',         viewVolApp.email],
                ['Phone',         viewVolApp.phone],
                ['Availability',  viewVolApp.availability],
                ['Preferred Role',viewVolApp.preferred_role],
                ['Motivation',    viewVolApp.motivation],
                ['Experience',    viewVolApp.experience],
              ].filter(([, v]) => v).map(([l, v]) => (
                <div key={l} style={s.detailRow}>
                  <span style={s.detailLbl}>{l}</span>
                  <span style={{ flex: 1 }}>{v}</span>
                </div>
              ))}
              <div style={s.detailRow}>
                <span style={s.detailLbl}>Status</span>
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

/* ─── STYLES ─── */
const s = {
  statsRow:   { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 },
  tableHeader:{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle:{ fontWeight: 700, fontSize: 16 },
  /* Same scroll logic as PetsAndAdoptions */
  scrollTable:{ overflowY: 'auto', maxHeight: 280, borderRadius: 8, border: '1px solid var(--border)' },
  nameCell:   { display: 'flex', alignItems: 'center', gap: 10 },
  linkBtn:    { background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: 0 },
  detailRow:  { display: 'flex', gap: 12, paddingBottom: 10, borderBottom: '1px solid var(--border)', alignItems: 'center' },
  detailLbl:  { minWidth: 110, color: 'var(--text-muted)', fontWeight: 500 },
  empty:      { textAlign: 'center', padding: 28, color: 'var(--text-muted)' },
};