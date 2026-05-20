import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API } from '../../context/AuthContext';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/dashboard-stats')
      .then(({ data }) => setStats(data))
      .catch(() => setStats({
        pets: {}, applications: {}, volunteers: {}, donations: {}, lostFound: {}
      }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  const s = stats || { pets: {}, applications: {}, volunteers: {}, donations: {}, lostFound: {} };
  const lf = s.lostFound || {};

  return (
    <div>

      {/* ── Top stat cards ───────────────────────────────────────────────── */}
      <div style={styles.statsGrid}>
        <StatCard
          title="Total Pets"
          value={s.pets?.total || 0}
          sub={`${s.pets?.available || 0} Available`}
          icon="🐾" color="#e8f5e9" />
        <StatCard
          title="Adopted"
          value={s.pets?.adopted || 0}
          sub="Successfully adopted"
          icon="🏠" color="#e3f2fd" />
        <StatCard
          title="Active Volunteers"
          value={s.volunteers?.total || 0}
          sub="Helping this month"
          icon="🤝" color="#fff3e0" />
        <StatCard
          title="Fund Raised"
          value={`₱${Number(s.donations?.raised || 0).toLocaleString()}`}
          sub={`${s.applications?.pending || 0} adoption apps pending`}
          icon="💚" color="#f3e5f5" />
        <StatCard
          title="Lost & Found Reports"
          value={lf.total || 0}
          sub={`${lf.pending || 0} Pending Review`}
          icon="🔍" color="#fef9c3" />
        <StatCard
          title="Reunited Pets"
          value={lf.reunited || 0}
          sub="Happy endings 🐾"
          icon="💛" color="#dcfce7" />
      </div>

      {/* ── Quick stats row ──────────────────────────────────────────────── */}
      <div style={styles.quickGrid}>

        {/* Adoption Applications */}
        <div className="card" style={{ flex: 1 }}>
          <h3 style={styles.cardTitle}>Adoption Applications</h3>
          <div style={styles.miniStats}>
            {[
              { label: 'Total',          val: s.applications?.total   || 0, color: 'var(--text-dark)' },
              { label: 'Pending Review', val: s.applications?.pending || 0, color: '#f59e0b' },
            ].map(i => (
              <div key={i.label} style={styles.miniStat}>
                <span style={{ ...styles.miniVal, color: i.color }}>{i.val}</span>
                <span style={styles.miniLabel}>{i.label}</span>
              </div>
            ))}
          </div>
          <Link to="/admin/pets" style={styles.cardLink}>View all applications →</Link>
        </div>

        {/* Pet Status */}
        <div className="card" style={{ flex: 1 }}>
          <h3 style={styles.cardTitle}>Pet Status Overview</h3>
          <div style={styles.miniStats}>
            {[
              { label: 'Available', val: s.pets?.available || 0, color: '#2d6a4f' },
              { label: 'Adopted',   val: s.pets?.adopted   || 0, color: '#1565c0' },
            ].map(i => (
              <div key={i.label} style={styles.miniStat}>
                <span style={{ ...styles.miniVal, color: i.color }}>{i.val}</span>
                <span style={styles.miniLabel}>{i.label}</span>
              </div>
            ))}
          </div>
          <Link to="/admin/pets" style={styles.cardLink}>Manage pets →</Link>
        </div>

        {/* Volunteer Summary */}
        <div className="card" style={{ flex: 1 }}>
          <h3 style={styles.cardTitle}>Volunteer Summary</h3>
          <div style={styles.miniStats}>
            <div style={styles.miniStat}>
              <span style={{ ...styles.miniVal, color: '#e65100' }}>{s.volunteers?.total || 0}</span>
              <span style={styles.miniLabel}>Active Volunteers</span>
            </div>
          </div>
          <Link to="/admin/volunteers" style={styles.cardLink}>Manage volunteers →</Link>
        </div>

        {/* Lost & Found Summary */}
        <div className="card" style={{ flex: 1 }}>
          <h3 style={styles.cardTitle}>Lost &amp; Found</h3>
          <div style={styles.miniStats}>
            {[
              { label: 'Lost',     val: lf.lost     || 0, color: '#dc2626' },
              { label: 'Found',    val: lf.found    || 0, color: '#16a34a' },
              { label: 'Reunited', val: lf.reunited || 0, color: '#166534' },
            ].map(i => (
              <div key={i.label} style={styles.miniStat}>
                <span style={{ ...styles.miniVal, color: i.color }}>{i.val}</span>
                <span style={styles.miniLabel}>{i.label}</span>
              </div>
            ))}
          </div>
          <Link to="/admin/lost-and-found" style={styles.cardLink}>Manage reports →</Link>
        </div>

      </div>

      {/* ── Quick Actions ────────────────────────────────────────────────── */}
      <div className="card" style={{ marginTop: 20 }}>
        <h3 style={styles.cardTitle}>Quick Actions</h3>
        <div style={styles.actionsGrid}>
          {[
            { to: '/admin/pets',            icon: '➕', label: 'Add New Pet',            desc: 'Register a new pet to the shelter',        bg: '#e8f5e9', border: '#a7d7b8' },
            { to: '/admin/community',       icon: '📣', label: 'Create Campaign',         desc: 'Launch a new community event or drive',    bg: '#fff3e0', border: '#fcd4a0' },
            { to: '/admin/volunteers',      icon: '🤝', label: 'Manage Volunteers',       desc: 'Review and approve volunteer applications', bg: '#fef9c3', border: '#fde68a' },
            { to: '/admin/lost-and-found',  icon: '🔍', label: 'Review L&F Reports',      desc: 'Approve or manage lost and found reports', bg: '#ede9fe', border: '#c4b5fd' },
          ].map(a => (
            <Link key={a.to} to={a.to} style={{ ...styles.actionCard, background: a.bg, borderColor: a.border }}>
              <span style={{ fontSize: 26, marginBottom: 8, display: 'block' }}>{a.icon}</span>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{a.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.desc}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Quick Navigation ─────────────────────────────────────────────── */}
      <div className="card" style={{ marginTop: 20 }}>
        <h3 style={styles.cardTitle}>Quick Navigation</h3>
        <div style={styles.navGrid}>
          {[
            { to: '/admin/pets',           icon: '🐾', label: 'Pets & Adoptions',       desc: 'Manage pet records and adoption applications' },
            { to: '/admin/volunteers',     icon: '🤝', label: 'Volunteers & Donors',     desc: 'Manage volunteers and track donations' },
            { to: '/admin/community',      icon: '📢', label: 'Community & Campaigns',   desc: 'Create and manage events and campaigns' },
            { to: '/admin/lost-and-found', icon: '🔍', label: 'Lost & Found',            desc: 'Review, approve, and manage pet reports' },
          ].map(n => (
            <Link key={n.to} to={n.to} style={styles.navCard}>
              <span style={{ fontSize: 28, marginBottom: 8, display: 'block' }}>{n.icon}</span>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{n.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{n.desc}</div>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}

// ─── Stat Card Component ───────────────────────────────────────────────────────
function StatCard({ title, value, sub, icon, color }) {
  return (
    <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Fraunces',serif", marginBottom: 4 }}>{value}</div>
        <div style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 500 }}>{sub}</div>
      </div>
      <div style={{ width: 48, height: 48, background: color, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
        {icon}
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 16,
    marginBottom: 20,
  },
  quickGrid: {
    display: 'flex',
    gap: 16,
  },
  cardTitle: { fontWeight: 700, fontSize: 15, marginBottom: 16 },
  miniStats: { display: 'flex', gap: 20, marginBottom: 16, flexWrap: 'wrap' },
  miniStat: { display: 'flex', flexDirection: 'column', gap: 4 },
  miniVal: { fontSize: 26, fontWeight: 700, fontFamily: "'Fraunces',serif" },
  miniLabel: { fontSize: 12, color: 'var(--text-muted)' },
  cardLink: { color: 'var(--primary)', fontSize: 13, fontWeight: 500, textDecoration: 'none' },
  actionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 14,
  },
  actionCard: {
    border: '1.5px solid',
    borderRadius: 'var(--radius-md)',
    padding: '18px 16px',
    textDecoration: 'none',
    color: 'var(--text-dark)',
    display: 'block',
    transition: 'box-shadow 0.2s',
  },
  navGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 16,
  },
  navCard: {
    background: 'var(--green-50)',
    border: '1.5px solid var(--green-200)',
    borderRadius: 'var(--radius-md)',
    padding: '20px 18px',
    textDecoration: 'none',
    color: 'var(--text-dark)',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    display: 'block',
  },
};