import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { API, useAuth } from '../context/AuthContext';

const PET_PHOTOS = [
  'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1548681528-6a5c45b66b42?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1574144611937-0df059b5ef3e?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1529429617124-95b109e86bb8?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1592754862816-1a21a4ea2281?w=400&h=400&fit=crop',
];

const EMPTY_FORM = {
  living_situation: '',
  has_yard: false,
  other_pets: '',
  children_at_home: '',
  experience_with_pets: '',
  reason_for_adoption: '',
  preferred_contact: 'Email',
  full_name: '',
  email: '',
  phone: '',
  address: '',
};

export default function Adopt() {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All Status');
  const [applyPet, setApplyPet] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { fetchPets(); }, [status]);

  const fetchPets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (status !== 'All Status') params.set('status', status);
      if (search) params.set('search', search);
      const { data } = await API.get(`/pets?${params}`);
      setPets(data);
    } catch {
      setPets(DEMO_PETS);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchPets();
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    try {
      setSubmitting(true);
      await API.post('/adoptions', { ...form, pet_id: applyPet.id });
      setSuccess(true);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    setApplyPet(null);
    setSuccess(false);
    setForm(EMPTY_FORM);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ flex: 1, maxWidth: 1200, margin: '0 auto', width: '100%', padding: '32px 32px' }}>
        <h1 style={styles.pageTitle}>Adopt a Pet</h1>

        <div style={styles.infoBox}>
          <span style={styles.infoIcon}>ℹ</span>
          <p style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.6, margin: 0 }}>
            This page allows you to browse available pets for adoption. You may view each pet's photo, basic details, and adoption status.
            Use the search and filter options to narrow your selection based on species, age, or availability. Select a pet to view more information
            and proceed with the adoption application. All actions can be completed using a mouse or keyboard, and clear labels are
            provided to help you navigate easily.
          </p>
        </div>

        {/* Filters */}
        <div style={styles.filters}>
          <form onSubmit={handleSearch} style={styles.searchBox}>
            <input
              type="text"
              placeholder="Search by Name or breed"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={styles.searchInput}
            />
            <button type="submit" style={styles.searchBtn}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </button>
          </form>
          <select value={status} onChange={e => setStatus(e.target.value)} style={styles.filterSelect}>
            <option>All Status</option>
            <option value="Available">Available</option>
            <option value="Pending">Pending</option>
            <option value="Adopted">Adopted</option>
          </select>
          <button style={styles.filterBtn}>
            Personality
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 6 }}>
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
          </button>
        </div>

        {/* Pet Grid */}
        {loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : pets.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🐾</div>
            <h3>No pets found</h3>
            <p>Try adjusting your search or filters</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {pets.map((pet, i) => {
              const photo = pet.photo || PET_PHOTOS[i % PET_PHOTOS.length];
              return (
                <div key={pet.id} style={styles.petCard}>
                  <div style={styles.petImgWrap}>
                    <img
                      src={photo}
                      alt={pet.name}
                      style={styles.petImg}
                      onError={e => { e.target.src = PET_PHOTOS[i % PET_PHOTOS.length]; }}
                    />
                  </div>
                  <div style={styles.petInfo}>
                    <div style={{ marginBottom: 10 }}>
                      <strong style={{ fontSize: 15, color: 'var(--text-dark)' }}>{pet.name}</strong>
                      <span style={styles.petMeta}> {pet.breed} • {pet.age_years} yr{pet.age_years !== 1 ? 's' : ''} • {pet.gender}</span>
                    </div>
                    <div style={styles.petActions}>
                      <button onClick={() => navigate(`/adopt/${pet.id}`, { state: { photo: pet.photo || PET_PHOTOS[i % PET_PHOTOS.length] } })} style={styles.btnOutline}>
                        View Details
                      </button>
                      <button onClick={() => setApplyPet({ ...pet, resolvedPhoto: pet.photo || PET_PHOTOS[i % PET_PHOTOS.length] })} style={styles.btnPrimary}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}>
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                        Apply for Adoption
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Inline Adoption Modal */}
      {applyPet && !success && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Adoption Application — {applyPet.name}</h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleApplySubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

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
                <label className="form-label">Why do you want to adopt {applyPet.name}?</label>
                <textarea className="form-textarea" placeholder="Tell us why you'd be a great match..." value={form.reason_for_adoption} onChange={e => setForm({...form, reason_for_adoption: e.target.value})} required />
              </div>

              <div className="form-group">
                <label className="form-label">Preferred Contact Method</label>
                <select className="form-select" value={form.preferred_contact} onChange={e => setForm({...form, preferred_contact: e.target.value})}>
                  <option>Email</option>
                  <option>Phone</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" placeholder="Your full name" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input className="form-input" type="email" placeholder="your@email.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input className="form-input" type="tel" placeholder="e.g. 09171234567" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <input className="form-input" placeholder="Your current address" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
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
        <div className="modal-overlay">
          <div className="modal" style={{ textAlign: 'center', padding: '48px 32px' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🐾</div>
            <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: 24, marginBottom: 12 }}>Application Submitted!</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Thank you for applying to adopt {applyPet.name}. We'll review your application and get back to you soon.</p>
            <button className="btn btn-primary" onClick={closeModal} style={{ margin: '0 auto' }}>Back to Adopt</button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

const DEMO_PETS = [
  { id: 1, name: 'Kitty', type: 'Dog', breed: 'Maine Coon', age_years: 2, gender: 'Male', status: 'Available' },
  { id: 2, name: 'Kitty', type: 'Cat', breed: 'Maine Coon', age_years: 2, gender: 'Male', status: 'Available' },
  { id: 3, name: 'Kitty', type: 'Dog', breed: 'Maine Coon', age_years: 2, gender: 'Male', status: 'Available' },
  { id: 4, name: 'Kitty', type: 'Cat', breed: 'Maine Coon', age_years: 2, gender: 'Male', status: 'Available' },
  { id: 5, name: 'Kitty', type: 'Dog', breed: 'Maine Coon', age_years: 2, gender: 'Male', status: 'Available' },
  { id: 6, name: 'Kitty', type: 'Cat', breed: 'Maine Coon', age_years: 2, gender: 'Male', status: 'Available' },
  { id: 7, name: 'Kitty', type: 'Dog', breed: 'Maine Coon', age_years: 2, gender: 'Male', status: 'Available' },
  { id: 8, name: 'Kitty', type: 'Cat', breed: 'Maine Coon', age_years: 2, gender: 'Male', status: 'Available' },
];

const styles = {
  pageTitle: { fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 700, marginBottom: 16, color: 'var(--text-dark)' },
  infoBox: { display: 'flex', gap: 10, background: '#f0faf4', border: '1px solid #c3e6cb', borderRadius: 8, padding: '14px 18px', marginBottom: 24, alignItems: 'flex-start' },
  infoIcon: { color: 'white', fontWeight: 700, flexShrink: 0, marginTop: 1, background: 'var(--primary)', borderRadius: '50%', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 },
  filters: { display: 'flex', gap: 10, marginBottom: 28, alignItems: 'center', flexWrap: 'wrap' },
  searchBox: { display: 'flex', position: 'relative', flex: '1 1 260px', maxWidth: 340 },
  searchInput: { flex: 1, padding: '10px 42px 10px 16px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-full)', fontSize: 14, fontFamily: 'inherit', outline: 'none' },
  searchBtn: { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 0 },
  filterSelect: { padding: '10px 16px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-full)', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: 'white', cursor: 'pointer' },
  filterBtn: { padding: '10px 16px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-full)', fontSize: 14, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', fontFamily: 'inherit' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 },
  petCard: { background: 'white', borderRadius: 12, border: '1.5px solid var(--border)', overflow: 'hidden' },
  petImgWrap: { width: '100%', height: 220, overflow: 'hidden', background: '#f5f5f5' },
  petImg: { width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' },
  petInfo: { padding: '14px 16px 16px' },
  petMeta: { color: 'var(--text-muted)', fontSize: 13, fontWeight: 400 },
  petActions: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  btnOutline: { padding: '7px 14px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-full)', fontSize: 13, fontWeight: 500, color: 'var(--text-dark)', background: 'white', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' },
  btnPrimary: { padding: '7px 14px', border: '1.5px solid var(--primary)', borderRadius: 'var(--radius-full)', fontSize: 13, fontWeight: 500, color: 'var(--primary)', background: 'white', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' },
};