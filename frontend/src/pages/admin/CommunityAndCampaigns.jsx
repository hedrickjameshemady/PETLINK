import { useState, useEffect } from 'react';
import { API } from '../../context/AuthContext';
import { ConfirmModal } from '../../components/ConfirmDialog';

const EVENT_TYPES = ['Adoption', 'Volunteer', 'Fundraiser', 'Event', 'Drive', 'Campaign'];
const NEEDS_TARGET = (type) => type === 'Fundraiser' || type === 'Drive';

const FEEDBACK_TABS = [
  { key: 'ALL', label: 'ALL' },
  { key: 'Adoption', label: 'Adoption Experience' },
  { key: 'Volunteer', label: 'Volunteer Activity' },
  { key: 'Event', label: 'Event Feedback' },
];

const fmtDate = (d) => (d ? String(d).slice(0, 10) : '—');

const STATUS_BADGE = { Upcoming: 'badge-blue', Active: 'badge-green', Completed: 'badge-gray', Cancelled: 'badge-red' };

const PinIcon = ({ filled }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 17v5" />
    <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
  </svg>
);

const ShareIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

const ImageIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </svg>
);

const VideoIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);

const Stars = ({ rating = 0 }) => (
  <div style={{ display: 'flex', gap: 2 }}>
    {[1, 2, 3, 4, 5].map(i => (
      <span key={i} style={{ color: i <= rating ? '#d97706' : '#e0e0e0', fontSize: 15, lineHeight: 1 }}>★</span>
    ))}
  </div>
);

