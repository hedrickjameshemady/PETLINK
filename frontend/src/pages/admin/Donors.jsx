import { useState, useEffect } from 'react';
import { API, useAuth } from '../../context/AuthContext';

import fundRaisingIcon from '../../assets/fund-raising 1.png';
import bloodDonationIcon from '../../assets/blood-donation 1.png';
import animalCareIcon from '../../assets/animal-care 1.png';

import { fileUrl } from '../../config';

const EMPTY_FORM = {
  donor_name: '', donor_email: '', donor_phone: '', type: 'Individual',
  donation_kind: 'Monetary', amount: '', payment_method: 'Cash',
  cheque_number: '', cheque_bank: '', cheque_date: '', received_by: '',
  item_category: '', item_description: '', item_quantity: '', handoff_method: 'Drop-off',
  message: '',
};

export default function Donors() {
  const { user } = useAuth();
  const [donations, setDonations] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [donFilter, setDonFilter] = useState('');
  const [kindFilter,setKindFilter]= useState('Monetary');
  const [showAdd,   setShowAdd]   = useState(false);
  const [viewDon,   setViewDon]   = useState(null);
  const [proofView, setProofView] = useState(null);
  const [toast,     setToast]     = useState('');
  const [saving,    setSaving]    = useState(false);
  const [form,      setForm]      = useState(EMPTY_FORM);

  const [stats, setStats] = useState({
    totalDonors:      { value: '—', weekDelta: null },
    fundRaisedMonth:  { value: '—' },
    nonMonetaryCount: { value: '—' },
  });

  /* ─── FETCH ─── */
  const loadStats = () => {
    API.get('/volunteers/stats').then(({ data }) => {
      const ds = data.donations || {};
      setStats({
        totalDonors: {
          value:     ds.total_donors ?? 0,
          weekDelta: ds.added_this_week ?? null,
        },
        fundRaisedMonth:  { value: `₱${Number(ds.raised_month ?? 0).toLocaleString()}` },
        nonMonetaryCount: { value: ds.non_monetary_count ?? 0 },
      });
    }).catch(() => {});
  };

  useEffect(() => {
    setLoading(true);
    API.get('/volunteers/donations')
      .then(({ data }) => setDonations(data))
      .catch(() => {})
      .finally(() => setLoading(false));
    loadStats();
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  /* ─── ADD DONATION (admin) ─── */
  const handleAddDonation = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await API.post('/volunteers/donations/admin', form);
      setDonations(prev => [{
        ...form, id: data.id, amount: form.amount || null,
        cheque_status: (form.donation_kind === 'Monetary' && form.payment_method === 'Cheque') ? 'Pending' : null,
        donated_at: new Date().toISOString(),
      }, ...prev]);
      showToast('Donation recorded!');
      setShowAdd(false);
      setForm(EMPTY_FORM);
      loadStats(); // refresh the stat cards
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to record donation.');
    } finally {
      setSaving(false);
    }
  };

  /* ─── CHEQUE STATUS ─── */
  const handleChequeStatus = async (don, status) => {
    try {
      await API.patch(`/volunteers/donations/${don.id}/cheque-status`, { cheque_status: status });
      setDonations(prev => prev.map(x => x.id === don.id ? { ...x, cheque_status: status } : x));
      setViewDon(v => v && v.id === don.id ? { ...v, cheque_status: status } : v);
      showToast(`Cheque marked as ${status}.`);
      loadStats();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to update cheque status.');
    }
  };

  /* ─── FILTERED DATA ─── */
  const filteredDons = donations.filter(d => {
    const matchKind = kindFilter === 'ALL'
      || (kindFilter === 'Monetary' && d.donation_kind !== 'Non-Monetary')
      || (kindFilter === 'Non-Monetary' && d.donation_kind === 'Non-Monetary');
    const matchText = !donFilter
      || d.donor_name?.toLowerCase().includes(donFilter.toLowerCase())
      || d.type?.toLowerCase().includes(donFilter.toLowerCase());
    return matchKind && matchText;
  });

  /* ─── HELPERS ─── */
  const isNonMon = (d) => d.donation_kind === 'Non-Monetary';

  const kindBadge = (d) => isNonMon(d)
    ? <span className="badge badge-yellow">Non-Monetary</span>
    : <span className="badge badge-green">Monetary</span>;

  const chequeStatusBadge = (st) => {
    const map = { Pending: 'yellow', Cleared: 'green', Bounced: 'red' };
    return <span className={`badge badge-${map[st] || 'gray'}`}>{st}</span>;
  };

  const detailsCell = (d) => isNonMon(d)
    ? `${d.item_category || 'Item'}${d.item_quantity ? ` (${d.item_quantity})` : ''} · ${d.handoff_method || '—'}`
    : `₱${Number(d.amount ?? 0).toLocaleString()}${d.payment_method ? ` · ${d.payment_method}` : ''}`;

  // Show the donor's real uploaded photo if we have one; otherwise fall back to a letter circle.
  const avatarCircle = (name, bg = '#fff3e0', photo = null) => (
    photo ? (
      <img
        src={fileUrl(photo)}
        alt={name || 'Donor'}
        style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1.5px solid var(--border)' }}
      />
    ) : (
      <div style={{ width: 36, height: 36, background: bg, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--primary-dark)', flexShrink: 0 }}>
        {(name || '?')[0].toUpperCase()}
      </div>
    )
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

  const isCheque = form.donation_kind === 'Monetary' && form.payment_method === 'Cheque';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {toast && (
        <div className="toast" style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}>{toast}</div>
      )}

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
          label="Fund Raised (This Month)"
          value={stats.fundRaisedMonth.value}
          sub="Cleared funds this month"
          subColor="var(--primary)"
          icon={fundRaisingIcon}
          bg="#fff3e0"
        />
        <StatCard
          label="Non-Monetary Donations"
          value={stats.nonMonetaryCount.value}
          sub="Items, supplies & goods"
          subColor="#c2410c"
          icon={animalCareIcon}
          bg="#fff7ed"
        />
      </div>

      {/* ─── DONATIONS RECORD ─── */}
      <div className="card">
        <div style={s.tableHeader}>
          <h2 style={s.sectionTitle}>Donations Record</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              className="form-input"
              placeholder="Search donor or type…"
              value={donFilter}
              onChange={e => setDonFilter(e.target.value)}
              style={{ height: 32, fontSize: 13, width: 180 }}
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setForm({ ...EMPTY_FORM, received_by: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : '' });
                setShowAdd(true);
              }}
            >+ Add Donation</button>
          </div>
        </div>

        {/* Monetary / Non-Monetary toggle */}
        <div style={{ display: 'flex', background: '#edeef0', borderRadius: 'var(--radius-md)', padding: 5, gap: 4, marginBottom: 14, maxWidth: 380 }}>
          {['Monetary', 'Non-Monetary'].map(k => (
            <button
              key={k}
              onClick={() => setKindFilter(k)}
              style={{
                flex: 1, padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
                background: kindFilter === k ? 'var(--primary)' : 'transparent',
                color: kindFilter === k ? 'white' : 'var(--text-mid)',
                transition: 'all 0.15s',
              }}
            >
              {k === 'Monetary' ? '💵 Monetary' : '📦 Non-Monetary'}
            </button>
          ))}
        </div>

        <div style={s.scrollTable}>
          <table style={{ minWidth: 720 }}>
            <thead>
              {kindFilter === 'Monetary' ? (
                <tr>
                  <th>NAME / EMAIL</th><th>AMOUNT</th><th>METHOD</th>
                  <th>DATE</th><th>PROOF</th><th></th>
                </tr>
              ) : (
                <tr>
                  <th>NAME / EMAIL</th><th>ITEM</th><th>QTY</th>
                  <th>HANDOFF</th><th>RECEIVED BY</th><th>DATE</th><th></th>
                </tr>
              )}
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={kindFilter === 'Monetary' ? 6 : 7} style={s.empty}>Loading…</td></tr>
              ) : filteredDons.length === 0 ? (
                <tr><td colSpan={kindFilter === 'Monetary' ? 6 : 7} style={s.empty}>No {kindFilter.toLowerCase()} donations found.</td></tr>
              ) : filteredDons.map((d, i) => (
                <tr key={d.id ?? i}>
                  <td>
                    <div style={s.nameCell}>
                      {avatarCircle(d.donor_name, isNonMon(d) ? '#fff7ed' : '#f0fdf4', d.donor_photo)}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{d.donor_name || 'Anonymous'}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.donor_email}</div>
                      </div>
                    </div>
                  </td>
                  {kindFilter === 'Monetary' ? (
                    <>
                      <td style={{ fontWeight: 700 }}>₱{Number(d.amount ?? 0).toLocaleString()}</td>
                      <td>
                        {d.payment_method || '—'}
                        {d.payment_method === 'Cheque' && d.cheque_status && (
                          <span style={{ marginLeft: 6 }}>{chequeStatusBadge(d.cheque_status)}</span>
                        )}
                      </td>
                      <td>{d.donated_at ? new Date(d.donated_at).toLocaleDateString('en-PH', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '—'}</td>
                      <td>
                        {d.proof_file ? (
                          <button
                            onClick={() => setProofView(d)}
                            style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: 13, textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
                          >View Proof</button>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>—</span>
                        )}
                      </td>
                    </>
                  ) : (
                    <>
                      <td>
                        <div style={{ fontWeight: 600 }}>{d.item_category || 'Item'}</div>
                        {d.item_description && (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.item_description}</div>
                        )}
                      </td>
                      <td>{d.item_quantity || '—'}</td>
                      <td>{d.handoff_method || '—'}</td>
                      <td>{d.received_by || '—'}</td>
                      <td>{d.donated_at ? new Date(d.donated_at).toLocaleDateString('en-PH', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '—'}</td>
                    </>
                  )}
                  <td>
                    <button style={s.linkBtn} onClick={() => setViewDon(d)}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ════════════════ MODALS ════════════════ */}

    {/* PROOF OF PAYMENT */}
      {proofView && (
        <div
          className="modal-overlay"
          onClick={e => e.target === e.currentTarget && setProofView(null)}
          style={{ background: 'rgba(0,0,0,0.75)' }}
        >
          <div style={{ maxWidth: 560, width: '92%', background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Proof of Payment</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                  {proofView.donor_name || 'Anonymous'} · ₱{Number(proofView.amount ?? 0).toLocaleString()}
                </div>
              </div>
              <button className="modal-close" onClick={() => setProofView(null)}>✕</button>
            </div>
            <div style={{ background: '#1a1a1a', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 240, maxHeight: '65vh', overflow: 'auto' }}>
              <img
                src={fileUrl(proofView.proof_file)}
                alt="Proof of payment"
                style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', display: 'block' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '12px 18px' }}>
              
                href={fileUrl(proofView.proof_file)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline btn-sm"
                style={{ textDecoration: 'none' }}
              <a>Open full size</a>
              <button className="btn btn-primary btn-sm" onClick={() => setProofView(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD DONATION */}
      {showAdd && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h2 className="modal-title">Record a Donation</h2>
              <button className="modal-close" onClick={() => setShowAdd(false)}>✕</button>
            </div>
            <form onSubmit={handleAddDonation} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Kind toggle */}
              <div style={{ display: 'flex', gap: 8 }}>
                {['Monetary', 'Non-Monetary'].map(k => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setForm({ ...form, donation_kind: k })}
                    style={{
                      flex: 1, padding: '10px 0', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                      fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600,
                      border: form.donation_kind === k ? '2px solid var(--primary)' : '1.5px solid var(--border)',
                      background: form.donation_kind === k ? 'var(--green-100, #e8f5e9)' : 'white',
                      color: form.donation_kind === k ? 'var(--primary-dark, #2d6a4f)' : 'var(--text-mid)',
                    }}
                  >
                    {k === 'Monetary' ? '💵 Monetary' : '📦 Non-Monetary'}
                  </button>
                ))}
              </div>

              {/* Donor info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Donor Name *</label>
                  <input className="form-input" value={form.donor_name} onChange={e => setForm({ ...form, donor_name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Donor Type</label>
                  <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                    <option>Individual</option><option>Organization</option><option>Anonymous</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" value={form.donor_email} onChange={e => setForm({ ...form, donor_email: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={form.donor_phone} onChange={e => setForm({ ...form, donor_phone: e.target.value })} />
                </div>
              </div>

              {/* MONETARY FIELDS */}
              {form.donation_kind === 'Monetary' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Amount (₱) *</label>
                    <input className="form-input" type="number" min="1" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Method *</label>
                    <select className="form-select" value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}>
                      <option>Cash</option><option>GCash</option><option>Bank Transfer</option><option>Cheque</option>
                    </select>
                  </div>
                </div>
              )}

              {/* CHEQUE FIELDS — only shown when payment method is Cheque */}
              {isCheque && (
                <div style={{ background: '#f8fafc', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', padding: 14 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-mid)', marginBottom: 10 }}>🏦 Cheque Details</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div className="form-group">
                      <label className="form-label">Cheque Number *</label>
                      <input className="form-input" value={form.cheque_number} onChange={e => setForm({ ...form, cheque_number: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Issuing Bank *</label>
                      <input className="form-input" placeholder="e.g. BDO, BPI" value={form.cheque_bank} onChange={e => setForm({ ...form, cheque_bank: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Cheque Date *</label>
                      <input className="form-input" type="date" value={form.cheque_date} onChange={e => setForm({ ...form, cheque_date: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Received By *</label>
                      <input className="form-input" placeholder="Staff who accepted the cheque" value={form.received_by} onChange={e => setForm({ ...form, received_by: e.target.value })} required />
                    </div>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 8 }}>
                    ✋ Cheques are handed personally at the shelter — the receiving staff member is recorded for the audit trail.
                  </div>
                </div>
              )}

              {/* NON-MONETARY FIELDS */}
              {form.donation_kind === 'Non-Monetary' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Item Category *</label>
                    <input className="form-input" placeholder="e.g. Pet Food, Blankets" value={form.item_category} onChange={e => setForm({ ...form, item_category: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Quantity</label>
                    <input className="form-input" placeholder="e.g. 5 sacks" value={form.item_quantity} onChange={e => setForm({ ...form, item_quantity: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">How it arrived</label>
                    <select className="form-select" value={form.handoff_method} onChange={e => setForm({ ...form, handoff_method: e.target.value })}>
                      <option>Drop-off</option><option>Pickup</option><option>Courier</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <input className="form-input" value={form.item_description} onChange={e => setForm({ ...form, item_description: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Received By *</label>
                    <input className="form-input" placeholder="Staff who received the items" value={form.received_by} onChange={e => setForm({ ...form, received_by: e.target.value })} required />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Notes (optional)</label>
                <input className="form-input" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Record Donation'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DONATION */}
      {viewDon && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewDon(null)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Donation Details</h2>
              <button className="modal-close" onClick={() => setViewDon(null)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
              {[
                ['Donor',    viewDon.donor_name || 'Anonymous'],
                ['Email',    viewDon.donor_email],
                ['Phone',    viewDon.donor_phone],
                ['Type',     viewDon.type],
                ['Kind',     viewDon.donation_kind || 'Monetary'],
                ...(isNonMon(viewDon) ? [
                  ['Item',        viewDon.item_category],
                  ['Description', viewDon.item_description],
                  ['Quantity',    viewDon.item_quantity],
                  ['Handoff',     viewDon.handoff_method],
                  ['Received By', viewDon.received_by],
                ] : [
                  ['Amount',         `₱${Number(viewDon.amount ?? 0).toLocaleString()}`],
                  ['Payment Method', viewDon.payment_method || '—'],
                  ...(viewDon.payment_method === 'Cheque' ? [
                    ['Cheque Number', viewDon.cheque_number],
                    ['Issuing Bank',  viewDon.cheque_bank],
                    ['Cheque Date',   viewDon.cheque_date ? new Date(viewDon.cheque_date).toLocaleDateString('en-PH') : '—'],
                    ['Cheque Status', viewDon.cheque_status || 'Pending'],
                    ['Received By',   viewDon.received_by],
                  ] : []),
                ]),
                ['Notes', viewDon.message],
                ['Date',  viewDon.donated_at ? new Date(viewDon.donated_at).toLocaleString('en-PH') : '—'],
              ].filter(([, v]) => v).map(([l, v]) => (
                <div key={l} style={s.detailRow}>
                  <span style={s.detailLbl}>{l}</span>
                  <span style={{ flex: 1 }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              {viewDon.payment_method === 'Cheque' && (viewDon.cheque_status || 'Pending') === 'Pending' && (
                <>
                  <button className="btn btn-danger btn-sm" onClick={() => handleChequeStatus(viewDon, 'Bounced')}>Mark Bounced</button>
                  <button className="btn btn-success btn-sm" onClick={() => handleChequeStatus(viewDon, 'Cleared')}>Mark Cleared</button>
                </>
              )}
              <button className="btn btn-outline" onClick={() => setViewDon(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── STYLES ─── */
const s = {
  statsRow:   { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 },
  tableHeader:{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 },
  sectionTitle:{ fontWeight: 700, fontSize: 16 },
  scrollTable:{ overflowY: 'auto', maxHeight: 420, borderRadius: 8, border: '1px solid var(--border)' },
  nameCell:   { display: 'flex', alignItems: 'center', gap: 10 },
  linkBtn:    { background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: 0 },
  detailRow:  { display: 'flex', gap: 12, paddingBottom: 10, borderBottom: '1px solid var(--border)', alignItems: 'center' },
  detailLbl:  { minWidth: 130, color: 'var(--text-muted)', fontWeight: 500 },
  empty:      { textAlign: 'center', padding: 28, color: 'var(--text-muted)' },
};