import { Link, useLocation, useNavigate } from 'react-router-dom';
import { API, useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';

import logo from '../assets/image 16.png';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);

  // Fetch notifications when logged in, and refresh every 60 seconds
  useEffect(() => {
    if (!user) { setNotifs([]); return; }
    const load = () => API.get('/volunteers/notifications/my')
      .then(({ data }) => setNotifs(data))
      .catch(() => {});
    load();
    const timer = setInterval(load, 60000);
    return () => clearInterval(timer);
  }, [user]);

  const unread = notifs.filter(n => !n.is_read).length;

  const openNotifs = () => {
    const next = !notifOpen;
    setNotifOpen(next);
    setMenuOpen(false);
    if (next && unread > 0) {
      API.patch('/volunteers/notifications/read-all').catch(() => {});
      setNotifs(prev => prev.map(n => ({ ...n, is_read: 1 })));
    }
  };

  const links = [
    { to: '/home', label: 'Home' },
    { to: '/adopt', label: 'Adopt' },
    { to: '/volunteer', label: 'Volunteer' },
    { to: '/donate', label: 'Donate' },
    { to: '/community', label: 'Community and Campaigns' },
    { to: '/lost-and-found', label: 'Lost & Found' },
    { to: '/feedback', label: 'Feedback' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav style={styles.nav}>
      
      <Link to="/home" style={styles.logo}>
  <img src={logo} alt="PetLink" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
  <span style={styles.logoText}>PETLINK</span>
          </Link>

      <ul style={styles.links}>
        {links.map(link => (
          <li key={link.to}>
            <Link
              to={link.to}
              style={{
                ...styles.navLink,
                ...(location.pathname === link.to ? styles.activeLink : {}),
              }}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>

      <div style={styles.actions}>
        {user ? (
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ position: 'relative' }}>
              <button onClick={openNotifs} style={styles.bellBtn} title="Notifications">
                🔔
                {unread > 0 && <span style={styles.bellBadge}>{unread}</span>}
              </button>
              {notifOpen && (
                <div style={{ ...styles.dropdown, minWidth: 300, maxWidth: 340, maxHeight: 360, overflowY: 'auto' }}>
                  <div style={{ padding: '10px 14px', fontWeight: 700, fontSize: 13, borderBottom: '1px solid var(--border)' }}>
                    Notifications
                  </div>
                  {notifs.length === 0 ? (
                    <div style={{ padding: '16px 14px', fontSize: 13, color: 'var(--text-muted)' }}>
                      No notifications yet.
                    </div>
                  ) : notifs.map(n => (
                    <div key={n.id} style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: n.is_read ? 'white' : 'var(--green-50)' }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{n.title}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--text-mid)', marginTop: 2, lineHeight: 1.45 }}>{n.message}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        {new Date(n.created_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => { setMenuOpen(!menuOpen); setNotifOpen(false); }} style={styles.userBtn}>
              <span style={styles.userAvatar}>
                {user.first_name?.[0]}{user.last_name?.[0]}
              </span>
              <span>{user.first_name}</span>
              <span style={{ fontSize: 12 }}>▾</span>
            </button>
            {menuOpen && (
              <div style={styles.dropdown}>
                {(user.role === 'admin' || user.role === 'staff') ? (
                  <Link to="/admin" style={styles.dropItem} onClick={() => setMenuOpen(false)}>
                    Admin Panel
                  </Link>
                ) : (
                  <Link to="/dashboard" style={styles.dropItem} onClick={() => setMenuOpen(false)}>
                    My Dashboard
                  </Link>
                )}
                <Link to="/profile" style={styles.dropItem} onClick={() => setMenuOpen(false)}>
                  Profile
                </Link>
                <button onClick={() => { handleLogout(); setMenuOpen(false); }} style={styles.dropItemBtn}>
                  Logout
                </button>
              </div>
            )}
          </div>
       ) : (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <Link to="/register" style={styles.registerBtn}>
      Sign Up
    </Link>
    <Link to="/login" style={styles.loginBtn}>
      <span>⬥</span> Login
    </Link>
  </div>
)}
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    display: 'flex',
    alignItems: 'center',
    padding: '0 32px',
    height: 'var(--header-height)',
    background: 'white',
    borderBottom: '1px solid var(--border)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    gap: 32,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    textDecoration: 'none',
    flexShrink: 0,
  },
  logoText: {
    fontFamily: "'Fraunces', serif",
    fontWeight: 700,
    fontSize: 18,
    color: 'var(--text-dark)',
    letterSpacing: '-0.02em',
  },
  links: {
    display: 'flex',
    listStyle: 'none',
    gap: 2,
    flex: 1,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  navLink: {
    padding: '6px 10px',
    borderRadius: 'var(--radius-full)',
    color: 'var(--text-mid)',
    fontSize: 13,
    fontWeight: 450,
    transition: 'color 0.2s',
    whiteSpace: 'nowrap',
    textDecoration: 'none',
    display: 'block',
  },
  activeLink: {
    color: 'var(--primary)',
    fontWeight: 600,
  },
  actions: { flexShrink: 0 },
loginBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '9px 20px',
    background: 'var(--text-dark)',
    color: 'white',
    borderRadius: 'var(--radius-full)',
    fontSize: 14,
    fontWeight: 500,
    textDecoration: 'none',
  },
  registerBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '9px 20px',
    background: 'transparent',
    color: 'var(--text-dark)',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-full)',
    fontSize: 14,
    fontWeight: 500,
    textDecoration: 'none',
  },
  userBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 16px 6px 6px',
    background: 'var(--green-50)',
    border: '1.5px solid var(--green-200)',
    borderRadius: 'var(--radius-full)',
    color: 'var(--text-dark)',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
  bellBtn: {
    position: 'relative',
    background: 'var(--green-50)',
    border: '1.5px solid var(--green-200)',
    borderRadius: '50%',
    width: 38,
    height: 38,
    fontSize: 16,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    background: '#e53935',
    color: 'white',
    borderRadius: '50%',
    minWidth: 17,
    height: 17,
    fontSize: 10,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 3px',
  },
  userAvatar: {
    width: 28,
    height: 28,
    background: 'var(--primary)',
    color: 'white',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 700,
  },
  dropdown: {
    position: 'absolute',
    top: '110%',
    right: 0,
    background: 'white',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-md)',
    minWidth: 160,
    overflow: 'hidden',
    zIndex: 200,
  },
  dropItem: {
    display: 'block',
    padding: '12px 16px',
    color: 'var(--text-dark)',
    fontSize: 14,
    textDecoration: 'none',
    transition: 'background 0.15s',
  },
  dropItemBtn: {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: '12px 16px',
    color: '#dc3545',
    fontSize: 14,
    background: 'none',
    border: 'none',
    borderTop: '1px solid var(--border)',
    cursor: 'pointer',
  },
};