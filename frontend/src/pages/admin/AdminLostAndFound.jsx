import { useState, useEffect, useRef } from 'react';
import { API } from '../../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const PET_TYPES = ['Dog', 'Cat', 'Bird', 'Rabbit', 'Others'];
const PET_TYPE_ICONS = { Dog: '🐶', Cat: '🐱', Bird: '🐦', Rabbit: '🐰', Others: '🐾' };

// ─── Badges ───────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    Approved:         { bg: '#dcfce7', color: '#15803d' },
    'Pending Review': { bg: '#fef9c3', color: '#a16207' },
    Rejected:         { bg: '#fee2e2', color: '#991b1b' },
    Reunited:         { bg: '#166534', color: 'white'   },
    Closed:           { bg: '#f3f4f6', color: '#6b7280' },
  };
  const s = map[status] || { bg: '#f3f4f6', color: '#374151' };
  return (
    <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: s.bg, color: s.color }}>
      {status === 'Reunited' ? '🐾 ' : ''}{status}
    </span>
  );
}

function TypeBadge({ type }) {
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 4,
      fontSize: 11, fontWeight: 700,
      background: type === 'Lost' ? '#fee2e2' : '#dcfce7',
      color: type === 'Lost' ? '#991b1b' : '#15803d',
    }}>
      {type.toUpperCase()}
    </span>
  );
}

function SourceBadge({ source }) {
  if (source === 'Admin Post') return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: '#ede9fe', color: '#6d28d9' }}>
      ADMIN
    </span>
  );
  // Show USER badge for user-submitted reports
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: '#e0f2fe', color: '#0369a1' }}>
      USER
    </span>
  );
}

// ─── Field (read-only display) ────────────────────────────────────────────────
function Field({ label, value }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</label>
      <div style={{ fontSize: 14, color: 'var(--text-dark)', padding: '9px 13px', background: 'white', border: '1.5px solid var(--border)', borderRadius: 8 }}>{value || '—'}</div>
    </div>
  );
}