export default function CommunityAndCampaigns() {
  const [events, setEvents] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  const [typeFilter, setTypeFilter] = useState('All Types');
  const [feedbackTab, setFeedbackTab] = useState('ALL');

 const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'Event', status: 'Upcoming', description: '', target_amount: '', start_date: '', end_date: '', location: '' });

  const [editEvent, setEditEvent] = useState(null);
  const [editForm, setEditForm] = useState({});

  const [viewEvent, setViewEvent] = useState(null);
  const [viewData, setViewData] = useState([]);
  const [viewLoading, setViewLoading] = useState(false);

  const [headline, setHeadline] = useState('');
  const [message, setMessage] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [posting, setPosting] = useState(false);

  const [toast, setToast] = useState('');
  const [confirmState, setConfirmState] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadEvents = () => API.get('/campaigns').then(({ data }) => setEvents(data)).catch(() => {});
  const loadFeedback = () => API.get('/feedback').then(({ data }) => setFeedback(data)).catch(() => {});
  const loadAnnouncements = () => API.get('/announcements').then(({ data }) => setAnnouncements(data)).catch(() => {});

  useEffect(() => { loadEvents(); loadFeedback(); loadAnnouncements(); }, []);

  /* ─── Events & Campaign ─── */
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      await API.post('/campaigns', form);
      showToast('Event added!');
      loadEvents();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to add event.');
      return;
    }
    setShowCreate(false);
    setForm({ title: '', type: 'Event', status: 'Upcoming', description: '', target_amount: '', start_date: '', end_date: '', location: '' });
  };

  const openEdit = (ev) => {
    setEditEvent(ev);
    setEditForm({
      title: ev.title,
      type: ev.type,
      description: ev.description || '',
      target_amount: ev.target_amount || '',
      start_date: ev.start_date ? String(ev.start_date).slice(0, 10) : '',
      end_date: ev.end_date ? String(ev.end_date).slice(0, 10) : '',
      location: ev.location || '',
      status: ev.status,
    });
  };

  const openView = async (ev) => {
    setViewEvent(ev);
    setViewData([]);
    setViewLoading(true);
    try {
      const endpoint = NEEDS_TARGET(ev.type) ? `/campaigns/${ev.id}/donations` : `/campaigns/${ev.id}/participants`;
      const { data } = await API.get(endpoint);
      setViewData(data);
    } catch {
      setViewData([]);
    }
    setViewLoading(false);
  };

  const handleEditEvent = async (e) => {
    e.preventDefault();
    try {
      await API.put(`/campaigns/${editEvent.id}`, editForm);
      showToast('Event updated!');
      loadEvents();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to update event.');
      return;
    }
    setEditEvent(null);
  };

  const handleDeleteEvent = (ev) => {
    setConfirmState({
      title: 'Are you sure about deleting?',
      message: `"${ev.title}" will be permanently deleted. This cannot be undone.`,
      onConfirm: async () => {
        try {
          await API.delete(`/campaigns/${ev.id}`);
          showToast('Event deleted.');
          setEvents(prev => prev.filter(e => e.id !== ev.id));
        } catch (err) {
          showToast(err?.response?.data?.error || 'Failed to delete event.');
        }
      },
    });
  };

  const filteredEvents = typeFilter === 'All Types' ? events : events.filter(e => e.type === typeFilter);

  /* ─── Announcements & News ─── */
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file) setVideoFile(file);
  };

  const clearPhoto = () => { setPhotoFile(null); setPhotoPreview(''); };
  const clearVideo = () => setVideoFile(null);

  const handlePost = async (e) => {
    e.preventDefault();
    if (!headline.trim()) { showToast('Please write a headline.'); return; }
    setPosting(true);
    try {
      const fd = new FormData();
      fd.append('headline', headline);
      fd.append('message', message);
      if (photoFile) fd.append('photo', photoFile);
      if (videoFile) fd.append('video', videoFile);
      await API.post('/announcements', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      showToast('Announcement posted!');
      loadAnnouncements();
      setHeadline(''); setMessage(''); clearPhoto(); setVideoFile(null);
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to post announcement.');
    }
    setPosting(false);
  };

  const togglePin = async (a) => {
    const next = !a.is_pinned;
    setAnnouncements(prev =>
      prev.map(x => (x.id === a.id ? { ...x, is_pinned: next } : x))
        .sort((x, y) => (y.is_pinned ? 1 : 0) - (x.is_pinned ? 1 : 0))
    );
    try { await API.patch(`/announcements/${a.id}/pin`, { is_pinned: next }); } catch { /* demo */ }
  };

  const shareToFacebook = (a) => {
    const shareUrl = `${window.location.origin}/community`;
    const quote = `${a.headline} — ${a.message || ''}`;
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(quote)}`,
      '_blank',
      'width=600,height=520'
    );
  };

  const shareToInstagram = async (a) => {
    const caption = `${a.headline}\n\n${a.message || ''}`;
    try {
      await navigator.clipboard.writeText(caption);
      showToast('Caption copied — paste it into your Instagram post.');
    } catch {
      showToast('Could not copy automatically — please copy the text manually.');
    }
    window.open('https://www.instagram.com/', '_blank');
  };

  /* ─── Community Feedback ─── */
  const filteredFeedback = feedbackTab === 'ALL' ? feedback : feedback.filter(f => f.category === feedbackTab);
  const feedbackHeading = (f) => (FEEDBACK_TABS.find(t => t.key === f.category)?.label) || f.category || 'General Feedback';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <style>{`
        .cc-table thead th { position: sticky; top: 0; background: #f9fafb; z-index: 1; }
        .cc-type-select { padding: 9px 16px; border-radius: var(--radius-full); border: 1.5px solid var(--border); background: #fff; font-size: 13px; color: var(--text-mid); font-family: inherit; }
        .cc-add-btn { background: #e27b41; color: #fff; border: none; }
        .cc-add-btn:hover { background: #cc6a33; }
        .cc-share-btn { background: #fff; border: 1.5px solid var(--border); border-radius: var(--radius-full); padding: 7px 14px; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; color: var(--text-dark); white-space: nowrap; }
        .cc-share-btn:hover { border-color: var(--primary); color: var(--primary); }
        .cc-pin-btn { background: none; border: none; display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-mid); cursor: pointer; padding: 7px 4px; white-space: nowrap; }
        .cc-pin-btn:hover { color: var(--primary); }
        .cc-pin-btn.pinned { color: var(--primary); font-weight: 600; }
        .cc-tab-bar { display: flex; background: #edeef0; border-radius: var(--radius-md); padding: 6px; gap: 4px; }
        .cc-tab { flex: 1; text-align: center; padding: 9px 10px; border-radius: var(--radius-sm); font-size: 13px; color: var(--text-mid); background: transparent; border: none; cursor: pointer; font-family: inherit; font-weight: 500; }
        .cc-tab.active { background: #fff; color: var(--text-dark); font-weight: 600; box-shadow: var(--shadow-sm); }
        .cc-list-card { border: 1px solid var(--border); border-radius: var(--radius-md); padding: 14px 18px; }
        .cc-icon-btn { background: none; border: none; display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-muted); cursor: pointer; font-family: inherit; padding: 4px 0; }
        .cc-icon-btn:hover { color: var(--primary); }
        .cc-file-chip { display: inline-flex; align-items: center; gap: 8px; background: var(--green-50); border: 1px solid var(--green-200); border-radius: var(--radius-sm); padding: 4px 10px; font-size: 12px; color: var(--text-mid); }
        .cc-file-chip button { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 13px; line-height: 1; }
      `}</style>

      {toast && <div className="toast" style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}>{toast}</div>}

      {confirmState && (
        <ConfirmModal
          title={confirmState.title}
          message={confirmState.message}
          onConfirm={() => { confirmState.onConfirm(); setConfirmState(null); }}
          onCancel={() => setConfirmState(null)}
        />
      )}

      {/* ─── EVENTS & CAMPAIGN ─── */}
      <div className="card">
        <div style={styles.cardHeader}>
          <h2 style={styles.sectionTitle}>Events & Campaign</h2>
          <div style={{ display: 'flex', gap: 10 }}>
            <select className="cc-type-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option>All Types</option>
              {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <button className="btn cc-add-btn" onClick={() => setShowCreate(true)}>+ Add Event</button>
          </div>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📅</div><h3>No events yet</h3><p>Click "+ Add Event" to create one.</p></div>
        ) : (
          <div className="cc-table" style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
            <table>
              <thead>
                <tr>
                  <th>ID</th><th>EVENT NAME</th><th>DATE</th><th>DESCRIPTION</th><th>TYPE</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map(ev => (
                  <tr key={ev.id}>
                    <td style={{ color: 'var(--text-muted)' }}>EVT-{String(ev.id).padStart(3, '0')}</td>
                    <td style={{ fontWeight: 600 }}>{ev.title}</td>
                    <td>{fmtDate(ev.start_date)}</td>
                    <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ev.description}>{ev.description}</td>
                    <td><span className="badge badge-green">{ev.type}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 14, justifyContent: 'flex-end' }}>
                        <button style={styles.linkBtn} onClick={() => openView(ev)}>View</button>
                        <button style={{ ...styles.linkBtn, color: '#dc3545' }} onClick={() => handleDeleteEvent(ev)}>Delete</button>
                        <button style={styles.linkBtn} onClick={() => openEdit(ev)}>Edit</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── ANNOUNCEMENTS & NEWS ─── */}
      <div className="card">
        <h2 style={{ ...styles.sectionTitle, marginBottom: 16 }}>Announcements & News</h2>

        <form onSubmit={handlePost} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          <input
            className="form-input"
            placeholder="Write a headline"
            value={headline}
            onChange={e => setHeadline(e.target.value)}
          />
          <textarea
            className="form-textarea"
            placeholder="Share a rescue, success story, or campaign update"
            value={message}
            onChange={e => setMessage(e.target.value)}
            style={{ minHeight: 90 }}
          />

          {(photoFile || videoFile) && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {photoFile && (
                <span className="cc-file-chip">
                  {photoPreview && <img src={photoPreview} alt="" style={{ width: 22, height: 22, borderRadius: 4, objectFit: 'cover' }} />}
                  {photoFile.name}
                  <button type="button" onClick={clearPhoto}>✕</button>
                </span>
              )}
              {videoFile && (
                <span className="cc-file-chip">
                  🎬 {videoFile.name}
                  <button type="button" onClick={clearVideo}>✕</button>
                </span>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 18 }}>
              <label className="cc-icon-btn">
                <ImageIcon /> Add Photo
                <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
              </label>
              <label className="cc-icon-btn">
                <VideoIcon /> Add Video
                <input type="file" accept="video/*" onChange={handleVideoChange} style={{ display: 'none' }} />
              </label>
            </div>
            <button type="submit" className="btn btn-primary" disabled={posting}>{posting ? 'Posting…' : 'Post'}</button>
          </div>
        </form>

        {announcements.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📰</div><h3>No announcements yet</h3></div>
        ) : (
          <div style={{ maxHeight: 360, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 4 }}>
            {announcements.map(a => (
              <div key={a.id} className="cc-list-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700 }}>{a.headline}</h3>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button className={`cc-pin-btn ${a.is_pinned ? 'pinned' : ''}`} onClick={() => togglePin(a)}>
                      <PinIcon filled={!!a.is_pinned} /> {a.is_pinned ? 'Pinned' : 'Pin'}
                    </button>
                    <button className="cc-share-btn" onClick={() => shareToFacebook(a)}><ShareIcon /> Facebook</button>
                    <button className="cc-share-btn" onClick={() => shareToInstagram(a)}><ShareIcon /> Instagram</button>
                  </div>
                </div>
                {a.message && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>{a.message}</p>}
                {a.photo && <img src={`http://localhost:5000${a.photo}`} alt="" style={{ marginTop: 10, maxHeight: 160, borderRadius: 'var(--radius-sm)', objectFit: 'cover' }} />}
                {a.video && <video src={`http://localhost:5000${a.video}`} controls style={{ marginTop: 10, maxHeight: 200, borderRadius: 'var(--radius-sm)' }} />}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── COMMUNITY FEEDBACK ─── */}
      <div className="card">
        <h2 style={{ ...styles.sectionTitle, marginBottom: 16 }}>Community Feedback</h2>

        <div className="cc-tab-bar" style={{ marginBottom: 16 }}>
          {FEEDBACK_TABS.map(t => (
            <button
              key={t.key}
              className={`cc-tab ${feedbackTab === t.key ? 'active' : ''}`}
              onClick={() => setFeedbackTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {filteredFeedback.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">💬</div><h3>No feedback in this category yet</h3></div>
        ) : (
          <div style={{ maxHeight: 360, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 4 }}>
            {filteredFeedback.map(f => (
              <div key={f.id} className="cc-list-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{feedbackHeading(f)}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{f.message} - {f.name}</div>
                </div>
                <Stars rating={f.rating} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── ADD EVENT MODAL ─── */}
      {showCreate && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Add New Event</h2>
              <button className="modal-close" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateEvent} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Event Name *</label>
                <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required placeholder="e.g. Community Adoption Day" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Type *</label>
                  <select
                    className="form-select"
                    value={form.type}
                    required
                    onChange={e => {
                      const type = e.target.value;
                      setForm({ ...form, type, target_amount: NEEDS_TARGET(type) ? form.target_amount : '' });
                    }}
                  >
                    {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status *</label>
                  <select className="form-select" value={form.status} required onChange={e => setForm({ ...form, status: e.target.value })}>
                    {['Upcoming', 'Active', 'Completed', 'Cancelled'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                {NEEDS_TARGET(form.type) && (
                  <div className="form-group">
                    <label className="form-label">Target Amount (₱) *</label>
                    <input className="form-input" type="number" min="1" required value={form.target_amount} onChange={e => setForm({ ...form, target_amount: e.target.value })} />
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Location *</label>
                  <input className="form-input" required value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Start Date *</label>
                  <input className="form-input" type="date" required value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date *</label>
                  <input className="form-input" type="date" required value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description *</label>
                <textarea className="form-textarea" placeholder="Describe the event..." required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Event</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── EDIT EVENT MODAL ─── */}
      {editEvent && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditEvent(null)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Edit Event</h2>
              <button className="modal-close" onClick={() => setEditEvent(null)}>✕</button>
            </div>
            <form onSubmit={handleEditEvent} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Event Name *</label>
                <input className="form-input" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Type *</label>
                  <select
                    className="form-select"
                    value={editForm.type}
                    required
                    onChange={e => {
                      const type = e.target.value;
                      setEditForm({ ...editForm, type, target_amount: NEEDS_TARGET(type) ? editForm.target_amount : '' });
                    }}
                  >
                    {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status *</label>
                  <select className="form-select" value={editForm.status} required onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                    {['Upcoming', 'Active', 'Completed', 'Cancelled'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                {NEEDS_TARGET(editForm.type) && (
                  <div className="form-group">
                    <label className="form-label">Target Amount (₱) *</label>
                    <input className="form-input" type="number" min="1" required value={editForm.target_amount} onChange={e => setEditForm({ ...editForm, target_amount: e.target.value })} />
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Location *</label>
                  <input className="form-input" required value={editForm.location} onChange={e => setEditForm({ ...editForm, location: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Start Date *</label>
                  <input className="form-input" type="date" required value={editForm.start_date} onChange={e => setEditForm({ ...editForm, start_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date *</label>
                  <input className="form-input" type="date" required value={editForm.end_date} onChange={e => setEditForm({ ...editForm, end_date: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description *</label>
                <textarea className="form-textarea" required value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setEditEvent(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── VIEW EVENT MODAL ─── */}
      {viewEvent && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewEvent(null)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">{viewEvent.title}</h2>
              <button className="modal-close" onClick={() => setViewEvent(null)}>✕</button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <span className="badge badge-green">{viewEvent.type}</span>
              <span className={`badge ${STATUS_BADGE[viewEvent.status] || 'badge-gray'}`}>{viewEvent.status}</span>
            </div>

            {NEEDS_TARGET(viewEvent.type) ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Total Raised</span>
                  <span style={{ fontSize: 18, fontWeight: 700 }}>
                    ₱{Number(viewEvent.raised_amount || 0).toLocaleString()}
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}> / ₱{Number(viewEvent.target_amount || 0).toLocaleString()} goal</span>
                  </span>
                </div>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Donations ({viewData.length})</h3>
                {viewLoading ? (
                  <div className="loading-spinner"><div className="spinner" /></div>
                ) : viewData.length === 0 ? (
                  <div className="empty-state"><div className="empty-icon">💸</div><h3>No donations yet</h3></div>
                ) : (
                  <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                    <table>
                      <thead><tr><th>Donor</th><th>Amount</th><th>Date</th></tr></thead>
                      <tbody>
                        {viewData.map((d, i) => (
                          <tr key={i}>
                            <td>
                              {d.donor_name}
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.donor_email}</div>
                            </td>
                            <td style={{ fontWeight: 600 }}>₱{Number(d.amount).toLocaleString()}</td>
                            <td>{fmtDate(d.donated_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Participants ({viewData.length})</h3>
                {viewLoading ? (
                  <div className="loading-spinner"><div className="spinner" /></div>
                ) : viewData.length === 0 ? (
                  <div className="empty-state"><div className="empty-icon">🙋</div><h3>No one has joined yet</h3></div>
                ) : (
                  <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                    <table>
                      <thead><tr><th>Name</th><th>Email</th><th>Joined</th></tr></thead>
                      <tbody>
                        {viewData.map((p, i) => (
                          <tr key={i}>
                            <td>{p.first_name} {p.last_name}</td>
                            <td>{p.email}</td>
                            <td>{fmtDate(p.joined_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 },
  sectionTitle: { fontWeight: 700, fontSize: 16 },
  linkBtn: { background: 'none', border: 'none', color: 'var(--text-mid)', fontWeight: 500, fontSize: 13, cursor: 'pointer', padding: 0, fontFamily: 'inherit' },
};