import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, API } from '../../context/AuthContext';

const NAV_ITEMS = [
  { path: '/admin', label: 'Dashboard', icon: '▦' },
  { path: '/admin/pets', label: 'Pets and Adoptions', icon: '🐾' },
  { path: '/admin/volunteers', label: 'Volunteer and Donors', icon: '🤝' },
  { path: '/admin/community', label: 'Community and Campaigns', icon: '📢' },
  { path: '/admin/lost-and-found', label: 'Lost and Found', icon: '🔍' },
];

const QUICK_ACTIONS = [
  { label: 'Add New Pet', icon: '+', color: '#52a872', link: '/admin/pets' },
  { label: 'Create Event/Campaign', icon: '+', color: '#f59e0b', link: '/admin/community' },
  { label: 'Manage Volunteers', icon: '+', color: '#ef4444', link: '/admin/volunteers' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [pendingCount, setPendingCount] = useState(0);
  useEffect(() => {
    API.get('/dashboard-stats')
      .then(({ data }) => setPendingCount(data.applications?.pending || 0))
      .catch(() => {});
  }, []);

  const isActive = (path) => path === '/admin'
    ? location.pathname === '/admin'
    : location.pathname.startsWith(path);

  return (
    <div style={styles.shell}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        {/* Logo */}
        <div style={styles.sidebarLogo}>
          <span style={{ fontSize: 20 }}>🐾</span>
          <div>
            <div style={styles.logoName}>PETLINK</div>
            <div style={styles.logoSub}>Animal Management System</div>
          </div>
        </div>

        {/* Main Modules */}
        <div style={styles.sectionLabel}>Main Modules</div>
        <nav style={styles.nav}>
          {NAV_ITEMS.map(item => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                ...styles.navItem,
                ...(isActive(item.path) ? styles.navItemActive : {}),
              }}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Quick Actions */}
        <div style={{ ...styles.sectionLabel, marginTop: 28 }}>Quick Actions</div>
        <div style={styles.quickActions}>
          {QUICK_ACTIONS.map(q => (
            <Link key={q.label} to={q.link} style={styles.quickItem}>
              <span style={{ ...styles.quickIcon, background: q.color }}>{q.icon}</span>
              <span style={{ fontSize: 13, color: 'var(--text-mid)', fontWeight: 450 }}>{q.label}</span>
            </Link>
          ))}
        </div>

        {/* User */}
        <div style={styles.sidebarUser}>
          <div style={styles.userAvatar}>
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          <div style={styles.userInfo}>
            <div style={styles.userName}>{user?.first_name} {user?.last_name}</div>
            <div style={styles.userRole}>{user?.role === 'admin' ? 'Administrator' : 'Staff'}</div>
          </div>
          <button onClick={() => { logout(); navigate('/'); }} style={styles.logoutBtn} title="Logout">⏻</button>
        </div>
      </aside>

      {/* Main */}
      <div style={styles.main}>
        {/* Top bar */}
        <header style={styles.topbar}>
          <div style={styles.pageTitle}>
            {NAV_ITEMS.find(n => isActive(n.path))?.label || 'Dashboard'}
          </div>
          <div style={styles.topbarRight}>
            <div style={styles.searchBox}>
              <span style={{ color: 'var(--text-muted)', fontSize: 16 }}>🔍</span>
              <input placeholder="Search..." style={styles.searchInput} />
            </div>
            <button style={styles.notifBtn}>
              🔔
              {pendingCount > 0 && (
                <span style={styles.notifBadge}>{pendingCount}</span>
              )}
            </button>
          </div>
        </header>

        {/* Page content */}
        <div style={styles.content}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}

const styles = {
  shell: { display: 'flex', minHeight: '100vh', background: 'var(--bg)' },
  sidebar: {
    width: 'var(--sidebar-width)',
    background: 'white',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    position: 'sticky',
    top: 0,
    height: '100vh',
    overflowY: 'auto',
    padding: '0 0 12px',
  },
  sidebarLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '18px 20px 16px',
    borderBottom: '1px solid var(--border)',
    marginBottom: 8,
  },
  logoName: { fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: 15, lineHeight: 1.2 },
  logoSub: { fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 },
  sectionLabel: { padding: '8px 20px 4px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' },
  nav: { display: 'flex', flexDirection: 'column', padding: '4px 12px', gap: 2 },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '11px 14px',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-mid)',
    fontSize: 13.5,
    fontWeight: 450,
    textDecoration: 'none',
    transition: 'all 0.15s',
  },
  navItemActive: {
    background: 'var(--primary)',
    color: 'white',
    fontWeight: 600,
  },
  navIcon: { fontSize: 15, opacity: 0.85 },
  quickActions: { display: 'flex', flexDirection: 'column', padding: '4px 12px', gap: 4 },
  quickItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', textDecoration: 'none', borderRadius: 'var(--radius-sm)' },
  quickIcon: { width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 16, fontWeight: 700, flexShrink: 0 },
  sidebarUser: {
    marginTop: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '14px 16px',
    borderTop: '1px solid var(--border)',
  },
  userAvatar: { width: 36, height: 36, background: 'var(--primary)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 },
  userInfo: { flex: 1, minWidth: 0 },
  userName: { fontSize: 13, fontWeight: 600, color: 'var(--text-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  userRole: { fontSize: 11, color: 'var(--text-muted)' },
  logoutBtn: { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 16, cursor: 'pointer', padding: 4 },
  main: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 },
  topbar: {
    height: 'var(--header-height)',
    background: 'white',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 28px',
    position: 'sticky',
    top: 0,
    zIndex: 50,
  },
  pageTitle: { fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: 20, color: 'var(--text-dark)' },
  topbarRight: { display: 'flex', alignItems: 'center', gap: 14 },
  searchBox: { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-full)', padding: '8px 16px' },
  searchInput: { background: 'none', border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 14, width: 200, color: 'var(--text-dark)' },
  notifBtn: { position: 'relative', background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' },
  notifBadge: { position: 'absolute', top: -4, right: -4, background: '#ef4444', color: 'white', borderRadius: '50%', width: 16, height: 16, fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 },
  content: { flex: 1, padding: '24px 28px', overflowY: 'auto' },
};