// ─── View Detail Modal ────────────────────────────────────────────────────────
function DetailModal({ report, onClose, onApprove, onDelete, onReunite, onStatusChange }) {
  const isResolved = report.status === 'Reunited' || report.status === 'Closed';
  const isPending  = report.status === 'Pending Review';
  const isApproved = report.status === 'Approved';

  return (
    <div style={overlay}>
      <div style={modalBox}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: 20, margin: 0 }}>
              {report.type} Pet Report
            </h2>
            <SourceBadge source={report.source} />
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>

        {report.status === 'Reunited' && (
          <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#15803d', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 14, fontWeight: 600 }}>
            🐾 This pet has been reunited with its owner!
          </div>
        )}
        {report.status === 'Closed' && (
          <div style={{ background: '#f3f4f6', border: '1px solid #d1d5db', color: '#6b7280', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 14 }}>
            This report has been closed.
          </div>
        )}

        {report.photo && (
          <img
            src={report.photo.startsWith('/') ? `${API_BASE}${report.photo}` : report.photo}
            alt="pet"
            style={{ width: '60%', display: 'block', margin: '0 auto 20px', borderRadius: 10, maxHeight: 240, objectFit: 'cover' }}
          />
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, background: '#f9fafb', borderRadius: 10, padding: 20 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Report Type</label>
              <TypeBadge type={report.type} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Pet Type</label>
              <div style={{ fontSize: 14, color: 'var(--text-dark)', fontWeight: 600 }}>
                {PET_TYPE_ICONS[report.pet_type] || '🐾'} {report.pet_type || '—'}
              </div>
            </div>
          </div>

          <Field label="Reporter / Contact Name" value={report.reporter_name} />
          <Field label="Email"                   value={report.reporter_email} />
          <Field label="Phone Number"            value={report.reporter_phone} />
          {report.pet_name && <Field label="Pet Name" value={report.pet_name} />}
          <Field label="Last Seen / Found At"    value={report.last_seen_location} />
          <Field label="Description"             value={report.pet_description} />

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Status</label>
            <StatusBadge status={report.status} />
          </div>

          {/* Admin can change status of resolved reports */}
          {isResolved && (
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Change Status</label>
              <select
                defaultValue={report.status}
                onChange={e => onStatusChange(report.id, e.target.value)}
                style={{ border: '1.5px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', background: 'white', color: 'var(--text-dark)' }}
              >
                <option value="Reunited">🐾 Reunited</option>
                <option value="Closed">Closed</option>
                <option value="Approved">Approved (Re-open)</option>
              </select>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
          {isPending  && <button onClick={onApprove} style={btnGreen}>✓ Approve</button>}
          {isApproved && <button onClick={onReunite} style={{ ...btnGreen, background: '#166534' }}>🐾 Mark Reunited</button>}
          <button onClick={onDelete} style={btnRed}>Delete</button>
          <button onClick={onClose}  style={btnOutline}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Admin Post Modal ─────────────────────────────────────────────────────────
function AdminPostModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    type: 'Found', pet_type: 'Dog', pet_name: '', pet_description: '',
    last_seen_location: '', contact_name: '', contact_email: '', contact_phone: '',
  });
  const [photo, setPhoto]       = useState(null);
  const [submitting, setSub]    = useState(false);
  const [error, setError]       = useState('');
  const fileRef = useRef();
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.pet_description) { setError('Pet description is required.'); return; }
    setSub(true); setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (photo) fd.append('photo', photo);
      await API.post('/lostfound/admin/post', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onSuccess();
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to post. Please try again.');
    } finally { setSub(false); }
  };

  return (
    <div style={overlay}>
      <div style={{ ...modalBox, maxWidth: 580 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: 20, margin: 0 }}>
            🐾 Post a Surrendered Pet
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>

        <div style={{ background: '#ede9fe', border: '1px solid #c4b5fd', color: '#5b21b6', borderRadius: 10, padding: '10px 16px', marginBottom: 20, fontSize: 13 }}>
          This post will be published immediately as <strong>Approved</strong> and visible to all users. Use this for pets surrendered directly to the organization.
        </div>

        {error && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Report Type</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['Lost', 'Found'].map(t => (
                <button key={t} type="button" onClick={() => set('type', t)} style={{
                  flex: 1, padding: '9px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  border: '1.5px solid', cursor: 'pointer',
                  borderColor: form.type === t ? 'var(--primary)' : 'var(--border)',
                  background: form.type === t ? 'var(--primary)' : 'white',
                  color: form.type === t ? 'white' : 'var(--text-mid)',
                }}>{t} Pet</button>
              ))}
            </div>
          </div>
        </div>

        <label style={lbl}>Pet Type</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {PET_TYPES.map(pt => (
            <button key={pt} type="button" onClick={() => set('pet_type', pt)} style={{
              padding: '7px 14px', borderRadius: 'var(--radius-full)', fontSize: 13,
              fontWeight: form.pet_type === pt ? 600 : 500, cursor: 'pointer',
              border: '1.5px solid',
              borderColor: form.pet_type === pt ? 'var(--primary)' : 'var(--border)',
              background: form.pet_type === pt ? 'var(--primary)' : 'white',
              color: form.pet_type === pt ? 'white' : 'var(--text-mid)',
            }}>{PET_TYPE_ICONS[pt]} {pt}</button>
          ))}
        </div>

        <label style={lbl}>Pet Name <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
        <input style={{ ...inp, marginBottom: 16 }} placeholder="e.g. Buddy" value={form.pet_name} onChange={e => set('pet_name', e.target.value)} />

        <label style={lbl}>Description <span style={{ color: '#ef4444' }}>*</span></label>
        <textarea style={{ ...inp, height: 80, resize: 'vertical', marginBottom: 16 }} placeholder="Color, size, markings, condition..." value={form.pet_description} onChange={e => set('pet_description', e.target.value)} />

        <label style={lbl}>Last Seen / Found At <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
        <input style={{ ...inp, marginBottom: 16 }} placeholder="e.g. Brgy. 2 Naga City" value={form.last_seen_location} onChange={e => set('last_seen_location', e.target.value)} />

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginBottom: 4 }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Contact info for interested parties (optional — leave blank to show PETLINK Admin)</p>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Contact Name</label>
              <input style={inp} placeholder="PETLINK Admin" value={form.contact_name} onChange={e => set('contact_name', e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Contact Phone</label>
              <input style={inp} placeholder="09XXXXXXXXX" value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} />
            </div>
          </div>
          <label style={lbl}>Contact Email</label>
          <input style={{ ...inp, marginBottom: 0 }} placeholder="admin@petlink.org" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} />
        </div>

        <label style={{ ...lbl, marginTop: 16 }}>Upload Photo</label>
        <div
          style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer', background: '#f9fafb' }}
          onClick={() => fileRef.current.click()}
          onDrop={e => { e.preventDefault(); setPhoto(e.dataTransfer.files[0]); }}
          onDragOver={e => e.preventDefault()}
        >
          {photo
            ? <span style={{ fontSize: 13, color: 'var(--primary)' }}>📎 {photo.name}</span>
            : <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Drop a photo here or <strong>click to select</strong></span>
          }
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setPhoto(e.target.files[0])} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
          <button onClick={onClose} style={btnOutline}>Cancel</button>
          <button onClick={handleSubmit} disabled={submitting} style={btnGreen}>
            {submitting ? 'Posting…' : '📢 Publish Pet'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Scrollable Table wrapper ─────────────────────────────────────────────────
function ScrollTable({ children, headers }) {
  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
        <thead>
          <tr style={{ borderBottom: '1.5px solid var(--border)' }}>
            {headers.map(h => <th key={h} style={th}>{h}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

// ─── Pending Review Table ─────────────────────────────────────────────────────
function PendingTable({ reports, onView, onApprove, onDelete }) {
  if (reports.length === 0) return (
    <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: 14 }}>
      No pending reports. 🎉
    </div>
  );
  return (
    <ScrollTable headers={['TYPE', 'PET TYPE', 'SOURCE', 'Reporter', 'Description', 'Date', '']}>
      {reports.map(r => (
        <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
          <td style={td}><TypeBadge type={r.type} /></td>
          <td style={{ ...td, whiteSpace: 'nowrap', fontSize: 13 }}>{PET_TYPE_ICONS[r.pet_type] || '🐾'} {r.pet_type || '—'}</td>
          <td style={td}><SourceBadge source={r.source} /></td>
          <td style={td}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={avatarStyle}>{r.reporter_name?.[0]?.toUpperCase() || '?'}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{r.reporter_name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.reporter_email}</div>
              </div>
            </div>
          </td>
          <td style={{ ...td, maxWidth: 200 }}>
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, color: 'var(--text-mid)' }}>{r.pet_description}</div>
          </td>
          <td style={{ ...td, whiteSpace: 'nowrap', fontSize: 13 }}>
            {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </td>
          <td style={td}>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => onView(r)}       style={actionBtn('#2563eb')}>View</button>
              <button onClick={() => onApprove(r.id)} style={actionBtn('#16a34a')}>Approve</button>
              <button onClick={() => onDelete(r.id)}  style={actionBtn('#dc2626')}>Delete</button>
            </div>
          </td>
        </tr>
      ))}
    </ScrollTable>
  );
}

