import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { API, useAuth } from '../../context/AuthContext';

const PET_TYPES = ['All', 'Dog', 'Cat', 'Bird', 'Rabbit', 'Others'];
const PET_TYPE_ICONS = { Dog: '🐶', Cat: '🐱', Bird: '🐦', Rabbit: '🐰', Others: '🐾', All: '✨' };

function StatusBadge(s) {
  const map = {
    Approved: 'green',
    'Pending Review': 'yellow',
    Rejected: 'red',
    Cancelled: 'gray',
    Reunited: 'green',
    Closed: 'gray',
  };
  return <span className={`badge badge-${map[s] || 'gray'}`}>{s}</span>;
}

export default function UserDashboard() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [donations, setDonations] = useState([]);
  const [lfReports, setLfReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lfLoading, setLfLoading] = useState({});

  // Lost & Found filters
  const [lfSearch, setLfSearch] = useState('');
  const [lfTypeFilter, setLfTypeFilter] = useState('All'); // pet type filter (Dog/Cat/etc)

  const fetchAll = () => {
    Promise.all([
      API.get('/adoptions/my').catch(() => ({ data: [] })),
      API.get('/volunteers/donations/my').catch(() => ({ data: [] })),
      API.get('/lostfound/my').catch(() => ({ data: [] })),
    ]).then(([apps, dons, lf]) => {
      setApplications(apps.data);
      setDonations(dons.data);
      setLfReports(lf.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  const handleStatusChange = async (id, newStatus) => {
    const confirmMsg =
      newStatus === 'Reunited'
        ? 'Mark this report as Reunited? 🐾 This means your pet has been found or the found pet has been returned to its owner.'
        : newStatus === 'Closed'
        ? 'Close this report? It will no longer show on the public page.'
        : `Change status to "${newStatus}"?`;
    if (!window.confirm(confirmMsg)) return;
    setLfLoading(p => ({ ...p, [id]: true }));
    try {
      if (newStatus === 'Reunited') {
        await API.patch(`/lostfound/${id}/reunite`);
      } else if (newStatus === 'Closed') {
        await API.patch(`/lostfound/${id}/close`);
      } else if (newStatus === 'Approved') {
        // re-open: user can't directly approve, so just reload
        alert('Only an admin can approve reports.');
        return;
      }
      fetchAll();
    } catch (err) {
      alert(err?.response?.data?.error || 'Could not update. Make sure the report is approved first.');
    } finally {
      setLfLoading(p => ({ ...p, [id]: false }));
    }
  };

  // Filter + split reports
  const filteredLf = lfReports.filter(r => {
    const matchesType = lfTypeFilter === 'All' ? true : (r.pet_type || 'Others') === lfTypeFilter;
    const q = lfSearch.trim().toLowerCase();
    const matchesSearch = !q ? true :
      (r.pet_name || '').toLowerCase().includes(q) ||
      (r.pet_description || '').toLowerCase().includes(q) ||
      (r.last_seen_location || '').toLowerCase().includes(q);
    return matchesType && matchesSearch;
  });

  // Separate lost and found (exclude reunited from main display — keep editable in their own section below)
  const lostReports = filteredLf.filter(r => r.type === 'Lost' && r.status !== 'Reunited' && r.status !== 'Closed');
  const foundReports = filteredLf.filter(r => r.type === 'Found' && r.status !== 'Reunited' && r.status !== 'Closed');
  const resolvedReports = filteredLf.filter(r => r.status === 'Reunited' || r.status === 'Closed');

  // Group by pet_type within each report type
  const groupByPetType = (reports) => {
    const grouped = reports.reduce((acc, r) => {
      const key = r.pet_type || 'Others';
      if (!acc[key]) acc[key] = [];
      acc[key].push(r);
      return acc;
    }, {});
    const order = ['Dog', 'Cat', 'Bird', 'Rabbit', 'Others'];
    return Object.keys(grouped).sort((a, b) => order.indexOf(a) - order.indexOf(b)).map(k => ({ type: k, items: grouped[k] }));
  };

  const lostGroups = groupByPetType(lostReports);
  const foundGroups = groupByPetType(foundReports);

  const ReportTable = ({ reports }) => (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>PET NAME</th>
            <th>DESCRIPTION</th>
            <th>LOCATION</th>
            <th>DATE REPORTED</th>
            <th>STATUS</th>
            <th>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {reports.map(r => (
            <tr key={r.id}>
              <td style={{ fontWeight: 600 }}>{r.pet_name || '—'}</td>
              <td style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 180 }}>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.pet_description}
                </div>
              </td>
              <td style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 140 }}>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.last_seen_location || '—'}
                </div>
              </td>
              <td style={{ whiteSpace: 'nowrap', fontSize: 13 }}>
                {new Date(r.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
              </td>
              <td>{StatusBadge(r.status)}</td>
              <td>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'nowrap' }}>
                  <button
                    disabled={lfLoading[r.id] || r.status === 'Pending Review'}
                    onClick={() => handleStatusChange(r.id, 'Reunited')}
                    title={r.status === 'Pending Review' ? 'Must be approved first' : 'Mark as reunited'}
                    style={{
                      background: r.status === 'Pending Review' ? '#e5e7eb' : '#166534',
                      color: r.status === 'Pending Review' ? '#9ca3af' : 'white',
                      border: 'none', borderRadius: 20,
                      padding: '5px 12px', fontSize: 12, fontWeight: 600,
                      cursor: r.status === 'Pending Review' ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    🐾 Reunited
                  </button>
                  <button
                    disabled={lfLoading[r.id]}
                    onClick={() => handleStatusChange(r.id, 'Closed')}
                    style={{
                      background: 'none', border: '1.5px solid #d1d5db',
                      color: '#6b7280', borderRadius: 20,
                      padding: '5px 12px', fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', whiteSpace: 'nowrap',
                    }}
                  >
                    Close
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const SectionGroup = ({ groups, emptyMsg }) => {
    if (groups.length === 0) return (
      <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 14 }}>
        {emptyMsg}
      </div>
    );
    return (
      <>
        {groups.map(g => (
          <div key={g.type} style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, borderBottom: '1.5px solid var(--green-100)', paddingBottom: 8 }}>
              <span style={{ fontSize: 18 }}>{PET_TYPE_ICONS[g.type] || '🐾'}</span>
              <span style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: 15, color: 'var(--text-dark)' }}>{g.type}s</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--green-50)', border: '1px solid var(--green-200)', borderRadius: 20, padding: '1px 8px', fontWeight: 500 }}>
                {g.items.length}
              </span>
            </div>
            <ReportTable reports={g.items} />
          </div>
        ))}
      </>
    );
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main style={{ flex: 1, maxWidth: 1100, margin: '0 auto', width: '100%', padding: '32px' }}>

        {/* Welcome */}
        <div style={styles.welcomeCard}>
          <div style={styles.welcomeLeft}>
            <div style={styles.welcomeAvatar}>{user?.first_name?.[0]}{user?.last_name?.[0]}</div>
            <div>
              <h1 style={styles.welcomeTitle}>Welcome back, {user?.first_name}! 🐾</h1>
              <p style={styles.welcomeSub}>Manage your adoption applications and track their status.</p>
            </div>
          </div>
          <Link to="/adopt" className="btn btn-primary">Browse Pets</Link>
        </div>

        {/* Stats */}
        <div style={styles.statsRow}>
          {[
            { label: 'Total Applications', value: applications.length, icon: '📋' },
            { label: 'Pending Review', value: applications.filter(a => a.status === 'Pending Review').length, icon: '⏳' },
            { label: 'Approved', value: applications.filter(a => a.status === 'Approved').length, icon: '✅' },
            { label: 'Total Donated', value: `₱${donations.reduce((sum, d) => sum + Number(d.amount), 0).toLocaleString()}`, icon: '💚' },
          ].map(s => (
            <div key={s.label} className="card" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={styles.statIcon}>{s.icon}</div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "'Fraunces',serif" }}>{s.value}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* My Applications */}
        <div className="card" style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontWeight: 700, fontSize: 16 }}>My Adoption Applications</h2>
            <Link to="/adopt" className="btn btn-primary btn-sm">+ Apply for a Pet</Link>
          </div>
          {loading ? (
            <div className="loading-spinner"><div className="spinner" /></div>
          ) : applications.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🐾</div>
              <h3>No applications yet</h3>
              <p>Browse our pets and apply for adoption!</p>
              <Link to="/adopt" className="btn btn-primary" style={{ marginTop: 16 }}>Browse Pets</Link>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>PET</th><th>APPLIED DATE</th><th>STATUS</th><th>NOTES</th></tr></thead>
                <tbody>
                  {applications.map(app => (
                    <tr key={app.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {app.pet_photo ? (
                            <img src={app.pet_photo} alt={app.pet_name} style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', border: '1.5px solid var(--border)', flexShrink: 0 }} />
                          ) : (
                            <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--green-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, border: '1.5px solid var(--border)' }}>🐾</div>
                          )}
                          <div>
                            <div style={{ fontWeight: 600 }}>{app.pet_name}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{app.pet_breed} • {app.pet_type}</div>
                          </div>
                        </div>
                      </td>
                      <td>{new Date(app.applied_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                      <td>{StatusBadge(app.status)}</td>
                      <td style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 240 }}>{app.review_notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── My Lost & Found Reports ── */}
        <div className="card" style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontWeight: 700, fontSize: 16 }}>My Lost &amp; Found Reports</h2>
            <Link to="/lost-and-found" className="btn btn-primary btn-sm">🔍 Report a Pet</Link>
          </div>

          {loading ? (
            <div className="loading-spinner"><div className="spinner" /></div>
          ) : lfReports.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <h3>No reports yet</h3>
              <p>Help reunite pets with their owners by reporting lost or found pets!</p>
              <Link to="/lost-and-found" className="btn btn-primary" style={{ marginTop: 16 }}>Go to Lost &amp; Found</Link>
            </div>
          ) : (
            <>
              {/* Filters */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                {/* Search */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1.5px solid var(--border)', borderRadius: 'var(--radius-full)', padding: '8px 16px', maxWidth: 380, background: 'white' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by name, description or location…"
                    value={lfSearch}
                    onChange={e => setLfSearch(e.target.value)}
                    style={{ border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 13, flex: 1, color: 'var(--text-dark)', background: 'transparent' }}
                  />
                </div>
                {/* Pet type tabs */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {PET_TYPES.map(type => (
                    <button
                      key={type}
                      onClick={() => setLfTypeFilter(type)}
                      style={{
                        padding: '6px 14px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 500,
                        border: '1.5px solid', cursor: 'pointer', transition: 'all 0.15s',
                        borderColor: lfTypeFilter === type ? 'var(--primary)' : 'var(--border)',
                        background: lfTypeFilter === type ? 'var(--primary)' : 'white',
                        color: lfTypeFilter === type ? 'white' : 'var(--text-mid)',
                        fontFamily: 'inherit',
                      }}
                    >
                      {PET_TYPE_ICONS[type]} {type}
                    </button>
                  ))}
                </div>
              </div>

              {filteredLf.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                  No reports match your filter.
                </div>
              ) : (
                <>
                  {/* ── Lost Pets ── */}
                  {(lostGroups.length > 0 || lostReports.length === 0) && (
                    <div style={{ marginBottom: 28 }}>
                      <div style={styles.reportSectionHeader}>
                        <span style={{ ...styles.reportTypeBadge, background: '#fee2e2', color: '#991b1b' }}>LOST</span>
                        <span style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: 16 }}>Lost Pets</span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 20, padding: '1px 9px', fontWeight: 500 }}>
                          {lostReports.length}
                        </span>
                      </div>
                      <SectionGroup groups={lostGroups} emptyMsg="No lost pet reports match your filter." />
                    </div>
                  )}

                  {/* ── Found Pets ── */}
                  {(foundGroups.length > 0 || foundReports.length === 0) && (
                    <div style={{ marginBottom: 28 }}>
                      <div style={styles.reportSectionHeader}>
                        <span style={{ ...styles.reportTypeBadge, background: '#dcfce7', color: '#15803d' }}>FOUND</span>
                        <span style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: 16 }}>Found Pets</span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', background: '#dcfce7', border: '1px solid #86efac', borderRadius: 20, padding: '1px 9px', fontWeight: 500 }}>
                          {foundReports.length}
                        </span>
                      </div>
                      <SectionGroup groups={foundGroups} emptyMsg="No found pet reports match your filter." />
                    </div>
                  )}

                  {/* ── Resolved (Reunited / Closed) — editable status ── */}
                  {resolvedReports.length > 0 && (
                    <div>
                      <div style={styles.reportSectionHeader}>
                        <span style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: 16 }}>🐾 Reunited &amp; Closed</span>
                        <span style={{ fontSize: 12, color: '#15803d', background: '#dcfce7', border: '1px solid #86efac', borderRadius: 20, padding: '1px 9px', fontWeight: 500 }}>
                          {resolvedReports.length}
                        </span>
                      </div>
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>TYPE</th>
                              <th>PET TYPE</th>
                              <th>PET NAME</th>
                              <th>DATE REPORTED</th>
                              <th>STATUS</th>
                              <th>CHANGE STATUS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resolvedReports.map(r => (
                              <tr key={r.id}>
                                <td>
                                  <span style={{
                                    display: 'inline-block', padding: '3px 10px', borderRadius: 4,
                                    fontSize: 11, fontWeight: 700,
                                    background: r.type === 'Lost' ? '#fee2e2' : '#dcfce7',
                                    color: r.type === 'Lost' ? '#991b1b' : '#15803d',
                                  }}>
                                    {r.type.toUpperCase()}
                                  </span>
                                </td>
                                <td style={{ fontSize: 13 }}>{PET_TYPE_ICONS[r.pet_type] || '🐾'} {r.pet_type || '—'}</td>
                                <td style={{ fontWeight: 600 }}>{r.pet_name || '—'}</td>
                                <td style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                                  {new Date(r.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                </td>
                                <td>
                                  {r.status === 'Reunited'
                                    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, background: '#dcfce7', color: '#15803d', fontSize: 12, fontWeight: 700 }}>🐾 Reunited</span>
                                    : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, background: '#f3f4f6', color: '#6b7280', fontSize: 12, fontWeight: 600 }}>Closed</span>
                                  }
                                </td>
                                <td>
                                  <select
                                    disabled={lfLoading[r.id]}
                                    value={r.status}
                                    onChange={e => handleStatusChange(r.id, e.target.value)}
                                    style={{
                                      border: '1.5px solid var(--border)', borderRadius: 8,
                                      padding: '5px 10px', fontSize: 12, fontFamily: 'inherit',
                                      cursor: 'pointer', background: 'white', color: 'var(--text-dark)',
                                    }}
                                  >
                                    <option value="Reunited">🐾 Reunited</option>
                                    <option value="Closed">Closed</option>
                                  </select>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* My Donations */}
        <div className="card" style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontWeight: 700, fontSize: 16 }}>My Donations</h2>
            <Link to="/donate" className="btn btn-primary btn-sm">💚 Donate Again</Link>
          </div>
          {loading ? (
            <div className="loading-spinner"><div className="spinner" /></div>
          ) : donations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💚</div>
              <h3>No donations yet</h3>
              <p>Your donations help feed and care for shelter animals!</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>AMOUNT</th><th>PURPOSE</th><th>CAMPAIGN</th><th>DATE</th></tr></thead>
                <tbody>
                  {donations.map(d => (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>₱{Number(d.amount).toLocaleString()}</td>
                      <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{d.purpose || '—'}</td>
                      <td style={{ fontSize: 13 }}>{d.campaign_title || '—'}</td>
                      <td>{new Date(d.donated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div style={styles.quickLinks}>
          {[
            { to: '/volunteer', icon: '🤝', label: 'Become a Volunteer', desc: 'Help care for shelter animals' },
            { to: '/donate', icon: '💚', label: 'Make a Donation', desc: 'Support our mission' },
            { to: '/lost-and-found', icon: '🔍', label: 'Lost & Found', desc: 'Report or find a missing pet' },
          ].map(q => (
            <Link key={q.to} to={q.to} style={styles.quickCard}>
              <span style={{ fontSize: 28, marginBottom: 8, display: 'block' }}>{q.icon}</span>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{q.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{q.desc}</div>
            </Link>
          ))}
        </div>

      </main>
      <Footer />
    </div>
  );
}

const styles = {
  welcomeCard: { background: 'white', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, boxShadow: 'var(--shadow-sm)' },
  welcomeLeft: { display: 'flex', alignItems: 'center', gap: 16 },
  welcomeAvatar: { width: 52, height: 52, background: 'var(--primary)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700 },
  welcomeTitle: { fontFamily: "'Fraunces',serif", fontSize: 22, fontWeight: 700, marginBottom: 4 },
  welcomeSub: { color: 'var(--text-muted)', fontSize: 14 },
  statsRow: { display: 'flex', gap: 16 },
  statIcon: { width: 48, height: 48, background: 'var(--green-50)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 },
  quickLinks: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginTop: 20 },
  quickCard: { background: 'white', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 18px', textDecoration: 'none', color: 'var(--text-dark)', display: 'block', transition: 'border-color 0.2s' },
  reportSectionHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, paddingBottom: 8, borderBottom: '2px solid var(--green-100)' },
  reportTypeBadge: { display: 'inline-block', padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700 },
};