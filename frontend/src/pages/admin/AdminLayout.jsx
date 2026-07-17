import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, API } from '../../context/AuthContext';

// Every possible menu item, tagged with which roles are allowed to see it.
const ALL_NAV_ITEMS = [
  { path: '/admin', label: 'Dashboard', icon: '▦', roles: ['admin', 'staff'] },
  { path: '/admin/pets', label: 'Pets and Adoptions', icon: '🐾', roles: ['admin', 'staff'] },
  { path: '/admin/foster-applicants', label: 'My Foster Applicants', icon: '⭐', roles: ['foster'] },
  { path: '/admin/lost-and-found', label: 'Lost and Found', icon: '🔍', roles: ['admin', 'staff', 'lost_found_manager'] },
  { path: '/admin/volunteers', label: 'Volunteer Records', icon: '🤝', roles: ['admin', 'staff'] },
  { path: '/admin/donors', label: 'Donors', icon: '💝', roles: ['admin', 'staff'] },
  { path: '/admin/community', label: 'Community Engagement', icon: '📢', roles: ['admin', 'staff'] },
  { path: '/admin/messages', label: 'Messages', icon: '💬', roles: ['admin', 'staff'] },
  { path: '/admin/accounts', label: 'Manage Accounts', icon: '👤', roles: ['admin', 'staff'] },
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

  // Show only the menu items this user's role is allowed to see.
  const NAV_ITEMS = ALL_NAV_ITEMS.filter(item => item.roles.includes(user?.role));

  // A friendly label for each role, shown under the user's name.
  const ROLE_LABELS = {
    admin: 'Administrator',
    staff: 'Staff',
    foster: 'Foster',
    lost_found_manager: 'Lost & Found Manager',
  };
  const [pendingCount, setPendingCount] = useState(0);
  useEffect(() => {
    API.get('/dashboard-stats')
      .then(({ data }) => setPendingCount(data.applications?.pending || 0))
      .catch(() => {});
  }, []);

  // Live count of unread user messages — asks the server every 10 seconds.
  const [msgUnread, setMsgUnread] = useState(0);
  useEffect(() => {
    const tick = () => API.get('/messages/threads/meta/unread')
      .then(({ data }) => setMsgUnread(data.unread))
      .catch(() => {});
    tick();                                 // run once right away
    const t = setInterval(tick, 10000);     // then every 10s
    return () => clearInterval(t);          // stop the timer when leaving the page
  }, []);

  // Notification dropdown: two lists — unread message threads and pending applications.
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifTab, setNotifTab] = useState('messages');
  const [msgThreads, setMsgThreads] = useState([]);
  const [pendingApps, setPendingApps] = useState([]);
  useEffect(() => {
    if (!notifOpen) return;
    API.get('/messages/threads')
      .then(({ data }) => setMsgThreads((data || []).filter(t => t.unread > 0)))
      .catch(() => setMsgThreads([]));
    API.get('/dashboard-detail')
      .then(({ data }) => setPendingApps(data.pendingApplications || []))
      .catch(() => setPendingApps([]));
  }, [notifOpen]);

  const totalNotif = pendingCount + msgUnread;

  const isActive = (path) => path === '/admin'
    ? location.pathname === '/admin'
    : location.pathname.startsWith(path);

  // Fosters and lost&found managers have no Dashboard — send them to their real page.
  useEffect(() => {
    if (location.pathname === '/admin') {
      if (user?.role === 'foster') navigate('/admin/foster-applicants', { replace: true });
      else if (user?.role === 'lost_found_manager') navigate('/admin/lost-and-found', { replace: true });
    }
  }, [user, location.pathname, navigate]);

  return (
    <div style={styles.shell}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        {/* Logo */}
        <div style={styles.sidebarLogo}>
  <img src="/src/assets/image 16.png" alt="PetLink Logo" style={{ width: 36, height: 36, objectFit: 'contain' }} />
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
              {item.path === '/admin/messages' && msgUnread > 0 && (
                <span style={{
                  marginLeft: 'auto',
                  background: '#dc3545', color: '#fff',
                  fontSize: 10.5, fontWeight: 700,
                  minWidth: 18, height: 18, borderRadius: 9,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 5px',
                }}>{msgUnread}</span>
              )}
            </Link>
          ))}
        </nav>

        {/* Quick Actions — only for admin/staff */}
        {(user?.role === 'admin' || user?.role === 'staff') && (
          <>
            <div style={{ ...styles.sectionLabel, marginTop: 28 }}>Quick Actions</div>
            <div style={styles.quickActions}>
              {QUICK_ACTIONS.map(q => (
                <Link key={q.label} to={q.link} style={styles.quickItem}>
                  <span style={{ ...styles.quickIcon, background: q.color }}>{q.icon}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-mid)', fontWeight: 450 }}>{q.label}</span>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* User */}
        <div style={styles.sidebarUser}>
          <div style={styles.userAvatar}>
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          <div style={styles.userInfo}>
            <div style={styles.userName}>{user?.first_name} {user?.last_name}</div>
            <div style={styles.userRole}>{ROLE_LABELS[user?.role] || 'Staff'}</div>
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
            <div style={{ position: 'relative' }}>
              <button style={styles.notifBtn} onClick={() => setNotifOpen(o => !o)}>
                🔔
                {totalNotif > 0 && (
                  <span style={styles.notifBadge}>{totalNotif}</span>
                )}
              </button>

              {notifOpen && (
                <>
                  <div
                    onClick={() => setNotifOpen(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                  />
                  <div style={styles.notifPanel}>
                    <div style={styles.notifTabs}>
                      <button
                        onClick={() => setNotifTab('messages')}
                        style={{ ...styles.notifTab, ...(notifTab === 'messages' ? styles.notifTabActive : {}) }}
                      >
                        Messages {msgUnread > 0 && `(${msgUnread})`}
                      </button>
                      <button
                        onClick={() => setNotifTab('other')}
                        style={{ ...styles.notifTab, ...(notifTab === 'other' ? styles.notifTabActive : {}) }}
                      >
                        Other {pendingCount > 0 && `(${pendingCount})`}
                      </button>
                    </div>

                    <div style={styles.notifList}>
                      {notifTab === 'messages' ? (
                        msgThreads.length === 0 ? (
                          <div style={styles.notifEmpty}>No unread messages.</div>
                        ) : msgThreads.map(t => (
                          <div
                            key={t.thread_user_id}
                            style={styles.notifItem}
                            onClick={() => { setNotifOpen(false); navigate('/admin/messages'); }}
                          >
                            <div style={{ fontWeight: 600, fontSize: 13.5 }}>{`${t.first_name || ''} ${t.last_name || ''}`.trim() || t.email || 'User'}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                              {t.unread} unread message{t.unread > 1 ? 's' : ''}
                            </div>
                          </div>
                        ))
                      ) : (
                        pendingApps.length === 0 ? (
                          <div style={styles.notifEmpty}>No pending applications.</div>
                        ) : pendingApps.map(a => (
                          <div
                            key={`${a.app_type}-${a.id}`}
                            style={styles.notifItem}
                            onClick={() => {
                              setNotifOpen(false);
                              navigate(a.app_type === 'Volunteer' ? '/admin/volunteers' : '/admin/pets');
                            }}
                          >
                            <div style={{ fontWeight: 600, fontSize: 13.5 }}>{a.applicant_name}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                              {a.app_type === 'Volunteer'
                                ? `Volunteer application${a.preferred_role ? ` · ${a.preferred_role}` : ''}`
                                : `Wants to adopt ${a.pet_name || 'a pet'}`}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
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
  notifPanel: { position: 'absolute', top: 34, right: 0, width: 320, background: 'white', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow-md)', zIndex: 50, overflow: 'hidden' },
  notifTabs: { display: 'flex', borderBottom: '1px solid var(--border)' },
  notifTab: { flex: 1, padding: '10px 0', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' },
  notifTabActive: { color: 'var(--primary)', borderBottom: '2px solid var(--primary)' },
  notifList: { maxHeight: 320, overflowY: 'auto' },
  notifItem: { padding: '10px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer' },
  notifEmpty: { padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 },
  content: { flex: 1, padding: '24px 28px', overflowY: 'auto' },
};