import { useState, useEffect } from 'react';
import { API } from '../../context/AuthContext';

import fundRaisingIcon from '../../assets/fund-raising 1.png';
import bloodDonationIcon from '../../assets/blood-donation 1.png';

export default function Donors() {
  const [donations, setDonations] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [donFilter, setDonFilter] = useState('');

  const [stats, setStats] = useState({
    totalDonors: { value: '—', weekDelta: null },
    fundRaised:  { value: '—', weekPct: null },
  });

  /* ─── FETCH ─── */
  useEffect(() => {
    setLoading(true);
    Promise.all([
      API.get('/volunteers/donations').catch(() => null),
      API.get('/volunteers/stats').catch(() => null),
    ]).then(([d, s]) => {
      if (d) setDonations(d.data);
      if (s) {
        const { donations: ds } = s.data;
        setStats({
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

  /* ─── FILTERED DATA ─── */
  const filteredDons = donations.filter(d =>
    !donFilter || d.donor_name?.toLowerCase().includes(donFilter.toLowerCase()) ||
    d.type?.toLowerCase().includes(donFilter.toLowerCase())
  );

  /* ─── HELPERS ─── */
  const avatarCircle = (name, bg = '#fff3e0') => (
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
      {/* ─── STAT CARDS ─── */}
      <div style={s.statsRow}>
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
          <table style={{ minWidth: 680 }}>
            <thead>
              <tr>
                <th>NAME / EMAIL</th><th>CONTACT</th><th>TYPE</th>
                <th>AMOUNT</th><th>DATE</th><th>PROOF</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={s.empty}>Loading…</td></tr>
              ) : filteredDons.length === 0 ? (
                <tr><td colSpan={6} style={s.empty}>No donations found.</td></tr>
              ) : filteredDons.map((d, i) => (
                <tr key={d.id ?? i}>
                  <td>
                    <div style={s.nameCell}>
                      {avatarCircle(d.donor_name)}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{d.donor_name || 'Anonymous'}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.donor_email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{d.donor_phone || '—'}</td>
                  <td>{d.type}</td>
                  <td style={{ fontWeight: 600 }}>
                    {d.donation_kind === 'Non-Monetary'
                      ? `${d.item_category || 'Item'}${d.item_quantity ? ` (${d.item_quantity})` : ''} · ${d.handoff_method || '—'}`
                      : `₱${Number(d.amount ?? 0).toLocaleString()}`}
                  </td>
                  <td>{d.donated_at ? new Date(d.donated_at).toLocaleDateString('en-PH', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '—'}</td>
                  <td>
                    {d.proof_file ? (
                      <a href={`http://localhost:5000${d.proof_file}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontWeight: 600, fontSize: 13, textDecoration: 'underline' }}>View Proof</a>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─── STYLES ─── */
const s = {
  statsRow:   { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 },
  tableHeader:{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle:{ fontWeight: 700, fontSize: 16 },
  scrollTable:{ overflowY: 'auto', maxHeight: 420, borderRadius: 8, border: '1px solid var(--border)' },
  nameCell:   { display: 'flex', alignItems: 'center', gap: 10 },
  empty:      { textAlign: 'center', padding: 28, color: 'var(--text-muted)' },
};