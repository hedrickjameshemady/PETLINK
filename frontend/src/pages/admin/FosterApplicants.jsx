import { useState, useEffect } from 'react';
import { API } from '../../context/AuthContext';
import { fileUrl } from '../../config';
import ApplicantGrading from '../../components/ApplicantGrading';
import PetEditForm from '../../components/PetEditForm';

const FALLBACK = 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&h=400&fit=crop';

// The order we want species to appear in.
const TYPE_ORDER = ['Dog', 'Cat', 'Bird', 'Rabbit', 'Other'];
const TYPE_LABELS = { Dog: '🐶 Dogs', Cat: '🐱 Cats', Bird: '🐦 Birds', Rabbit: '🐰 Rabbits', Other: '🐾 Other' };

export default function FosterApplicants() {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);   // pet whose applicants we're grading
  const [viewPet, setViewPet] = useState(null);      // pet details modal
  const [editPet, setEditPet] = useState(null);      // pet being edited
  const [toast, setToast] = useState('');

  const load = () => {
    setLoading(true);
    API.get('/adoptions/foster/my-pets')
      .then(({ data }) => setPets(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const showToast = (msg, err = false) => { setToast({ msg, err }); setTimeout(() => setToast(''), 2800); };

  const openEdit = (pet) => {
    setViewPet(null);
    setEditPet(pet);
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
                  <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 6 }}>
                    <button className="btn btn-outline btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setViewPet(p)}>View</button>
                    <button className="btn btn-outline btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => openEdit(p)}>Edit</button>
                    <button className="btn btn-primary btn-sm" style={{ flex: 1.4, justifyContent: 'center' }} onClick={() => setSelected(p)}>Applicants</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

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