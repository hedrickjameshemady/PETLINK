import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API } from '../../context/AuthContext';

import pawIcon        from '../../assets/paw 1.png';
import shareIcon      from '../../assets/share 1.png';
import loveIcon       from '../../assets/love 1.png';
import volunteerIcon  from '../../assets/volunteering 1.png';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const PHT_OFFSET = 8 * 60 * 60 * 1000;

function parseDate(dateStr) {
  return new Date(new Date(dateStr).getTime() + PHT_OFFSET);
}

function timeAgo(dateStr) {
  const diff = Date.now() - parseDate(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (days  > 0)  return `Added ${days} day${days  > 1 ? 's' : ''} ago`;
  if (hours > 0)  return `Added ${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (mins  > 0)  return `Added ${mins} min${mins  > 1 ? 's' : ''} ago`;
  return 'Just added';
}

function submittedAgo(dateStr) {
  const diff = Date.now() - parseDate(dateStr).getTime();
  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  if (days  > 0) return `Submitted ${days} day${days  > 1 ? 's' : ''} ago`;
  if (hours > 0) return `Submitted ${hours} hour${hours > 1 ? 's' : ''} ago`;
  return 'Just submitted';
}

function hoursUntil(dateStr) {
  if (!dateStr) return '';
  const diff = new Date(dateStr).getTime() - Date.now();
  const hours = Math.round(diff / 3600000);
  if (hours <= 0) return 'Starting now';
  if (hours < 24) return `${hours} hours before it start`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} away`;
}

function formatEventDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString())    return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

