import { useState, useEffect } from 'react';
import { API } from '../../context/AuthContext';

export default function CommunityAndCampaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editCampaign, setEditCampaign] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [viewCampaign, setViewCampaign] = useState(null);
  const [campaignDonations, setCampaignDonations] = useState([]);
  const [toast, setToast] = useState('');
  const [form, setForm] = useState({ title: '', type: 'Event', description: '', target_amount: '', start_date: '', end_date: '', location: '' });

  useEffect(() => {
    API.get('/campaigns').then(({ data }) => setCampaigns(data)).catch(() => {});
    API.get('/feedback').then(({ data }) => setFeedback(data)).catch(() => {});
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await API.post('/campaigns', form);
      showToast('Campaign created!');
      API.get('/campaigns').then(({ data }) => setCampaigns(data)).catch(() => {});
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to create campaign. Please try again.');
      return;
    }
    setShowCreate(false);
    setForm({ title: '', type: 'Event', description: '', target_amount: '', start_date: '', end_date: '', location: '' });
  };

  const handleEditCampaign = async (e) => {
    e.preventDefault();
    try {
      await API.put(`/campaigns/${editCampaign.id}`, editForm);
      showToast('Campaign updated!');
      API.get('/campaigns').then(({ data }) => setCampaigns(data)).catch(() => {});
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to update campaign.');
      return;
    }
    setEditCampaign(null);
  };

  const handleDeleteCampaign = async (campaign) => {
    if (!window.confirm(`Delete "${campaign.title}"? This cannot be undone.`)) return;
    try {
      await API.delete(`/campaigns/${campaign.id}`);
      showToast('Campaign deleted.');
      setCampaigns(prev => prev.filter(c => c.id !== campaign.id));
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to delete campaign.');
    }
  };

  const handleFeedbackStatus = async (id, status) => {
    try {
      await API.patch(`/feedback/${id}/status`, { status });
    } catch { /* demo */ }
    setFeedback(prev => prev.map(f => f.id === id ? { ...f, status } : f));
  };

  const statusBadge = (s) => {
    const map = { Upcoming: 'blue', Active: 'green', Completed: 'gray', Cancelled: 'red', New: 'yellow', Read: 'gray', Responded: 'green' };
    return <span className={`badge badge-${map[s] || 'gray'}`}>{s}</span>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {toast && <div className="toast" style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}>{toast}</div>}

      {/* ─── CAMPAIGNS ─── */}
      <div className="card">
        <div style={styles.tableHeader}>
          <h2 style={styles.sectionTitle}>Community Events & Campaigns</h2>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>+ Create Campaign</button>
        </div>
        <div style={styles.campaignGrid}>
          {campaigns.map(c => (
            <div key={c.id} style={styles.campaignCard}>
              <div style={styles.campaignBanner}>
                <span style={{ fontSize: 36 }}>{c.type === 'Event' ? '🎉' : c.type === 'Drive' ? '🚗' : c.type === 'Fundraiser' ? '💚' : '📢'}</span>
              </div>
              <div style={styles.campaignBody}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'flex-start' }}>
                  <h3 style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.3, flex: 1, marginRight: 8 }}>{c.title}</h3>
                  {statusBadge(c.status)}
                </div>
                <span className="badge badge-blue" style={{ marginBottom: 8, fontSize: 11 }}>{c.type}</span>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 10 }}>{c.description}</p>
                {c.location && <div style={styles.campaignMeta}>📍 {c.location}</div>}
                {c.start_date && (
                  <div style={styles.campaignMeta}>
                    📅 {new Date(c.start_date).toLocaleDateString()} — {c.end_date ? new Date(c.end_date).toLocaleDateString() : 'TBD'}
                  </div>
                )}
                {c.target_amount && (
                  <div style={styles.progressWrap}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Raised: ₱{Number(c.raised_amount || 0).toLocaleString()}</span>
                      <span style={{ fontWeight: 600 }}>Goal: ₱{Number(c.target_amount).toLocaleString()}</span>
                    </div>
                    <div style={styles.progressBar}>
                      <div style={{ ...styles.progressFill, width: `${Math.min(100, ((c.raised_amount || 0) / c.target_amount) * 100)}%` }} />
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="btn btn-outline btn-sm" onClick={() => { setEditCampaign(c); setEditForm({ title: c.title, type: c.type, description: c.description || '', target_amount: c.target_amount || '', start_date: c.start_date || '', end_date: c.end_date || '', location: c.location || '', status: c.status }); }}>Edit</button>
                  <button className="btn btn-primary btn-sm" onClick={() => {
                    setViewCampaign(c);
                    API.get(`/campaigns/${c.id}/donations`)
                      .then(({ data }) => setCampaignDonations(data))
                      .catch(() => setCampaignDonations([]));
                  }}>View Details</button>
                  <button className="btn btn-outline btn-sm" style={{ color: '#dc3545', borderColor: '#dc3545' }} onClick={() => handleDeleteCampaign(c)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── FEEDBACK ─── */}
      <div className="card">
        <div style={styles.tableHeader}>
          <h2 style={styles.sectionTitle}>User Feedback</h2>
          <button className="btn btn-outline btn-sm">▾ Filter</button>
        </div>
        {feedback.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">💬</div><h3>No feedback yet</h3></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>FROM</th><th>SUBJECT</th><th>CATEGORY</th><th>RATING</th><th>DATE</th><th>STATUS</th><th></th></tr></thead>
              <tbody>
                {feedback.map(f => (
                  <tr key={f.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{f.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{f.email}</div>
                    </td>
                    <td style={{ maxWidth: 200 }}>{f.subject}</td>
                    <td><span className="badge badge-blue">{f.category}</span></td>
                    <td>{'⭐'.repeat(f.rating || 0)}</td>
                    <td>{new Date(f.created_at).toLocaleDateString()}</td>
                    <td>{statusBadge(f.status)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {f.status === 'New' && <button style={styles.linkBtn} onClick={() => handleFeedbackStatus(f.id, 'Read')}>Mark Read</button>}
                        {f.status !== 'Responded' && <button style={{ ...styles.linkBtn, color: '#198754' }} onClick={() => handleFeedbackStatus(f.id, 'Responded')}>Responded</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── CREATE CAMPAIGN MODAL ─── */}
      {showCreate && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Create Campaign / Event</h2>
              <button className="modal-close" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required placeholder="e.g. Save the Strays Drive" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                    {['Event','Campaign','Drive','Fundraiser'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Target Amount (₱)</label>
                  <input className="form-input" type="number" placeholder="Optional" value={form.target_amount} onChange={e => setForm({ ...form, target_amount: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input className="form-input" type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input className="form-input" type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Location</label>
                <input className="form-input" placeholder="e.g. Naga City Plaza" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" placeholder="Describe the campaign..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Campaign</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── VIEW CAMPAIGN MODAL ─── */}
      {viewCampaign && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && (setViewCampaign(null), setCampaignDonations([]))}>
          <div className="modal" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h2 className="modal-title">{viewCampaign.title}</h2>
              <button className="modal-close" onClick={() => { setViewCampaign(null); setCampaignDonations([]); }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
              <div style={styles.detailRow}><span style={styles.detailLbl}>Type</span><span className="badge badge-blue">{viewCampaign.type}</span></div>
              <div style={styles.detailRow}><span style={styles.detailLbl}>Status</span>{statusBadge(viewCampaign.status)}</div>
              {viewCampaign.location && <div style={styles.detailRow}><span style={styles.detailLbl}>Location</span><span>{viewCampaign.location}</span></div>}
              {viewCampaign.start_date && <div style={styles.detailRow}><span style={styles.detailLbl}>Dates</span><span>{new Date(viewCampaign.start_date).toLocaleDateString()} — {viewCampaign.end_date ? new Date(viewCampaign.end_date).toLocaleDateString() : 'TBD'}</span></div>}
              {viewCampaign.target_amount && (
                <div style={styles.detailRow}>
                  <span style={styles.detailLbl}>Fundraising</span>
                  <span>₱{Number(viewCampaign.raised_amount || 0).toLocaleString()} raised of ₱{Number(viewCampaign.target_amount).toLocaleString()} goal</span>
                </div>
              )}
              {viewCampaign.description && (
                <div style={{ paddingTop: 8 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Description</div>
                  <p style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.6 }}>{viewCampaign.description}</p>
                </div>
              )}

              {/* ─── DONATION RECORDS ─── */}
              <div style={{ paddingTop: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 14 }}>Donation Records</div>
                {campaignDonations.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>No donations yet for this campaign.</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '1.5px solid var(--border)' }}>
                        <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Donor</th>
                        <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Amount</th>
                        <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Date</th>
                        <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaignDonations.map((d, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '8px 8px' }}>
                            <div style={{ fontWeight: 600 }}>{d.donor_name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.donor_email}</div>
                          </td>
                          <td style={{ padding: '8px 8px', fontWeight: 700, color: 'var(--primary)' }}>₱{Number(d.amount).toLocaleString()}</td>
                          <td style={{ padding: '8px 8px', color: 'var(--text-muted)' }}>{new Date(d.donated_at).toLocaleDateString()}</td>
                          <td style={{ padding: '8px 8px', color: 'var(--text-muted)', fontStyle: d.message ? 'normal' : 'italic' }}>{d.message || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => { setViewCampaign(null); setCampaignDonations([]); }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── EDIT CAMPAIGN MODAL ─── */}
      {editCampaign && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditCampaign(null)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Edit Campaign</h2>
              <button className="modal-close" onClick={() => setEditCampaign(null)}>✕</button>
            </div>
            <form onSubmit={handleEditCampaign} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="form-input" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-select" value={editForm.type} onChange={e => setEditForm({ ...editForm, type: e.target.value })}>
                    {['Event','Campaign','Drive','Fundraiser'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                    {['Upcoming','Active','Completed','Cancelled'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Target Amount (₱)</label>
                  <input className="form-input" type="number" value={editForm.target_amount} onChange={e => setEditForm({ ...editForm, target_amount: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Location</label>
                  <input className="form-input" value={editForm.location} onChange={e => setEditForm({ ...editForm, location: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input className="form-input" type="date" value={editForm.start_date} onChange={e => setEditForm({ ...editForm, start_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input className="form-input" type="date" value={editForm.end_date} onChange={e => setEditForm({ ...editForm, end_date: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setEditCampaign(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  tableHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontWeight: 700, fontSize: 16 },
  campaignGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 },
  campaignCard: { border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' },
  campaignBanner: { height: 100, background: 'var(--green-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  campaignBody: { padding: '16px 18px' },
  campaignMeta: { fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 },
  progressWrap: { marginTop: 8 },
  progressBar: { height: 6, background: 'var(--green-100)', borderRadius: 99 },
  progressFill: { height: '100%', background: 'var(--primary)', borderRadius: 99, transition: 'width 0.5s ease' },
  linkBtn: { background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: 0 },
  detailRow: { display: 'flex', gap: 12, paddingBottom: 10, borderBottom: '1px solid var(--border)', alignItems: 'flex-start' },
  detailLbl: { minWidth: 120, color: 'var(--text-muted)', fontWeight: 500 },
};