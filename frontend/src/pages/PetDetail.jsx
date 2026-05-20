import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { API, useAuth } from '../context/AuthContext';

export default function PetDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({ living_situation: '', has_yard: false, other_pets: '', children_at_home: '', experience_with_pets: '', reason_for_adoption: '', preferred_contact: 'Email' });

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

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;
  if (!pet) return <div>Pet not found</div>;

  const img = `https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=500&h=400&fit=crop`;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main style={{ flex: 1, maxWidth: 1000, margin: '0 auto', width: '100%', padding: '32px' }}>
        <button onClick={() => navigate(-1)} style={styles.back}>← Back</button>

        <div style={styles.petLayout}>
          <div style={styles.imgSide}>
            <img src={pet.photo || img} alt={pet.name} style={styles.petImg}
              onError={e => { e.target.src = img; }} />
          </div>
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
              <div style={styles.detailItem}><span style={styles.detailLabel}>Vaccinated</span><span>{pet.vaccination_status ? 'Yes' : 'No'}</span></div>
              <div style={styles.detailItem}><span style={styles.detailLabel}>Neutered</span><span>{pet.neutered ? 'Yes' : 'No'}</span></div>
            </div>

            {pet.description && <p style={styles.desc}>{pet.description}</p>}

            {pet.assessment && (
              <div style={styles.assessment}>
                <div style={styles.assessTitle}>Behavioral Traits</div>
                <div style={styles.traits}>
                  {(typeof pet.assessment.traits === 'string' ? JSON.parse(pet.assessment.traits) : pet.assessment.traits || []).map(t => (
                    <span key={t} className="badge badge-blue" style={{ marginRight: 6, marginBottom: 4 }}>{t}</span>
                  ))}
                </div>
                {pet.assessment.compatibility_notes && (
                  <p style={{ fontSize: 13, color: 'var(--text-mid)', marginTop: 8 }}>{pet.assessment.compatibility_notes}</p>
                )}
              </div>
            )}

            {pet.status === 'Available' && (
              <button
                onClick={() => setShowForm(true)}
                className="btn btn-primary"
                style={{ marginTop: 20, width: '100%', justifyContent: 'center' }}
              >
                ♡ Apply for Adoption
              </button>
            )}
          </div>
        </div>

        {/* Adoption Form Modal */}
        {showForm && !success && (
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
            <div className="modal">
              <div className="modal-header">
                <h2 className="modal-title">Adoption Application — {pet.name}</h2>
                <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
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
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                  <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit Application'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {success && (
          <div className="modal-overlay">
            <div className="modal" style={{ textAlign: 'center', padding: '48px 32px' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🐾</div>
              <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: 24, marginBottom: 12 }}>Application Submitted!</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Thank you for applying to adopt {pet.name}. We'll review your application and get back to you soon.</p>
              <button className="btn btn-primary" onClick={() => navigate('/adopt')} style={{ margin: '0 auto' }}>Browse More Pets</button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

const DEMO_PET = { id: 1, name: 'Buddy', type: 'Dog', breed: 'Golden Retriever', age_years: 2, gender: 'Male', health_status: 'Excellent', status: 'Available', vaccination_status: true, neutered: true, description: 'Very social and energetic. Loves playing fetch and interacting with people.', assessment: { traits: '["Friendly","Hyperattached","Good with kids"]', compatibility_notes: 'Ideal for active families with children.' } };

const styles = {
  back: { background: 'none', border: 'none', color: 'var(--primary)', fontSize: 14, fontWeight: 500, cursor: 'pointer', marginBottom: 20, padding: 0 },
  petLayout: { display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 40, alignItems: 'start' },
  imgSide: {},
  petImg: { width: '100%', borderRadius: 'var(--radius-lg)', objectFit: 'cover', maxHeight: 420 },
  infoSide: {},
  name: { fontFamily: "'Fraunces',serif", fontSize: 32, fontWeight: 700, marginBottom: 4 },
  sub: { color: 'var(--text-muted)', fontSize: 15, marginBottom: 12 },
  badges: { display: 'flex', gap: 8, marginBottom: 20 },
  detailGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px', marginBottom: 16 },
  detailItem: { display: 'flex', gap: 8, fontSize: 14 },
  detailLabel: { color: 'var(--text-muted)', fontWeight: 500 },
  desc: { color: 'var(--text-mid)', fontSize: 14, lineHeight: 1.6, marginBottom: 16 },
  assessment: { background: 'var(--green-50)', border: '1px solid var(--green-200)', borderRadius: 'var(--radius-md)', padding: '14px 16px', marginBottom: 8 },
  assessTitle: { fontWeight: 600, fontSize: 14, marginBottom: 8, color: 'var(--primary-dark)' },
  traits: { display: 'flex', flexWrap: 'wrap' },
};