function petPhotoUrl(photo) {
  if (!photo) return null;
  if (photo.startsWith('http')) return photo;
  return `${BASE}${photo}`;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats,  setStats]  = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      API.get('/dashboard-stats'),
      API.get('/dashboard-detail'),
    ])
      .then(([s, d]) => { setStats(s.data); setDetail(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  const s  = stats  || {};
  const d  = detail || {};
  const pets   = d.recentPets          || [];
  const apps   = d.pendingApplications || [];
  const events = d.upcomingEvents      || [];
  const vols   = d.volunteers          || { total: 0, newSignups: [] };
  const dons   = d.donations           || { thisWeek: 0, prevWeek: 0, topDonors: [] };

const weekPct = dons.prevWeek > 0
  ? Math.round(((dons.thisWeek - dons.prevWeek) / dons.prevWeek) * 100)
  : null;

  return (
    <div style={{ fontFamily: 'inherit' }}>

      {/* ── Top stat cards ── */}
      <div style={css.topGrid}>
        <StatCard
          title="Total Pets"
          value={s.pets?.total ?? 0}
          sub={`+${s.pets?.available ?? 0} this week`}
          subColor="#2d6a4f"
          icon={<img src={pawIcon} alt="paw" style={{ width: 44, height: 44, objectFit: 'contain' }} />}
          iconBg="#e8f5e9"
        />
        <StatCard
          title="Available for Adoptions"
          value={s.pets?.available ?? 0}
          sub={`+${s.applications?.pending ?? 0} this week`}
          subColor="#f59e0b"
          icon={<img src={shareIcon} alt="adopt" style={{ width: 44, height: 44, objectFit: 'contain' }} />}
          iconBg="#fff3e0"
        />
        <StatCard
          title="Successful Adoptions"
          value={s.pets?.adopted ?? 0}
          sub={`+${s.pets?.adopted ?? 0} this week`}
          subColor="#ef4444"
          icon={<img src={loveIcon} alt="love" style={{ width: 44, height: 44, objectFit: 'contain' }} />}
          iconBg="#fce4ec"
        />
        <StatCard
          title="Active Volunteers"
          value={s.volunteers?.total ?? 0}
          sub="This Week"
          subColor="#0ea5e9"
          icon={<img src={volunteerIcon} alt="volunteer" style={{ width: 44, height: 44, objectFit: 'contain' }} />}
          iconBg="#e0f2fe"
        />
      </div>

      {/* ── Middle row: Recent Pets + Pending Applications ── */}
      <div style={css.midRow}>

        {/* Recent Pet Arrivals */}
        <div style={css.card}>
          <div style={css.cardHeader}>
            <span style={css.cardTitle}>Recent Pet Arrivals</span>
            <Link to="/admin/pets" style={css.viewAll}>View All</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {pets.length === 0 && <div style={css.empty}>No recent pets.</div>}
            {pets.map(pet => (
              <div key={pet.id} style={css.petRow}>
                <div style={css.petAvatar}>
                  {pet.photo
                    ? <img src={petPhotoUrl(pet.photo)} alt={pet.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                    : <span style={{ fontSize: 22 }}>🐾</span>
                  }
                </div>
                <div style={{ flex: 1 }}>
                  <div style={css.petName}>{pet.name}</div>
                  <div style={css.petSub}>
                    {pet.breed} • {pet.gender} • {pet.age_years ?? 1} year
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    ...css.badge,
                    background: pet.status === 'Available' ? '#dcfce7' : '#fef9c3',
                    color:      pet.status === 'Available' ? '#15803d' : '#92400e',
                  }}>
                    {pet.status}
                  </span>
                  <div style={css.timeAgo}>{timeAgo(pet.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Applications */}
        <div style={css.card}>
          <div style={css.cardHeader}>
            <span style={css.cardTitle}>Pending Applications</span>
            <Link to="/admin/pets" style={css.viewAll}>Review all applications</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {apps.length === 0 && <div style={css.empty}>No pending applications.</div>}
            {apps.map(app => (
              <div key={`${app.app_type}-${app.id}`} style={css.petRow}>
                <div style={css.appAvatar}>
                  {app.applicant_photo
                    ? <img src={petPhotoUrl(app.applicant_photo)} alt={app.applicant_name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    : <span style={{ fontSize: 18, color: '#aaa' }}>👤</span>
                  }
                </div>
                <div style={{ flex: 1 }}>
                  <div style={css.petName}>{app.applicant_name}</div>
                  <div style={css.petSub}>{app.app_type}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ ...css.badge, background: '#fef3c7', color: '#92400e' }}>
                    For Review
                  </span>
                  <div style={css.timeAgo}>{submittedAgo(app.applied_at)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Bottom row: Events + Volunteers + Donations ── */}
      <div style={css.botRow}>

        {/* Upcoming Events */}
        <div style={{ ...css.card, flex: 1.1 }}>
          <div style={css.cardTitle}>Upcoming events</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
            {events.length === 0 && <div style={css.empty}>No upcoming events.</div>}
            {events.map(ev => (
              <div key={ev.id} style={css.eventRow}>
                <div style={css.eventIcon}>📅</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{ev.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {formatEventDate(ev.start_date)}, 11:00 AM
                  </div>
                </div>
                <div style={css.eventTime}>{hoursUntil(ev.start_date)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Registered Volunteers */}
        <div style={{ ...css.card, flex: 1.1 }}>
          <div style={css.cardHeader}>
            <span style={css.cardTitle}>Registered Volunteers</span>
            <Link to="/admin/volunteers" style={css.viewAll}>View All</Link>
          </div>
          <div style={css.volCountRow}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Total Volunteers</div>
              <div style={css.bigNum}>{vols.total}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>New Sign-Up</div>
              <div style={css.bigNum}>{vols.newSignups.length}</div>
            </div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, marginTop: 4 }}>
            New Sign-Up
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {vols.newSignups.length === 0 && <div style={css.empty}>No new sign-ups this week.</div>}
            {vols.newSignups.map(v => (
              <div key={v.id} style={css.donorRow}>
                <div style={{ ...css.donorName, background: '#f0fdf4', color: '#15803d' }}>
                  {v.name}
                </div>
                <span style={{ ...css.badge, background: '#dcfce7', color: '#15803d' }}>
                  {v.role || 'Volunteer'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Donations Received */}
        <div style={{ ...css.card, flex: 1 }}>
          <div style={css.cardTitle}>Donations received</div>
          <div style={css.donAmountBox}>
            <div style={css.donAmount}>₱{Number(s.donations?.raised || 0).toLocaleString()}</div>
            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 500, marginTop: 4 }}>
  {weekPct === null
    ? `₱${Number(dons.thisWeek).toLocaleString()} received this week`
   : weekPct >= 0
      ? `+${weekPct}% vs last week`
      : `-${Math.abs(weekPct)}% vs last week`}
</div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', margin: '12px 0 8px' }}>
            Top Donors
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {dons.topDonors.length === 0 && <div style={css.empty}>No donations yet.</div>}
            {dons.topDonors.map((donor, i) => (
              <div key={i} style={css.donorRow}>
                <div style={{ ...css.donorName, background: '#f5f3ff', color: '#6d28d9' }}>
                  {donor.donor_name || donor.donor_email}
                </div>
                <span style={{ ...css.badge, background: '#ede9fe', color: '#6d28d9', fontSize: 10 }}>
                  ₱{Number(donor.total_donated).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

function StatCard({ title, value, sub, subColor, icon, iconBg }) {
  return (
    <div style={css.statCard}>
      <div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 30, fontWeight: 700, fontFamily: "'Fraunces',serif", marginBottom: 4 }}>{value}</div>
        <div style={{ fontSize: 12, color: subColor, fontWeight: 500 }}>{sub}</div>
      </div>
      <div style={{ width: 56, height: 56, background: iconBg, borderRadius: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
    </div>
  );
}

const css = {
  topGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 16,
    marginBottom: 20,
  },
  statCard: {
    background: 'white',
    borderRadius: 14,
    border: '1px solid var(--border)',
    padding: '20px 18px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  midRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
    marginBottom: 20,
  },
  botRow: {
    display: 'flex',
    gap: 16,
    alignItems: 'flex-start',
  },
  card: {
    background: 'white',
    borderRadius: 14,
    border: '1px solid var(--border)',
    padding: '20px 18px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontWeight: 700,
    fontSize: 15,
    color: 'var(--text-dark)',
  },
  viewAll: {
    color: '#e05a00',
    fontSize: 12,
    fontWeight: 500,
    textDecoration: 'none',
  },
  petRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 0',
    borderBottom: '1px solid #f3f4f6',
  },
  petAvatar: {
    width: 44,
    height: 44,
    borderRadius: 8,
    background: '#f3f4f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  appAvatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: '#f3f4f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  petName: { fontWeight: 600, fontSize: 13.5, color: 'var(--text-dark)', marginBottom: 2 },
  petSub:  { fontSize: 11, color: 'var(--text-muted)' },
  badge: {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
  },
  timeAgo: { fontSize: 10, color: 'var(--text-muted)', marginTop: 3 },
  empty:   { fontSize: 12, color: 'var(--text-muted)', padding: '10px 0' },
  eventRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 14px',
    background: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: 10,
  },
  eventIcon: {
    width: 34,
    height: 34,
    background: '#fef3c7',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    flexShrink: 0,
  },
  eventTime: {
    fontSize: 10,
    color: 'var(--text-muted)',
    textAlign: 'right',
    whiteSpace: 'nowrap',
  },
  volCountRow: {
    display: 'flex',
    gap: 24,
    padding: '12px 0',
    borderBottom: '1px solid #f3f4f6',
    marginBottom: 14,
  },
  bigNum: {
    fontSize: 28,
    fontWeight: 700,
    fontFamily: "'Fraunces',serif",
    color: 'var(--text-dark)',
  },
  donorRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  donorName: {
    flex: 1,
    padding: '5px 10px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  donAmountBox: {
    background: '#f9fafb',
    borderRadius: 10,
    padding: '14px 16px',
    marginTop: 14,
    textAlign: 'center',
  },
  donAmount: {
    fontSize: 26,
    fontWeight: 700,
    fontFamily: "'Fraunces',serif",
    color: 'var(--text-dark)',
  },
};