// ─── Active Reports Table (Lost / Found) ──────────────────────────────────────
function ActiveTable({ reports, onView, onApprove, onDelete, onReunite }) {
  if (reports.length === 0) return (
    <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: 14 }}>No reports found.</div>
  );
  return (
    <ScrollTable headers={['TYPE', 'PET TYPE', 'SOURCE', 'Reporter', 'Description', 'Date', 'STATUS', '']}>
      {reports.map(r => (
        <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
          <td style={td}><TypeBadge type={r.type} /></td>
          <td style={{ ...td, whiteSpace: 'nowrap', fontSize: 13 }}>{PET_TYPE_ICONS[r.pet_type] || '🐾'} {r.pet_type || '—'}</td>
          <td style={td}><SourceBadge source={r.source} /></td>
          <td style={td}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={avatarStyle}>{r.reporter_name?.[0]?.toUpperCase() || '?'}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{r.reporter_name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.reporter_email}</div>
              </div>
            </div>
          </td>
          <td style={{ ...td, maxWidth: 180 }}>
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, color: 'var(--text-mid)' }}>{r.pet_description}</div>
          </td>
          <td style={{ ...td, whiteSpace: 'nowrap', fontSize: 13 }}>
            {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </td>
          <td style={td}><StatusBadge status={r.status} /></td>
          <td style={td}>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => onView(r)} style={actionBtn('#2563eb')}>View</button>
              {r.status === 'Approved' && <button onClick={() => onReunite(r.id)} style={actionBtn('#166534')}>Reunite</button>}
              <button onClick={() => onDelete(r.id)} style={actionBtn('#dc2626')}>Delete</button>
            </div>
          </td>
        </tr>
      ))}
    </ScrollTable>
  );
}

