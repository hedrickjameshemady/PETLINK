import { useState, useEffect } from 'react';
import { API } from '../../context/AuthContext';
import { fileUrl } from '../../config';
import ApplicantGrading from '../../components/ApplicantGrading';
import PetEditForm from '../../components/PetEditForm';

const FALLBACK = 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&h=400&fit=crop';

// The order we want species to appear in.
const TYPE_ORDER = ['Dog', 'Cat', 'Bird', 'Rabbit', 'Other'];
const TYPE_LABELS = { Dog: '🐶 Dogs', Cat: '🐱 Cats', Bird: '🐦 Birds', Rabbit: '🐰 Rabbits', Other: '🐾 Other' };

const ACTIVITY_TYPES = ['Feeding', 'Vet Visit', 'Medication', 'Grooming', 'Exercise', 'Training', 'Supplies Purchase', 'Other'];
const FUND_SOURCES = ['Personal Funds', 'Shelter Funds', 'Donation Funds'];

export default function FosterApplicants() {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);   // pet whose applicants we're grading
  const [viewPet, setViewPet] = useState(null);      // pet details modal
  const [editPet, setEditPet] = useState(null);      // pet being edited
  const [toast, setToast] = useState('');

  /* ─── ACTIVITY LOG STATE ─── */
  const [activities, setActivities] = useState([]);
  const [logPet, setLogPet] = useState(null);   // pet we're logging an activity for
  const [actForm, setActForm] = useState({
    activity_type: 'Feeding', description: '', activity_date: '', amount_spent: '', fund_source: '',
  });

  const load = () => {
    setLoading(true);
    API.get('/adoptions/foster/my-pets')
      .then(({ data }) => setPets(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  const loadActivities = () => {
    API.get('/adoptions/foster/activities/my')
      .then(({ data }) => setActivities(data))
      .catch(() => setActivities([]));
  };
  useEffect(() => { load(); loadActivities(); }, []);

  const showToast = (msg, err = false) => { setToast({ msg, err }); setTimeout(() => setToast(''), 2800); };

  const openEdit = (pet) => {
    setViewPet(null);
    setEditPet(pet);
  };

  const openLog = (pet) => {
    setActForm({
      activity_type: 'Feeding', description: '',
      activity_date: new Date().toISOString().slice(0, 10),
      amount_spent: '', fund_source: '',
    });
    setLogPet(pet);
  };

  const handleLogActivity = async (e) => {
    e.preventDefault();
    try {
      await API.post('/adoptions/foster/activities', { ...actForm, pet_id: logPet.id });
      showToast('Activity logged.');
      setLogPet(null);
      loadActivities();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to log activity.', true);
    }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  // ── APPLICANT GRADING VIEW (when a pet is selected) ──
  if (selected) {
    return (
      <div>
        <button
          onClick={() => setSelected(null)}
          style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 14, fontWeight: 500, cursor: 'pointer', marginBottom: 16, padding: 0 }}
        >← Back to my pets</button>
        <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: 22, marginBottom: 4 }}>Applicants for {selected.name}</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 20px' }}>Rate 1–5 stars, then approve or reject.</p>
        <ApplicantGrading petId={selected.id} petName={selected.name} />
      </div>
    );
  }

  // ── GRID VIEW: pets grouped by type ──
  // Group pets by their species so we can print section headers.
  const grouped = {};
  pets.forEach(p => { (grouped[p.type] = grouped[p.type] || []).push(p); });
  const typesPresent = TYPE_ORDER.filter(t => grouped[t]?.length);

  return (
    <div>
      <h1 style={{ fontFamily: "'Fraunces',serif", fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>My Foster Pets</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 24px' }}>
        View and edit the pets you foster, and grade the people applying to adopt them.
      </p>

      {pets.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', background: '#f9fafb', borderRadius: 14, border: '1px dashed var(--border)' }}>
          You don't have any foster pets assigned yet. Ask an admin to assign pets to you.
        </div>
      ) : typesPresent.map(type => (
        <div key={type} style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-dark)', marginBottom: 14, paddingBottom: 8, borderBottom: '2px solid var(--border)' }}>
            {TYPE_LABELS[type] || type} <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: 13 }}>({grouped[type].length})</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {grouped[type].map(p => (
              <div key={p.id} style={{ border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', background: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
                {/* BIG image header */}
                <div style={{ position: 'relative' }}>
                  <img
                    src={p.photo ? fileUrl(p.photo) : FALLBACK}
                    alt={p.name}
                    onError={e => { e.target.onerror = null; e.target.src = FALLBACK; }}
                    style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }}
                  />
                  <span className={`badge badge-${p.status === 'Available' ? 'green' : p.status === 'Adopted' ? 'gray' : 'yellow'}`}
                    style={{ position: 'absolute', top: 12, right: 12 }}>
                    {p.status}
                  </span>
                </div>

                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 18, fontFamily: "'Fraunces',serif" }}>{p.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      {p.breed || p.type} • {p.age_years != null ? `${p.age_years} yr${p.age_years !== 1 ? 's' : ''}` : 'Age N/A'} • {p.gender}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span className="badge badge-blue">{p.applicant_count || 0} applicant{p.applicant_count === 1 ? '' : 's'}</span>
                    {p.pending_count > 0 && <span className="badge badge-yellow">{p.pending_count} pending</span>}
                  </div>

                  {/* Buttons pinned to the bottom */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto', paddingTop: 6 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-outline btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setViewPet(p)}>View</button>
                      <button className="btn btn-outline btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => openEdit(p)}>Edit</button>
                      <button className="btn btn-primary btn-sm" style={{ flex: 1.4, justifyContent: 'center' }} onClick={() => setSelected(p)}>Applicants</button>
                    </div>
                    <button className="btn btn-success btn-sm" style={{ justifyContent: 'center' }} onClick={() => openLog(p)}>+ Log Activity</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* ── MY ACTIVITY LOG ── */}
      {activities.length > 0 && (
        <div style={{ marginTop: 8, border: '1px solid var(--border)', borderRadius: 16, background: '#fff', padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 16, fontFamily: "'Fraunces',serif" }}>My Activity Log</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Total spent: <strong style={{ color: 'var(--text-dark)' }}>₱{activities.reduce((sum, a) => sum + Number(a.amount_spent || 0), 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong>
              {' '}across {activities.length} activit{activities.length === 1 ? 'y' : 'ies'}
            </div>
          </div>
          <div style={{ overflowX: 'auto', maxHeight: 320, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
            <table style={{ minWidth: 640 }}>
              <thead>
                <tr>
                  <th>DATE</th><th>PET</th><th>ACTIVITY</th><th>DETAILS</th><th>AMOUNT</th><th>FUND SOURCE</th>
                </tr>
              </thead>
              <tbody>
                {activities.map(a => (
                  <tr key={a.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{String(a.activity_date).slice(0, 10)}</td>
                    <td style={{ fontWeight: 600 }}>{a.pet_name}</td>
                    <td>{a.activity_type}</td>
                    <td style={{ fontSize: 13, color: 'var(--text-mid)' }}>{a.description || '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{a.amount_spent ? `₱${Number(a.amount_spent).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '—'}</td>
                    <td style={{ fontSize: 13 }}>{a.fund_source || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── LOG ACTIVITY MODAL ── */}
      {logPet && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setLogPet(null)}>
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2 className="modal-title">Log Activity — {logPet.name}</h2>
              <button className="modal-close" onClick={() => setLogPet(null)}>✕</button>
            </div>
            <form onSubmit={handleLogActivity} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Activity *</label>
                  <select className="form-select" required value={actForm.activity_type}
                    onChange={e => setActForm({ ...actForm, activity_type: e.target.value })}>
                    {ACTIVITY_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <input className="form-input" type="date" required value={actForm.activity_date}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={e => setActForm({ ...actForm, activity_date: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">What did you do?</label>
                <textarea className="form-input" rows={3} placeholder="e.g. Brought Max to the vet for his booster shot"
                  value={actForm.description}
                  onChange={e => setActForm({ ...actForm, description: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Amount Spent (₱)</label>
                  <input className="form-input" type="number" min="0" step="0.01" placeholder="Leave blank if none"
                    value={actForm.amount_spent}
                    onChange={e => setActForm({ ...actForm, amount_spent: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Fund Source{Number(actForm.amount_spent) > 0 ? ' *' : ''}</label>
                  <select className="form-select" value={actForm.fund_source}
                    required={Number(actForm.amount_spent) > 0}
                    disabled={!(Number(actForm.amount_spent) > 0)}
                    onChange={e => setActForm({ ...actForm, fund_source: e.target.value })}>
                    <option value="">—</option>
                    {FUND_SOURCES.map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setLogPet(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Activity</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── VIEW DETAILS MODAL ── */}
      {viewPet && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewPet(null)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">{viewPet.name}</h2>
              <button className="modal-close" onClick={() => setViewPet(null)}>✕</button>
            </div>
            <img
              src={viewPet.photo ? fileUrl(viewPet.photo) : FALLBACK}
              alt={viewPet.name}
              onError={e => { e.target.onerror = null; e.target.src = FALLBACK; }}
              style={{ width: '100%', height: 240, objectFit: 'cover', borderRadius: 12, marginBottom: 16 }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
              <Row label="Type" value={viewPet.type} />
              <Row label="Breed" value={viewPet.breed} />
              <Row label="Age" value={viewPet.age_years != null ? `${viewPet.age_years} yr(s)` : null} />
              <Row label="Gender" value={viewPet.gender} />
              <Row label="Color" value={viewPet.color} />
              <Row label="Weight" value={viewPet.weight ? `${Number(viewPet.weight)} kg` : null} />
              <Row label="Health" value={viewPet.health_status} />
              <Row label="Status" value={viewPet.status} />
              <Row label="Vet" value={viewPet.vet_name} />
              <Row label="Clinic" value={viewPet.clinic_name} />
              {viewPet.description && (
                <div style={{ marginTop: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Description</div>
                  <p style={{ margin: 0, lineHeight: 1.6, color: 'var(--text-mid)' }}>{viewPet.description}</p>
                </div>
              )}
              {viewPet.medical_notes && (
                <div style={{ marginTop: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Medical Notes</div>
                  <p style={{ margin: 0, lineHeight: 1.6, color: 'var(--text-mid)' }}>{viewPet.medical_notes}</p>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn btn-outline" onClick={() => openEdit(viewPet)}>Edit</button>
              <button className="btn btn-primary" onClick={() => { setSelected(viewPet); setViewPet(null); }}>View Applicants</button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL (shared full-featured form, same as admin) ── */}
      {editPet && (
        <PetEditForm
          pet={editPet}
          lockStatusAdopted
          onClose={() => setEditPet(null)}
          onSaved={() => { setEditPet(null); load(); showToast('Pet updated.'); }}
        />
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: toast.err ? '#dc3545' : '#52a872', color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 14, fontWeight: 500, zIndex: 999 }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// Small helper for the details modal rows — hides itself if there's no value.
function Row({ label, value }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, paddingBottom: 6, borderBottom: '1px solid #f5f5f5' }}>
      <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
      <span style={{ textAlign: 'right' }}>{value}</span>
    </div>
  );
}