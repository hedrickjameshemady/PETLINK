import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { API } from '../context/AuthContext';

const PET_PHOTOS = [
  'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1548681528-6a5c45b66b42?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1574144611937-0df059b5ef3e?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1529429617124-95b109e86bb8?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1592754862816-1a21a4ea2281?w=300&h=300&fit=crop',
];

export default function Adopt() {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All Status');

  useEffect(() => {
    fetchPets();
  }, [status]);

  const fetchPets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (status !== 'All Status') params.set('status', status);
      if (search) params.set('search', search);
      const { data } = await API.get(`/pets?${params}`);
      setPets(data);
    } catch {
      // Demo: show placeholder pets
      setPets(DEMO_PETS);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchPets();
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ flex: 1, maxWidth: 1200, margin: '0 auto', width: '100%', padding: '32px 32px' }}>
        <h1 style={styles.pageTitle}>Adopt a Pet</h1>

        <div style={styles.infoBox}>
          <span style={styles.infoIcon}>ℹ</span>
          <p style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.5 }}>
            This page allows you to browse available pets for adoption. You may view each pet's photo, basic details, and adoption status.
            Use the search and filter options to narrow your selection based on species, age, or availability. Select a pet to view more information
            and proceed with the adoption application.
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
            <button type="submit" style={styles.searchBtn}>🔍</button>
          </form>
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            style={styles.filterSelect}
          >
            <option>All Status</option>
            <option value="Available">Available</option>
            <option value="Pending">Pending</option>
            <option value="Adopted">Adopted</option>
          </select>
          <button style={styles.filterBtn}>Personality ▾</button>
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
            {pets.map((pet, i) => (
              <div key={pet.id} style={styles.petCard}>
                <div style={styles.petImgWrap}>
                  <img
                    src={pet.photo || PET_PHOTOS[i % PET_PHOTOS.length]}
                    alt={pet.name}
                    style={styles.petImg}
                    onError={e => { e.target.src = PET_PHOTOS[i % PET_PHOTOS.length]; }}
                  />
                </div>
                <div style={styles.petInfo}>
                  <div>
                    <strong style={{ fontSize: 15 }}>{pet.name}</strong>
                    <span style={styles.petMeta}> {pet.breed} • {pet.age_years} yr{pet.age_years !== 1 ? 's' : ''} • {pet.gender}</span>
                  </div>
                  <div style={styles.petActions}>
                    <Link to={`/adopt/${pet.id}`} className="btn btn-outline btn-sm">View Details</Link>
                    <Link to={`/adopt/${pet.id}#apply`} className="btn btn-primary btn-sm">
                      <span>♡</span> Apply for Adoption
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

const DEMO_PETS = [
  { id: 1, name: 'Hedrick', type: 'Dog', breed: 'Maine Coon', age_years: 2, gender: 'Male', status: 'Available' },
  { id: 2, name: 'Kitty', type: 'Cat', breed: 'Maine Coon', age_years: 2, gender: 'Male', status: 'Available' },
  { id: 3, name: 'Buddy', type: 'Dog', breed: 'Golden Retriever', age_years: 2, gender: 'Male', status: 'Available' },
  { id: 4, name: 'Sia', type: 'Cat', breed: 'Siamese', age_years: 1, gender: 'Female', status: 'Available' },
  { id: 5, name: 'Max', type: 'Dog', breed: 'Poodle', age_years: 3, gender: 'Male', status: 'Pending' },
  { id: 6, name: 'Luna', type: 'Cat', breed: 'Persian', age_years: 2, gender: 'Female', status: 'Available' },
  { id: 7, name: 'Rocky', type: 'Dog', breed: 'Dalmatian', age_years: 1, gender: 'Male', status: 'Available' },
  { id: 8, name: 'Mochi', type: 'Cat', breed: 'Tabby', age_years: 2, gender: 'Female', status: 'Available' },
];

const styles = {
  pageTitle: { fontFamily: "'Fraunces',serif", fontSize: 28, fontWeight: 700, marginBottom: 16, color: 'var(--text-dark)' },
  infoBox: {
    display: 'flex',
    gap: 10,
    background: 'var(--green-50)',
    border: '1px solid var(--green-200)',
    borderRadius: 'var(--radius-md)',
    padding: '14px 18px',
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  infoIcon: { color: 'var(--primary)', fontWeight: 700, fontSize: 16, flexShrink: 0, marginTop: 1 },
  filters: { display: 'flex', gap: 10, marginBottom: 28, alignItems: 'center', flexWrap: 'wrap' },
  searchBox: { display: 'flex', flex: '1 1 260px', maxWidth: 340, position: 'relative' },
  searchInput: {
    flex: 1,
    padding: '10px 42px 10px 14px',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-full)',
    fontSize: 14,
    fontFamily: 'inherit',
    outline: 'none',
  },
  searchBtn: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 16,
  },
  filterSelect: {
    padding: '10px 16px',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-full)',
    fontSize: 14,
    fontFamily: 'inherit',
    outline: 'none',
    background: 'white',
    cursor: 'pointer',
  },
  filterBtn: {
    padding: '10px 16px',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-full)',
    fontSize: 14,
    background: 'white',
    cursor: 'pointer',
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 },
  petCard: {
    background: 'white',
    borderRadius: 'var(--radius-lg)',
    border: '1.5px solid var(--border)',
    overflow: 'hidden',
    transition: 'box-shadow 0.2s',
  },
  petImgWrap: { width: '100%', height: 200, overflow: 'hidden', background: '#f5f5f5' },
  petImg: { width: '100%', height: '100%', objectFit: 'cover' },
  petInfo: { padding: '14px 16px 16px' },
  petMeta: { color: 'var(--text-muted)', fontSize: 13, fontWeight: 400 },
  petActions: { display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' },
};