// ─── Resolved Table (kept in admin, editable status) ─────────────────────────
function ResolvedTable({ reports, onView, onDelete, onStatusChange }) {
  if (reports.length === 0) return (
    <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: 14 }}>No resolved cases yet.</div>
  );
  return (
    <ScrollTable headers={['TYPE', 'PET TYPE', 'SOURCE', 'Reporter', 'Description', 'Date Reported', 'Date Resolved', 'STATUS', 'CHANGE STATUS', '']}>
      {reports.map(r => (
        <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
          <td style={td}><TypeBadge type={r.type} /></td>
          <td style={{ ...td, whiteSpace: 'nowrap', fontSize: 13 }}>{PET_TYPE_ICONS[r.pet_type] || '🐾'} {r.pet_type || '—'}</td>
          <td style={td}><SourceBadge source={r.source} /></td>
          <td style={td}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={avatarStyle}>{r.reporter_name?.[0]?.toUpperCase() || '?'}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{r.reporter_name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.reporter_email}</div>
              </div>
            </div>
          </td>
          <td style={{ ...td, maxWidth: 160 }}>
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, color: 'var(--text-mid)' }}>{r.pet_description}</div>
          </td>
          <td style={{ ...td, whiteSpace: 'nowrap', fontSize: 13 }}>
            {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </td>
          <td style={{ ...td, whiteSpace: 'nowrap', fontSize: 13 }}>
            {new Date(r.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </td>
          <td style={td}><StatusBadge status={r.status} /></td>
          <td style={td}>
            <select
              defaultValue={r.status}
              onChange={e => onStatusChange(r.id, e.target.value)}
              style={{ border: '1.5px solid var(--border)', borderRadius: 8, padding: '5px 10px', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', background: 'white', color: 'var(--text-dark)' }}
            >
              <option value="Reunited">🐾 Reunited</option>
              <option value="Closed">Closed</option>
              <option value="Approved">Approved (Re-open)</option>
            </select>
          </td>
          <td style={td}>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => onView(r)}      style={actionBtn('#2563eb')}>View</button>
              <button onClick={() => onDelete(r.id)} style={actionBtn('#dc2626')}>Delete</button>
            </div>
          </td>
        </tr>
      ))}
    </ScrollTable>
  );
}

// ─── Section Card wrapper ─────────────────────────────────────────────────────
function SectionCard({ title, count, borderColor, badge, action, children }) {
  return (
    <div style={{ ...tableCard, borderColor: borderColor || 'var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h3 style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: 17, margin: 0 }}>{title}</h3>
          <span style={{ background: badge?.bg || 'var(--green-50)', color: badge?.color || 'var(--primary)', fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 20 }}>
            {count}
          </span>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminLostAndFound() {
  const [allReports,  setAllReports]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [viewReport,  setViewReport]  = useState(null);
  const [showPost,    setShowPost]    = useState(false);
  const [successMsg,  setSuccessMsg]  = useState('');

  const fetchReports = () => {
    setLoading(true);
    API.get('/lostfound/admin/all')
      .then(r => setAllReports(r.data))
      .catch(() => setAllReports([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchReports(); }, []);

  const flash = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 5000); };

  const handleApprove = async (id) => {
    if (!window.confirm('Approve this report? It will become visible to the public.')) return;
    try { await API.patch(`/lostfound/${id}/approve`); fetchReports(); flash('Report approved and published!'); }
    catch { alert('Failed to approve.'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this report? This cannot be undone.')) return;
    try {
      await API.delete(`/lostfound/${id}`);
      if (viewReport?.id === id) setViewReport(null);
      fetchReports(); flash('Report deleted.');
    } catch { alert('Failed to delete.'); }
  };

  const handleReunite = async (id) => {
    if (!window.confirm('Mark this pet as reunited with its owner?')) return;
    try { await API.patch(`/lostfound/${id}/reunite-admin`); fetchReports(); flash('🐾 Marked as Reunited!'); }
    catch { alert('Failed to update.'); }
  };

  const handleStatusChange = async (id, newStatus) => {
    if (!window.confirm(`Change status to "${newStatus}"?`)) return;
    try {
      await API.patch(`/lostfound/${id}/status`, { status: newStatus });
      if (viewReport?.id === id) setViewReport(null);
      fetchReports();
      flash(`Status updated to "${newStatus}".`);
    } catch { alert('Failed to update status.'); }
  };

  // Buckets
  const pendingReports  = allReports.filter(r => r.status === 'Pending Review');
  const lostReports     = allReports.filter(r => r.type === 'Lost'  && r.status !== 'Reunited' && r.status !== 'Closed' && r.status !== 'Pending Review');
  const foundReports    = allReports.filter(r => r.type === 'Found' && r.status !== 'Reunited' && r.status !== 'Closed' && r.status !== 'Pending Review');
  const reunitedReports = allReports.filter(r => r.status === 'Reunited' || r.status === 'Closed');

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Flash message */}
      {successMsg && (
        <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#15803d', padding: '12px 20px', borderRadius: 10, fontSize: 14, fontWeight: 500 }}>
          ✅ {successMsg}
        </div>
      )}

      {/* ── Stats ── */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Reports',     value: allReports.length,      icon: '📋' },
          { label: 'Pending Review',    value: pendingReports.length,  icon: '⏳' },
          { label: 'Lost Reports',      value: lostReports.length,     icon: '🔍' },
          { label: 'Found Reports',     value: foundReports.length,    icon: '🐾' },
          { label: 'Reunited / Closed', value: reunitedReports.length, icon: '💚' },
        ].map(s => (
          <div key={s.label} className="card" style={{ flex: 1, minWidth: 140, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, background: 'var(--green-50)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Fraunces',serif" }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Pending Review ── */}
      <SectionCard
        title="⏳ Pending Review"
        count={pendingReports.length}
        borderColor="#fcd34d"
        badge={{ bg: '#fef9c3', color: '#a16207' }}
      >
        <PendingTable
          reports={pendingReports}
          onView={setViewReport}
          onApprove={handleApprove}
          onDelete={handleDelete}
        />
      </SectionCard>

      {/* ── Found Pets ── */}
      <SectionCard
        title="🐾 Found Pets"
        count={foundReports.length}
        action={
          <button onClick={() => setShowPost(true)} style={btnPostAdmin}>
            + Post Surrendered Pet
          </button>
        }
      >
        <ActiveTable
          reports={foundReports}
          onView={setViewReport}
          onApprove={handleApprove}
          onDelete={handleDelete}
          onReunite={handleReunite}
        />
      </SectionCard>

      {/* ── Lost Pets ── */}
      <SectionCard title="🔍 Lost Pets" count={lostReports.length}>
        <ActiveTable
          reports={lostReports}
          onView={setViewReport}
          onApprove={handleApprove}
          onDelete={handleDelete}
          onReunite={handleReunite}
        />
      </SectionCard>

      {/* ── Reunited & Closed (kept in admin, with editable status) ── */}
      <SectionCard
        title="🐾 Reunited & Closed"
        count={reunitedReports.length}
        borderColor="#86efac"
        badge={{ bg: '#dcfce7', color: '#15803d' }}
      >
        <ResolvedTable
          reports={reunitedReports}
          onView={setViewReport}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
        />
      </SectionCard>

      {/* Modals */}
      {viewReport && (
        <DetailModal
          report={viewReport}
          onClose={() => setViewReport(null)}
          onApprove={() => { handleApprove(viewReport.id); setViewReport(null); }}
          onDelete={() => { handleDelete(viewReport.id); setViewReport(null); }}
          onReunite={() => { handleReunite(viewReport.id); setViewReport(null); }}
          onStatusChange={(id, status) => { handleStatusChange(id, status); }}
        />
      )}
      {showPost && (
        <AdminPostModal
          onClose={() => setShowPost(false)}
          onSuccess={() => { setShowPost(false); fetchReports(); flash('Pet posted and published successfully!'); }}
        />
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const tableCard = {
  background: 'white', border: '1.5px solid var(--border)',
  borderRadius: 14, padding: '20px 24px',
};
const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 20,
};
const modalBox = {
  background: 'white', borderRadius: 16, padding: '32px 36px',
  width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto',
  boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
};
const th = {
  textAlign: 'left', padding: '10px 12px', fontSize: 12,
  fontWeight: 600, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
};
const td = { padding: '13px 12px' };
const avatarStyle = {
  width: 36, height: 36, borderRadius: '50%', background: 'var(--green-50)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 14, fontWeight: 700, color: 'var(--primary)', flexShrink: 0,
  border: '1.5px solid var(--green-200)',
};
const actionBtn = (color) => ({
  background: 'none', border: 'none', color,
  fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '2px 0', whiteSpace: 'nowrap',
});
const lbl = { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-dark)', marginBottom: 6 };
const inp = {
  width: '100%', boxSizing: 'border-box', border: '1.5px solid var(--border)',
  borderRadius: 8, padding: '10px 14px', fontFamily: 'inherit', fontSize: 14,
  outline: 'none', color: 'var(--text-dark)',
};
const btnGreen   = { background: '#166534', color: 'white', border: 'none', borderRadius: 'var(--radius-full)', padding: '11px 28px', fontWeight: 600, fontSize: 14, cursor: 'pointer' };
const btnRed     = { background: '#b91c1c', color: 'white', border: 'none', borderRadius: 'var(--radius-full)', padding: '11px 28px', fontWeight: 600, fontSize: 14, cursor: 'pointer' };
const btnOutline = { background: 'none', border: '1.5px solid var(--border)', color: 'var(--text-dark)', borderRadius: 'var(--radius-full)', padding: '11px 28px', fontWeight: 600, fontSize: 14, cursor: 'pointer' };
const btnPostAdmin = { background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-full)', padding: '9px 20px', fontWeight: 600, fontSize: 13, cursor: 'pointer' };