import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { API, useAuth } from '../context/AuthContext';
import { SuccessModal } from '../components/ConfirmDialog';

const EMPTY_FORM = {
  living_situation: '',
  has_yard: false,
  other_pets: '',
  children_at_home: '',
  experience_with_pets: '',
  reason_for_adoption: '',
  preferred_contact: 'Email',
};

export default function PetDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    fetchPet();
    if (window.location.hash === '#apply') setShowForm(true);
  }, [id]);

  const fetchPet = async () => {
    try {
      const { data } = await API.get(`/pets/${id}`);
      setPet(data);
    } catch {
      setPet(DEMO_PET);
    } finally { setLoading(false); }
  };

  const handleApplyClick = () => {
    if (!user) { navigate('/login'); return; }
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    try {
      setSubmitting(true);
      await API.post('/adoptions', { ...form, pet_id: id });
      setSuccess(true);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit application');
    } finally { setSubmitting(false); }
  };

  const closeModal = () => {
    setShowForm(false);
    setForm(EMPTY_FORM);
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;
  if (!pet) return <div>Pet not found</div>;

  const fallback = 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=500&h=400&fit=crop';
  const img = pet.photo ? `http://localhost:5000${pet.photo}` : (location.state?.photo || fallback);

  // Safe parse vaccine log
  let vaccineLog = [];
  try { vaccineLog = pet.vaccine_log ? (typeof pet.vaccine_log === 'string' ? JSON.parse(pet.vaccine_log) : pet.vaccine_log) : []; } catch {}

  // Safe parse assessment traits
  let assessmentTraits = [];
  if (pet.assessment?.traits) {
    try { assessmentTraits = typeof pet.assessment.traits === 'string' ? JSON.parse(pet.assessment.traits) : pet.assessment.traits; } catch {}
  }

  const traitColors = {
    Friendly: 'green', Hyperattached: 'yellow', 'Good with kids': 'blue',
    Nonchalant: 'gray', Scared: 'red', 'Need training': 'yellow',
    Playful: 'green', Calm: 'blue', Energetic: 'yellow', Sweet: 'green',
    Aloof: 'gray', Unloving: 'gray',
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main style={{ flex: 1, maxWidth: 1000, margin: '0 auto', width: '100%', padding: '32px 24px' }}>
        <button onClick={() => navigate(-1)} style={styles.back}>← Back</button>

        {/* ── TOP: Photo + Info side by side ── */}
        <div style={styles.petLayout}>

          {/* LEFT: Photo then Medical Records */}
          <div style={styles.imgSide}>
            <img
              src={img}
              alt={pet.name}
              style={styles.petImg}
              onError={e => { e.target.onerror = null; e.target.src = fallback; }}
            />

            {/* Medical Records — under the photo */}
            <div style={styles.medCard}>
              <div style={styles.medTitle}>🏥 Medical Records</div>

              {/* Neutered */}
              <div style={styles.medRow}>
                <span style={styles.medLabel}>Neutered / Spayed</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {pet.neutered
                    ? <><span className="badge badge-blue">✂️ Yes</span>{pet.neutered_date && <span style={styles.medDate}>{new Date(pet.neutered_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}</span>}</>
                    : <span className="badge badge-gray">Not Neutered</span>}
                </span>
              </div>

              {/* Vaccinated */}
              <div style={styles.medRow}>
                <span style={styles.medLabel}>Vaccinated</span>
                {pet.vaccination_status
                  ? <span className="badge badge-green">💉 Yes</span>
                  : <span className="badge badge-gray">Not Vaccinated</span>}
              </div>

              {/* Vaccine log */}
              {pet.vaccination_status && vaccineLog.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={styles.medSubLabel}>Vaccination Log</div>
                  {vaccineLog.map((v, i) => (
                    <div key={i} style={styles.vaccineRow}>
                      <span style={{ fontWeight: 500, fontSize: 13 }}>{v.name}</span>
                      <span style={styles.medDate}>{v.date ? new Date(v.date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Divider if other records exist */}
              {(pet.vet_name || pet.clinic_name || pet.last_checkup_date || pet.medical_notes) && (
                <div style={{ borderTop: '1px solid #e5e7eb', margin: '12px 0' }} />
              )}

              {pet.vet_name && <div style={styles.medRow}><span style={styles.medLabel}>Veterinarian</span><span style={styles.medValue}>{pet.vet_name}</span></div>}
              {pet.clinic_name && <div style={styles.medRow}><span style={styles.medLabel}>Clinic</span><span style={styles.medValue}>{pet.clinic_name}</span></div>}
              {pet.last_checkup_date && <div style={styles.medRow}><span style={styles.medLabel}>Last Checkup</span><span style={styles.medValue}>{new Date(pet.last_checkup_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}</span></div>}
              {pet.medical_notes && (
                <div style={{ marginTop: 10 }}>
                  <div style={styles.medSubLabel}>Notes</div>
                  <p style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.6, margin: 0 }}>{pet.medical_notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Name, details, description, apply */}
          <div style={styles.infoSide}>
            <h1 style={styles.name}>{pet.name}</h1>
            <p style={styles.sub}>{pet.breed} • {pet.age_years} yr{pet.age_years !== 1 ? 's' : ''} • {pet.gender}</p>

            <div style={styles.badges}>
              <span className={`badge badge-${pet.health_status === 'Excellent' ? 'green' : pet.health_status === 'Good' ? 'blue' : 'yellow'}`}>{pet.health_status}</span>
              <span className={`badge badge-${pet.status === 'Available' ? 'green' : pet.status === 'Pending' ? 'yellow' : 'gray'}`}>{pet.status}</span>
            </div>

            <div style={styles.detailGrid}>
              <div style={styles.detailItem}><span style={styles.detailLabel}>Type</span><span>{pet.type}</span></div>
              <div style={styles.detailItem}><span style={styles.detailLabel}>Breed</span><span>{pet.breed}</span></div>
              <div style={styles.detailItem}><span style={styles.detailLabel}>Age</span><span>{pet.age_years} yr(s)</span></div>
              <div style={styles.detailItem}><span style={styles.detailLabel}>Gender</span><span>{pet.gender}</span></div>
              {pet.weight && <div style={styles.detailItem}><span style={styles.detailLabel}>Weight</span><span>{pet.weight} kg</span></div>}
              {pet.color && <div style={styles.detailItem}><span style={styles.detailLabel}>Color</span><span>{pet.color}</span></div>}
            </div>

            {pet.description && <p style={styles.desc}>{pet.description}</p>}

            {pet.status === 'Available' && (
              <button
                onClick={handleApplyClick}
                className="btn btn-primary"
                style={{ marginTop: 20, width: '100%', justifyContent: 'center' }}
              >
                ♡ Apply for Adoption
              </button>
            )}
          </div>
        </div>

        {/* ── BOTTOM: Behavioral Assessment — full width, centered ── */}
        <div style={styles.assessSection}>
          <div style={styles.assessSectionTitle}>🐾 Behavioral Assessment</div>

          {pet.assessment ? (
            <div style={styles.assessCard}>
              {/* Traits */}
              {assessmentTraits.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={styles.assessSubLabel}>Personality Traits</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                    {assessmentTraits.map(t => (
                      <span key={t} className={`badge badge-${traitColors[t] || 'gray'}`} style={{ fontSize: 13, padding: '5px 14px' }}>{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {pet.assessment.description && (
                <div style={{ marginBottom: 16 }}>
                  <div style={styles.assessSubLabel}>About {pet.name}'s Behavior</div>
                  <p style={styles.assessText}>{pet.assessment.description}</p>
                </div>
              )}

              {/* Compatibility */}
              {pet.assessment.compatibility_notes && (
                <div style={{ background: 'var(--green-50)', border: '1px solid var(--green-200)', borderRadius: 10, padding: '14px 18px' }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--primary-dark)', marginBottom: 6 }}>🏠 Best Suited For</div>
                  <p style={{ fontSize: 13, color: 'var(--text-mid)', margin: 0, lineHeight: 1.6 }}>{pet.assessment.compatibility_notes}</p>
                </div>
              )}

              {pet.assessment.created_at && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 14, textAlign: 'right' }}>
                  Assessed on {new Date(pet.assessment.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              )}
            </div>
          ) : (
            <div style={styles.assessEmpty}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🐾</div>
              <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-dark)', marginBottom: 4 }}>No behavioral assessment yet</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Our team hasn't completed an assessment for {pet.name} yet. Check back soon!</div>
            </div>
          )}
        </div>

        {/* Adoption Modal */}
        {showForm && !success && (
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
            <div className="modal">
              <div className="modal-header">
                <h2 className="modal-title">Adoption Application — {pet.name}</h2>
                <button className="modal-close" onClick={closeModal}>✕</button>
              </div>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                <div className="form-group">
                  <label className="form-label">Living Situation</label>
                  <select className="form-select" value={form.living_situation} onChange={e => setForm({...form, living_situation: e.target.value})} required>
                    <option value="">Select...</option>
                    <option>House with yard</option>
                    <option>House without yard</option>
                    <option>Apartment</option>
                    <option>Condo</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Do you have a yard?</label>
                  <select className="form-select" value={form.has_yard} onChange={e => setForm({...form, has_yard: e.target.value === 'true'})}>
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Other pets at home</label>
                  <input className="form-input" placeholder="E.g. 1 dog, 2 cats or None" value={form.other_pets} onChange={e => setForm({...form, other_pets: e.target.value})} />
                </div>

                <div className="form-group">
                  <label className="form-label">Children at home</label>
                  <select className="form-select" value={form.children_at_home} onChange={e => setForm({...form, children_at_home: e.target.value})}>
                    <option value="">Select...</option>
                    <option>None</option>
                    <option>Infants (0-2)</option>
                    <option>Young children (3-10)</option>
                    <option>Teens (11-17)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Experience with pets</label>
                  <textarea className="form-textarea" placeholder="Describe your experience..." value={form.experience_with_pets} onChange={e => setForm({...form, experience_with_pets: e.target.value})} />
                </div>

                <div className="form-group">
                  <label className="form-label">Why do you want to adopt {pet.name}?</label>
                  <textarea className="form-textarea" placeholder="Tell us why you'd be a great match..." value={form.reason_for_adoption} onChange={e => setForm({...form, reason_for_adoption: e.target.value})} required />
                </div>

                <div className="form-group">
                  <label className="form-label">Preferred Contact Method</label>
                  <select className="form-select" value={form.preferred_contact} onChange={e => setForm({...form, preferred_contact: e.target.value})}>
                    <option>Email</option>
                    <option>Phone</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                  <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit Application'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {success && (
          <SuccessModal
            title="Application Submitted Successfully"
            message="Your adoption application has been received. Our team will review your request and contact you with updates. You can check the status of your application anytime in your email."
            buttonText="Close"
            onClose={() => navigate('/adopt')}
          />
        )}
      </main>
      <Footer />
    </div>
  );
}

const DEMO_PET = {
  id: 1, name: 'Buddy', type: 'Dog', breed: 'Golden Retriever', age_years: 2,
  gender: 'Male', health_status: 'Excellent', status: 'Available',
  vaccination_status: true, neutered: true, neutered_date: '2024-03-15',
  vaccine_log: JSON.stringify([{ name: 'Rabies', date: '2024-01-10' }, { name: 'Distemper', date: '2024-03-01' }]),
  description: 'Very social and energetic. Loves playing fetch and interacting with people.',
  assessment: {
    traits: '["Friendly","Hyperattached","Good with kids"]',
    description: 'Buddy is very social and thrives on human interaction. He gets along well with children and other dogs.',
    compatibility_notes: 'Ideal for active families with children. Good for first-time pet owners.',
    created_at: '2025-01-15T10:00:00',
  }
};

const styles = {
  back: { background: 'none', border: 'none', color: 'var(--primary)', fontSize: 14, fontWeight: 500, cursor: 'pointer', marginBottom: 20, padding: 0 },
  petLayout: { display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 36, alignItems: 'start' },
  imgSide: { display: 'flex', flexDirection: 'column', gap: 16 },
  petImg: { width: '100%', borderRadius: 'var(--radius-lg)', objectFit: 'cover', maxHeight: 380, display: 'block' },
  infoSide: {},
  name: { fontFamily: "'Fraunces',serif", fontSize: 32, fontWeight: 700, marginBottom: 4 },
  sub: { color: 'var(--text-muted)', fontSize: 15, marginBottom: 12 },
  badges: { display: 'flex', gap: 8, marginBottom: 20 },
  detailGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px', marginBottom: 16 },
  detailItem: { display: 'flex', flexDirection: 'column', gap: 2, fontSize: 14 },
  detailLabel: { color: 'var(--text-muted)', fontWeight: 500, fontSize: 12 },
  desc: { color: 'var(--text-mid)', fontSize: 14, lineHeight: 1.6, marginBottom: 16 },

  // Medical card (left column, below photo)
  medCard: { background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 },
  medTitle: { fontWeight: 700, fontSize: 13, color: 'var(--text-dark)', marginBottom: 2 },
  medRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, gap: 8 },
  medLabel: { color: 'var(--text-muted)', fontWeight: 500, flexShrink: 0 },
  medValue: { color: 'var(--text-dark)', textAlign: 'right' },
  medDate: { fontSize: 12, color: 'var(--text-muted)' },
  medSubLabel: { fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 },
  vaccineRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #f0f0f0' },

  // Assessment section (full width below)
  assessSection: { marginTop: 40, maxWidth: 680, marginLeft: 'auto', marginRight: 'auto' },
  assessSectionTitle: { fontWeight: 700, fontSize: 18, color: 'var(--text-dark)', marginBottom: 16, textAlign: 'center' },
  assessCard: { background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 14, padding: '24px 28px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  assessSubLabel: { fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  assessText: { fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.7, margin: '6px 0 0 0' },
  assessEmpty: { background: '#f9fafb', border: '1.5px dashed #d1d5db', borderRadius: 14, padding: '40px 28px', textAlign: 'center' },
};