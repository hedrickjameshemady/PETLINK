import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { API, useAuth } from '../../context/AuthContext';

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

  const handleReunite = async (id) => {
    if (!window.confirm('Mark this report as Reunited? 🐾 This means your pet has been found or the found pet has been returned to its owner.')) return;
    setLfLoading(p => ({ ...p, [id]: true }));
    try {
      await API.patch(`/lostfound/${id}/reunite`);
      fetchAll();
    } catch (err) {
      alert(err?.response?.data?.error || 'Could not update. Make sure the report is approved first.');
    } finally {
      setLfLoading(p => ({ ...p, [id]: false }));
    }
  };

  const handleClose = async (id) => {
    if (!window.confirm('Close this report? It will no longer show on the public page.')) return;
    setLfLoading(p => ({ ...p, [id]: true }));
    try {
      await API.patch(`/lostfound/${id}/close`);
      fetchAll();
    } catch (err) {
      alert(err?.response?.data?.error || 'Could not close report.');
    } finally {
      setLfLoading(p => ({ ...p, [id]: false }));
    }
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
                        <div style={{ fontWeight: 600 }}>{app.pet_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{app.pet_breed} • {app.pet_type}</div>
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

        {/* My Lost & Found Reports */}
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
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>TYPE</th>
                    <th>PET NAME</th>
                    <th>DESCRIPTION</th>
                    <th>DATE REPORTED</th>
                    <th>STATUS</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {lfReports.map(r => (
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
                      <td style={{ fontWeight: 600 }}>{r.pet_name || '—'}</td>
                      <td style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 200 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.pet_description}
                        </div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {new Date(r.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td>
                        {r.status === 'Reunited'
                          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, background: '#dcfce7', color: '#15803d', fontSize: 12, fontWeight: 700 }}>🐾 Reunited</span>
                          : r.status === 'Closed'
                          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, background: '#f3f4f6', color: '#6b7280', fontSize: 12, fontWeight: 600 }}>Closed</span>
                          : StatusBadge(r.status)
                        }
                      </td>
                      <td>
                        {/* Only show action buttons if not already resolved/closed */}
                        {(r.status !== 'Reunited' && r.status !== 'Closed') && (
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'nowrap' }}>
                            <button
                              disabled={lfLoading[r.id] || r.status === 'Pending Review'}
                              onClick={() => handleReunite(r.id)}
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
                              onClick={() => handleClose(r.id)}
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
                        )}
                        {(r.status === 'Reunited' || r.status === 'Closed') && (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
};