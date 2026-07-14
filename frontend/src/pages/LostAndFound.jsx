import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { API, useAuth } from '../context/AuthContext';
import pawsBg    from '../assets/Mask group.png';
import corgiImg  from '../assets/Group 88.png';
import catImg    from '../assets/Rectangle 390.png';
import greenRect from '../assets/Rectangle 477.png';

import { API_BASE } from '../config';

const PET_TYPES     = ['All', 'Dog', 'Cat', 'Bird', 'Rabbit', 'Others'];
const PET_TYPE_ICON = { All: '✨', Dog: '🐶', Cat: '🐱', Bird: '🐦', Rabbit: '🐰', Others: '🐾' };
const GROUP_ORDER   = ['Dog', 'Cat', 'Bird', 'Rabbit', 'Others'];

// ─── Report Modal ─────────────────────────────────────────────────────────────
function ReportModal({ defaultType, onClose, onSuccess }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name:  user?.last_name  || '',
    email:      user?.email      || '',
    phone:      user?.phone      || '',
    type: defaultType || 'Lost',
    pet_type: 'Dog',
    pet_name: '',
    pet_description: '',
    last_seen_location: '',
  });
  const [photo, setPhoto]           = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');
  const fileRef = useRef();
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.first_name || !form.last_name || !form.email || !form.pet_description) {
      setError('Please fill in all required fields.');
      return;
    }
    setSubmitting(true); setError('');
    try {
      const fd = new FormData();
      fd.append('reporter_name',      `${form.first_name} ${form.last_name}`);
      fd.append('reporter_email',     form.email);
      fd.append('reporter_phone',     form.phone);
      fd.append('type',               form.type);
      fd.append('pet_type',           form.pet_type);
      fd.append('pet_name',           form.pet_name);
      fd.append('pet_description',    form.pet_description);
      fd.append('last_seen_location', form.last_seen_location);
      if (user?.id) fd.append('user_id', user.id);
      if (photo)    fd.append('photo', photo);
      await API.post('/lostfound', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onSuccess();
    } catch (err) {
      setError(err?.response?.data?.error || 'Submission failed. Please try again.');
    } finally { setSubmitting(false); }
  };

  return (
    <div style={s.overlay}>
      <div style={{ ...s.modal, maxWidth: 560 }}>
        <h2 style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: 22, marginBottom: 24 }}>
          Lost &amp; Found Application
        </h2>
        {error && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{error}</p>}

        <label style={s.lbl}>Your name</label>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <input style={s.inp} placeholder="First name" value={form.first_name} onChange={e => set('first_name', e.target.value)} />
          <input style={s.inp} placeholder="Last name"  value={form.last_name}  onChange={e => set('last_name',  e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={s.lbl}>Email <span style={{ color: '#ef4444' }}>*</span></label>
            <input style={s.inp} placeholder="@gmail.com" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={s.lbl}>Phone number</label>
            <input style={s.inp} placeholder="09XXXXXXXXX" value={form.phone} onChange={e => set('phone', e.target.value)} />
          </div>
        </div>

        <label style={s.lbl}>What are you reporting?</label>
        <div style={{ marginBottom: 16 }}>
          {['Lost', 'Found'].map(t => (
            <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer', fontSize: 14, color: 'var(--text-mid)' }}>
              <input type="radio" name="type" value={t} checked={form.type === t} onChange={() => set('type', t)} />
              {t} Pet
            </label>
          ))}
        </div>

        <label style={s.lbl}>Type of Pet <span style={{ color: '#ef4444' }}>*</span></label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {['Dog', 'Cat', 'Bird', 'Rabbit', 'Others'].map(pt => (
            <button key={pt} type="button" onClick={() => set('pet_type', pt)} style={{
              padding: '7px 16px', borderRadius: 'var(--radius-full)', fontSize: 13,
              fontWeight: form.pet_type === pt ? 600 : 500, border: '1.5px solid', cursor: 'pointer',
              borderColor: form.pet_type === pt ? 'var(--primary)' : 'var(--border)',
              background:  form.pet_type === pt ? 'var(--primary)' : 'white',
              color:       form.pet_type === pt ? 'white' : 'var(--text-mid)',
            }}>
              {PET_TYPE_ICON[pt]} {pt}
            </button>
          ))}
        </div>

        <label style={s.lbl}>Pet Name <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
        <input style={{ ...s.inp, marginBottom: 16 }} placeholder="e.g. Buddy" value={form.pet_name} onChange={e => set('pet_name', e.target.value)} />

        <label style={s.lbl}>Pet Description <span style={{ color: '#ef4444' }}>*</span></label>
        <textarea
          style={{ ...s.inp, height: 90, resize: 'vertical', marginBottom: 16 }}
          placeholder="Please be as detailed as possible, especially if reporting a lost pet."
          value={form.pet_description}
          onChange={e => set('pet_description', e.target.value)}
        />

        <label style={s.lbl}>Last Seen Location <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
        <input style={{ ...s.inp, marginBottom: 16 }} placeholder="e.g. Brgy. 2 Naga City" value={form.last_seen_location} onChange={e => set('last_seen_location', e.target.value)} />

        <label style={s.lbl}>Upload a photo</label>
        <div
          style={s.dropzone}
          onClick={() => fileRef.current.click()}
          onDrop={e => { e.preventDefault(); setPhoto(e.dataTransfer.files[0]); }}
          onDragOver={e => e.preventDefault()}
        >
          {photo
            ? <span style={{ fontSize: 13, color: 'var(--primary)' }}>📎 {photo.name}</span>
            : <>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Drop a file here or</span>
                <button type="button" style={s.selectBtn} onClick={e => { e.stopPropagation(); fileRef.current.click(); }}>Select files</button>
              </>
          }
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setPhoto(e.target.files[0])} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
          <button onClick={onClose} style={s.btnOutline}>Close</button>
          <button onClick={handleSubmit} disabled={submitting} style={s.btnPrimary}>
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ report, onClose }) {
  return (
    <div style={s.overlay}>
      <div style={{ ...s.modal, maxWidth: 520 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: 20 }}>
            {report.type} Pet Report
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
        </div>

        {report.photo && (
          <img
            src={report.photo.startsWith('/') ? `${API_BASE}${report.photo}` : report.photo}
            alt="pet"
            style={{ width: '100%', height: 240, objectFit: 'cover', borderRadius: 8, marginBottom: 20 }}
          />
        )}

        <div style={{ background: '#f9fafb', borderRadius: 10, padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Reporter"             value={report.reporter_name} />
          <Field label="Email"                value={report.reporter_email} />
          <Field label="Phone"                value={report.reporter_phone || '—'} />
          {report.pet_type && <Field label="Pet Type" value={`${PET_TYPE_ICON[report.pet_type] || '🐾'} ${report.pet_type}`} />}
          {report.pet_name && <Field label="Pet Name" value={report.pet_name} />}
          <Field label="Last Seen / Found At" value={report.last_seen_location || '—'} />
          <Field label="Description"          value={report.pet_description} />
          <Field label="Reported On"          value={new Date(report.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={s.btnPrimary}>Close</button>
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

// ─── Pet Card (same layout as Adopt page) ────────────────────────────────────
function PetCard({ report, onClick }) {
  const photo = report.photo
    ? (report.photo.startsWith('/') ? `${API_BASE}${report.photo}` : report.photo)
    : 'https://placehold.co/400x200/e8f5e9/2d6a4f?text=No+Photo';

  const isLost = report.type === 'Lost';

  return (
    <div style={s.petCard} onClick={onClick}>
      <div style={{ position: 'relative' }}>
        <img src={photo} alt={report.pet_name || 'pet'} style={s.petImg} />
        <div style={{
          position: 'absolute', top: 10, left: 10,
          background: isLost ? '#ef4444' : '#22c55e',
          color: 'white', fontSize: 11, fontWeight: 700,
          padding: '3px 10px', borderRadius: 20, letterSpacing: '0.04em',
        }}>
          {isLost ? 'LOST' : 'FOUND'}
        </div>
      </div>
      <div style={s.petInfo}>
        <strong style={{ fontSize: 15, color: 'var(--text-dark)' }}>{report.pet_name || 'Unknown'}</strong>
        <p style={s.petMeta}>
          {report.pet_type || 'Pet'}
          {report.last_seen_location ? ` • ${report.last_seen_location}` : ''}
        </p>
        <p style={{ ...s.petMeta, marginBottom: 8 }}>
          {new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
        <button style={s.btnOutline}>View Details</button>
      </div>
    </div>
  );
}

// ─── Grouped section (mirrors Adopt page) ────────────────────────────────────
function GroupedSection({ reports, reportType, onView, emptyMsg }) {
  const grouped = reports.reduce((acc, r) => {
    const key = r.pet_type || 'Others';
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  const sortedGroups = GROUP_ORDER.filter(k => grouped[k]);

  if (sortedGroups.length === 0) return (
    <div className="empty-state">
      <div className="empty-icon">{reportType === 'Lost' ? '🔍' : '🐾'}</div>
      <p>{emptyMsg}</p>
    </div>
  );

  return (
    <>
      {sortedGroups.map(type => (
        <div key={type} style={{ marginBottom: 40 }}>
          <div style={s.sectionHeader}>
            <span style={{ fontSize: 22 }}>{PET_TYPE_ICON[type]}</span>
            <h2 style={s.sectionTitle}>{type}s</h2>
            <span style={s.sectionCount}>{grouped[type].length} report{grouped[type].length !== 1 ? 's' : ''}</span>
          </div>
          <div style={s.grid}>
            {grouped[type].map(r => (
              <PetCard key={r.id} report={r} onClick={() => onView(r)} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LostAndFound() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reports,       setReports]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [petTypeFilter, setPetTypeFilter] = useState('All');
  const [search,        setSearch]        = useState('');
  const [modal,         setModal]         = useState(null);
  const [successMsg,    setSuccessMsg]    = useState('');

  useEffect(() => {
    setLoading(true);
    API.get('/lostfound')
      .then(r => setReports(r.data))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, []);

  const handleReportSuccess = () => {
    setModal(null);
    setSuccessMsg('Your report has been submitted! It will appear once approved by our team.');
    setTimeout(() => setSuccessMsg(''), 6000);
  };

  const applyFilters = (list) => list.filter(r => {
    const matchesType   = petTypeFilter === 'All' || (r.pet_type || 'Others') === petTypeFilter;
    const q             = search.trim().toLowerCase();
    const matchesSearch = !q ||
      (r.pet_name || '').toLowerCase().includes(q) ||
      (r.pet_description || '').toLowerCase().includes(q) ||
      (r.last_seen_location || '').toLowerCase().includes(q) ||
      (r.reporter_name || '').toLowerCase().includes(q);
    return matchesType && matchesSearch;
  });

  const active       = reports.filter(r => r.status !== 'Reunited' && r.status !== 'Closed');
  const lostReports  = applyFilters(active.filter(r => r.type === 'Lost'));
  const foundReports = applyFilters(active.filter(r => r.type === 'Found'));

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      <Navbar />

      <main style={{ flex: 1 }}>

        {/* ── Hero ── */}
        <div style={{ padding: '32px 24px', background: '#fff' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={s.heroCard}>
              <img src={pawsBg} alt="" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.2, pointerEvents: 'none', borderRadius: 16 }} />
              <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
                <h1 style={{ fontFamily: "'Fraunces',serif", fontWeight: 800, fontSize: 34, marginBottom: 8, color: '#1a2e1a' }}>
                  Lost &amp; Found Pets
                </h1>
                <p style={{ color: '#2d4a2d', fontSize: 15, marginBottom: 4 }}>Help unite missing pets with their owners</p>
                <p style={{ color: '#3d5c3d', fontSize: 14, marginBottom: 28 }}>Report a lost or found pet and browse</p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <button style={s.btnHeroFill}    onClick={() => { if (!user) { navigate('/login'); return; } setModal('lost'); }}>🤍 Report a lost pet</button>
                  <button style={s.btnHeroOutline} onClick={() => { if (!user) { navigate('/login'); return; } setModal('found'); }}>🤍 Report a found pet</button>
                </div>
              </div>
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'flex-end', position: 'relative', zIndex: 1, height: 200 }}>
                <img src={corgiImg} alt="corgi" style={{ height: 200, objectFit: 'contain', position: 'relative', zIndex: 2 }} />
                <img src={catImg}   alt="cat"   style={{ height: 168, objectFit: 'contain', marginLeft: -24, position: 'relative', zIndex: 1 }} />
              </div>
            </div>
          </div>
        </div>

        {/* Success Banner */}
        {successMsg && (
          <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#15803d', padding: '14px 32px', fontSize: 14, textAlign: 'center' }}>
            ✅ {successMsg}
          </div>
        )}

        {/* ── Content ── */}
        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', padding: '32px' }}>

          {/* Filters — exactly like Adopt page */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1.5px solid var(--border)', borderRadius: 'var(--radius-full)', padding: '10px 18px', maxWidth: 400, background: 'white' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Search by name or description..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 14, flex: 1, color: 'var(--text-dark)' }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, lineHeight: 1, padding: 0 }}>✕</button>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PET_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => setPetTypeFilter(type)}
                  style={{
                    padding: '8px 18px', borderRadius: 'var(--radius-full)', fontSize: 13,
                    fontWeight: petTypeFilter === type ? 600 : 500, border: '1.5px solid', cursor: 'pointer', transition: 'all 0.15s',
                    borderColor: petTypeFilter === type ? 'var(--primary)' : 'var(--border)',
                    background:  petTypeFilter === type ? 'var(--primary)' : 'white',
                    color:       petTypeFilter === type ? 'white' : 'var(--text-mid)',
                  }}
                >
                  {PET_TYPE_ICON[type]} {type}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="loading-spinner"><div className="spinner" /></div>
          ) : (
            <>
              {/* ── LOST PETS ── */}
              <div style={{ marginBottom: 48 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, borderBottom: '2px solid var(--green-100)', paddingBottom: 10 }}>
                  <span style={{ display: 'inline-block', padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: '#fee2e2', color: '#991b1b' }}>LOST</span>
                  <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: 20, fontWeight: 700, color: 'var(--text-dark)', margin: 0 }}>Lost Pets</h2>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--green-50)', border: '1px solid var(--green-200)', borderRadius: 20, padding: '2px 10px', fontWeight: 500 }}>
                    {lostReports.length} report{lostReports.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <GroupedSection
                  reports={lostReports}
                  reportType="Lost"
                  onView={setModal}
                  emptyMsg={search || petTypeFilter !== 'All' ? 'No lost pet reports match your filter.' : 'No lost pet reports yet.'}
                />
              </div>

              {/* ── FOUND PETS ── */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, borderBottom: '2px solid var(--green-100)', paddingBottom: 10 }}>
                  <span style={{ display: 'inline-block', padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: '#dcfce7', color: '#15803d' }}>FOUND</span>
                  <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: 20, fontWeight: 700, color: 'var(--text-dark)', margin: 0 }}>Found Pets</h2>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--green-50)', border: '1px solid var(--green-200)', borderRadius: 20, padding: '2px 10px', fontWeight: 500 }}>
                    {foundReports.length} report{foundReports.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <GroupedSection
                  reports={foundReports}
                  reportType="Found"
                  onView={setModal}
                  emptyMsg={search || petTypeFilter !== 'All' ? 'No found pet reports match your filter.' : 'No found pet reports yet.'}
                />
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />

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
const s = {
  overlay:  { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 20 },
  modal:    { background: 'white', borderRadius: 16, padding: '32px 36px', width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' },
  lbl:      { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-dark)', marginBottom: 6 },
  inp:      { width: '100%', boxSizing: 'border-box', border: '1.5px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontFamily: 'inherit', fontSize: 14, outline: 'none', color: 'var(--text-dark)' },
  dropzone: { border: '2px dashed var(--border)', borderRadius: 10, padding: '28px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, cursor: 'pointer', background: '#f9fafb' },
  selectBtn:{ background: 'var(--text-dark)', color: 'white', border: 'none', borderRadius: 20, padding: '8px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnOutline: { padding: '7px 14px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-full)', fontSize: 13, fontWeight: 500, color: 'var(--text-dark)', background: 'white', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', alignSelf: 'flex-start' },
  btnPrimary: { background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-full)', padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 },
  heroCard:   { backgroundImage: `url(${greenRect})`, backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: 16, padding: '40px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, position: 'relative', overflow: 'hidden' },
  btnHeroFill:    { background: '#1a2e1a', color: 'white', border: 'none', borderRadius: 'var(--radius-full)', padding: '13px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 },
  btnHeroOutline: { background: 'white', color: '#1a2e1a', border: '1.5px solid #1a2e1a', borderRadius: 'var(--radius-full)', padding: '13px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 },
  // Adopt-page card styles
  sectionHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, borderBottom: '2px solid var(--green-100)', paddingBottom: 10 },
  sectionTitle:  { fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 700, color: 'var(--text-dark)', margin: 0 },
  sectionCount:  { fontSize: 12, color: 'var(--text-muted)', background: 'var(--green-50)', border: '1px solid var(--green-200)', borderRadius: 20, padding: '2px 10px', fontWeight: 500 },
  grid:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 },
  petCard: { background: 'white', borderRadius: 12, border: '1.5px solid var(--border)', overflow: 'hidden', cursor: 'pointer' },
  petImg:  { width: '100%', height: 200, objectFit: 'cover', objectPosition: 'top', display: 'block' },
  petInfo: { padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 4 },
  petMeta: { color: 'var(--text-muted)', fontSize: 13, margin: '0 0 4px' },
};