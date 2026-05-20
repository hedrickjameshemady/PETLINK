import { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { API, useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ─── Type/Status badge on card ────────────────────────────────────────────────
function CardBadge({ type, status }) {
  if (status === 'Reunited') {
    return (
      <span style={{
        display: 'inline-block', padding: '3px 10px', borderRadius: 4,
        fontSize: 11, fontWeight: 700, background: '#166534', color: 'white',
      }}>
        🐾 REUNITED
      </span>
    );
  }
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 4,
      fontSize: 11, fontWeight: 700,
      background: type === 'Lost' ? '#ef4444' : '#22c55e',
      color: 'white',
    }}>
      {type.toUpperCase()}
    </span>
  );
}

// ─── Report Modal ─────────────────────────────────────────────────────────────
function ReportModal({ defaultType, onClose, onSuccess }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    type: defaultType || 'Lost',
    pet_name: '',
    pet_description: '',
    last_seen_location: '',
  });
  const [photo, setPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.first_name || !form.last_name || !form.email || !form.pet_description) {
      setError('Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('reporter_name', `${form.first_name} ${form.last_name}`);
      fd.append('reporter_email', form.email);
      fd.append('reporter_phone', form.phone);
      fd.append('type', form.type);
      fd.append('pet_name', form.pet_name);
      fd.append('pet_description', form.pet_description);
      fd.append('last_seen_location', form.last_seen_location);
      if (user?.id) fd.append('user_id', user.id);
      if (photo) fd.append('photo', photo);

      await fetch(`${API_BASE}/api/lostfound`, { method: 'POST', body: fd });
      onSuccess();
    } catch {
      setError('Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={{ ...modalStyle, maxWidth: 560 }}>
        <h2 style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: 22, marginBottom: 24 }}>
          Lost &amp; Found Application
        </h2>

        {error && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{error}</p>}

        <label style={lbl}>Your name</label>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <input style={inp} placeholder="First name" value={form.first_name} onChange={e => set('first_name', e.target.value)} />
          <input style={inp} placeholder="Last name" value={form.last_name} onChange={e => set('last_name', e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Email <span style={{ color: '#ef4444' }}>*</span></label>
            <input style={inp} placeholder="@gmail.com" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Phone number</label>
            <input style={inp} placeholder="09XXXXXXXXX" value={form.phone} onChange={e => set('phone', e.target.value)} />
          </div>
        </div>

        <label style={lbl}>What are you reporting?</label>
        <div style={{ marginBottom: 16 }}>
          {['Lost', 'Found'].map(t => (
            <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer', fontSize: 14, color: 'var(--text-mid)' }}>
              <input type="radio" name="type" value={t} checked={form.type === t} onChange={() => set('type', t)} />
              {t} Pet
            </label>
          ))}
        </div>

        <label style={lbl}>Pet Name <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
        <input style={{ ...inp, marginBottom: 16 }} placeholder="e.g. Buddy" value={form.pet_name} onChange={e => set('pet_name', e.target.value)} />

        <label style={lbl}>Pet Description <span style={{ color: '#ef4444' }}>*</span></label>
        <textarea
          style={{ ...inp, height: 90, resize: 'vertical', marginBottom: 16 }}
          placeholder="Please be as detailed as possible, especially if reporting a lost pet."
          value={form.pet_description}
          onChange={e => set('pet_description', e.target.value)}
        />

        <label style={lbl}>Last Seen Location <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
        <input style={{ ...inp, marginBottom: 16 }} placeholder="e.g. Brgy. 2 Naga City" value={form.last_seen_location} onChange={e => set('last_seen_location', e.target.value)} />

        <label style={lbl}>Upload a photo</label>
        <div
          style={dropzone}
          onClick={() => fileRef.current.click()}
          onDrop={e => { e.preventDefault(); setPhoto(e.dataTransfer.files[0]); }}
          onDragOver={e => e.preventDefault()}
        >
          {photo ? (
            <span style={{ fontSize: 13, color: 'var(--primary)' }}>📎 {photo.name}</span>
          ) : (
            <>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Drop a file here or</span>
              <button type="button" style={selectBtn} onClick={e => { e.stopPropagation(); fileRef.current.click(); }}>Select files</button>
            </>
          )}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setPhoto(e.target.files[0])} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
          <button onClick={onClose} style={btnOutline}>Close</button>
          <button onClick={handleSubmit} disabled={submitting} style={btnPrimary}>
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Modal ──────────────────────────────────────────────────────────────
function DetailModal({ report, onClose }) {
  return (
    <div style={overlayStyle}>
      <div style={{ ...modalStyle, maxWidth: 520 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: 20 }}>
            {report.type} Pet Report
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
        </div>

        {report.status === 'Reunited' && (
          <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#15803d', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 14, fontWeight: 600 }}>
            🐾 This pet has been reunited with its owner!
          </div>
        )}

        {report.photo && (
          <img
            src={report.photo.startsWith('/') ? `${API_BASE}${report.photo}` : report.photo}
            alt="pet"
            style={{ width: '100%', height: 240, objectFit: 'cover', borderRadius: 8, marginBottom: 20 }}
          />
        )}

        <div style={{ background: '#f9fafb', borderRadius: 10, padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Reporter" value={report.reporter_name} />
          <Field label="Email" value={report.reporter_email} />
          <Field label="Phone" value={report.reporter_phone || '—'} />
          {report.pet_name && <Field label="Pet Name" value={report.pet_name} />}
          <Field label="Last Seen / Found At" value={report.last_seen_location || '—'} />
          <Field label="Description" value={report.pet_description} />
          <Field label="Reported On" value={new Date(report.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={btnPrimary}>Close</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, color: 'var(--text-dark)' }}>{value}</div>
    </div>
  );
}

// ─── Pet Card ─────────────────────────────────────────────────────────────────
function PetCard({ report, onClick }) {
  const isReunited = report.status === 'Reunited';
  return (
    <div style={{ ...card, opacity: isReunited ? 0.85 : 1 }} onClick={onClick}>
      <div style={{ position: 'relative' }}>
        <img
          src={
            report.photo
              ? (report.photo.startsWith('/') ? `${API_BASE}${report.photo}` : report.photo)
              : 'https://placehold.co/300x200/e8f5e9/2d6a4f?text=No+Photo'
          }
          alt={report.pet_name || 'pet'}
          style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: '10px 10px 0 0', filter: isReunited ? 'grayscale(20%)' : 'none' }}
        />
        <div style={{ position: 'absolute', top: 10, left: 10 }}>
          <CardBadge type={report.type} status={report.status} />
        </div>
      </div>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{report.pet_name || 'Unknown'}</div>
        {report.last_seen_location && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>📍 {report.last_seen_location}</div>
        )}
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
          🗓 {new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
        <button style={{ ...btnPrimary, width: '100%', justifyContent: 'center', background: isReunited ? '#166534' : 'var(--primary)' }}>
          {isReunited ? '🐾 View — Reunited' : 'View Details'}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function LostAndFound() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchReports = () => {
    setLoading(true);
    let url = '/lostfound?';
    if (filter !== 'All') url += `type=${filter}&`;
    if (search) url += `search=${encodeURIComponent(search)}&`;
    API.get(url)
      .then(r => setReports(r.data))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchReports(); }, [filter, search]);

  const handleReportSuccess = () => {
    setModal(null);
    setSuccessMsg('Your report has been submitted! It will appear once approved by our team.');
    setTimeout(() => setSuccessMsg(''), 6000);
  };

  const activeReports = reports.filter(r => r.status !== 'Reunited');
  const reunitedReports = reports.filter(r => r.status === 'Reunited');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ flex: 1 }}>
        {/* Hero */}
        <div style={hero}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: "'Fraunces',serif", fontWeight: 800, fontSize: 36, marginBottom: 10 }}>
              Lost &amp; Found Pets
            </h1>
            <p style={{ color: 'var(--text-mid)', fontSize: 15, marginBottom: 6 }}>Help unite missing pets with their owners</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>Report a lost or found pet and browse</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button style={btnHeroFill} onClick={() => setModal('lost')}>🤍 Report a lost pet</button>
              <button style={btnHeroOutline} onClick={() => setModal('found')}>🤍 Report a found pet</button>
            </div>
          </div>
          <div style={{ flexShrink: 0 }}>
            <img src="/corgi.png" alt="pets" style={{ height: 180, objectFit: 'contain' }} onError={e => e.target.style.display = 'none'} />
          </div>
        </div>

        {/* Success Banner */}
        {successMsg && (
          <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#15803d', padding: '14px 32px', fontSize: 14, textAlign: 'center' }}>
            ✅ {successMsg}
          </div>
        )}

        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 24px' }}>
          <div style={{ background: 'white', borderRadius: 14, border: '1.5px solid var(--border)', padding: '20px 24px' }}>

            {/* Search + Filter */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1.5px solid var(--border)', borderRadius: 'var(--radius-full)', padding: '8px 16px', flex: 1 }}>
                <span style={{ color: 'var(--text-muted)' }}>🔍</span>
                <input
                  placeholder="Search by Name or breed"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 14, flex: 1 }}
                />
              </div>
              <select
                value={filter}
                onChange={e => setFilter(e.target.value)}
                style={{ border: '1.5px solid var(--border)', borderRadius: 'var(--radius-full)', padding: '8px 20px', fontFamily: 'inherit', fontSize: 14, background: 'white', cursor: 'pointer' }}
              >
                <option value="All">All Status</option>
                <option value="Lost">Lost</option>
                <option value="Found">Found</option>
              </select>
            </div>

            {loading ? (
              <div className="loading-spinner"><div className="spinner" /></div>
            ) : reports.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🐾</div>
                <h3>No reports found</h3>
                <p>Be the first to report a lost or found pet!</p>
              </div>
            ) : (
              <>
                {/* Active reports */}
                {activeReports.length > 0 && (
                  <div style={{ marginBottom: 32 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
                      {activeReports.map(r => (
                        <PetCard key={r.id} report={r} onClick={() => setModal(r)} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Reunited section */}
                {reunitedReports.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#166534', background: '#dcfce7', padding: '4px 14px', borderRadius: 20 }}>
                        🐾 Happy Endings — Reunited Pets
                      </span>
                      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
                      {reunitedReports.map(r => (
                        <PetCard key={r.id} report={r} onClick={() => setModal(r)} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />

      {/* Modals */}
      {(modal === 'lost' || modal === 'found') && (
        <ReportModal
          defaultType={modal === 'lost' ? 'Lost' : 'Found'}
          onClose={() => setModal(null)}
          onSuccess={handleReportSuccess}
        />
      )}
      {modal && typeof modal === 'object' && (
        <DetailModal report={modal} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 20,
};
const modalStyle = {
  background: 'white', borderRadius: 16, padding: '32px 36px',
  width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
};
const lbl = { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-dark)', marginBottom: 6 };
const inp = {
  width: '100%', boxSizing: 'border-box', border: '1.5px solid var(--border)',
  borderRadius: 8, padding: '10px 14px', fontFamily: 'inherit', fontSize: 14,
  outline: 'none', color: 'var(--text-dark)',
};
const dropzone = {
  border: '2px dashed var(--border)', borderRadius: 10, padding: '28px 20px',
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
  cursor: 'pointer', background: '#f9fafb',
};
const selectBtn = {
  background: 'var(--text-dark)', color: 'white', border: 'none',
  borderRadius: 20, padding: '8px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
};
const btnOutline = {
  border: '1.5px solid var(--border)', background: 'white', color: 'var(--text-dark)',
  borderRadius: 'var(--radius-full)', padding: '10px 24px', fontSize: 14, fontWeight: 500, cursor: 'pointer',
};
const btnPrimary = {
  background: 'var(--primary)', color: 'white', border: 'none',
  borderRadius: 'var(--radius-full)', padding: '10px 24px', fontSize: 14, fontWeight: 600,
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
};
const hero = {
  background: '#f0fdf4', padding: '40px 60px', display: 'flex',
  justifyContent: 'space-between', alignItems: 'center', gap: 24,
};
const btnHeroFill = {
  background: 'var(--primary)', color: 'white', border: 'none',
  borderRadius: 'var(--radius-full)', padding: '13px 24px', fontSize: 14,
  fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
};
const btnHeroOutline = {
  background: 'white', color: 'var(--text-dark)', border: '1.5px solid var(--border)',
  borderRadius: 'var(--radius-full)', padding: '13px 24px', fontSize: 14,
  fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
};
const card = {
  background: 'white', border: '1.5px solid var(--border)', borderRadius: 12,
  overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.2s',
};