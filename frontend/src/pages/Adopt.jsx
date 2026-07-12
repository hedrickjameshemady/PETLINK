import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { API } from '../context/AuthContext';

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

const PET_TYPES = ['All', 'Dog', 'Cat', 'Bird', 'Rabbit', 'Others'];

export default function Adopt() {
  const [allPets, setAllPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [breedFilter, setBreedFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const navigate = useNavigate();

  useEffect(() => { fetchPets(); }, []);

  const fetchPets = async () => {
    try {
      setLoading(true);
      // Only fetch Available and Pending — no Adopted
      const { data } = await API.get('/pets');
      setAllPets(data);
    } catch {
      setAllPets(DEMO_PETS);
    } finally {
      setLoading(false);
    }
  };

  // Breeds actually available right now, narrowed by the selected type tab
  const breedOptions = [...new Set(
    allPets
      .filter(p => (typeFilter === 'All' ? true : p.type === typeFilter))
      .map(p => (p.breed || '').trim())
      .filter(Boolean)
  )].sort();

  // Filter by pet type and breed
  const filteredPets = allPets.filter(pet => {
    const matchesType = typeFilter === 'All' ? true : pet.type === typeFilter;
    const matchesBreed = breedFilter === 'All' ? true : (pet.breed || '').trim() === breedFilter;
    return matchesType && matchesBreed;
  });

  // Group filtered pets by type
  const grouped = filteredPets.reduce((acc, pet) => {
    const key = pet.type || 'Others';
    if (!acc[key]) acc[key] = [];
    acc[key].push(pet);
    return acc;
  }, {});

  const groupOrder = ['Dog', 'Cat', 'Bird', 'Rabbit', 'Others'];
  const sortedGroups = Object.keys(grouped).sort(
    (a, b) => groupOrder.indexOf(a) - groupOrder.indexOf(b)
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ flex: 1, maxWidth: 1200, margin: '0 auto', width: '100%', padding: '32px' }}>
        <h1 style={styles.pageTitle}>Adopt a Pet</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 15, marginBottom: 28 }}>
          Browse our available pets and find your perfect companion. Click "View Details" to learn more and apply for adoption.
        </p>

        {/* Filters */}
        <div style={styles.filters}>
          {/* Breed filter */}
          <div style={styles.searchBox}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>🐾</span>
            <select
              value={breedFilter}
              onChange={e => setBreedFilter(e.target.value)}
              style={{ ...styles.searchInput, background: 'transparent', cursor: 'pointer' }}
            >
              <option value="All">All Breeds</option>
              {breedOptions.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          {/* Type filter tabs */}
          <div style={styles.typeTabs}>
            {PET_TYPES.map(type => (
              <button
                key={type}
                onClick={() => { setTypeFilter(type); setBreedFilter('All'); }}
                style={{
                  ...styles.typeTab,
                  ...(typeFilter === type ? styles.typeTabActive : {}),
                }}
              >
                {type === 'Dog' ? '🐶' : type === 'Cat' ? '🐱' : type === 'Bird' ? '🐦' : type === 'Rabbit' ? '🐰' : type === 'Others' ? '🐾' : '✨'} {type}
              </button>
            ))}
          </div>
        </div>

        {/* Pet Groups */}
        {loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : filteredPets.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🐾</div>
            <h3>No pets found</h3>
            <p>Try adjusting your search or filter</p>
          </div>
        ) : (
          sortedGroups.map(type => (
            <div key={type} style={{ marginBottom: 40 }}>
              {/* Section header */}
              <div style={styles.sectionHeader}>
                <span style={styles.sectionIcon}>
                  {type === 'Dog' ? '🐶' : type === 'Cat' ? '🐱' : type === 'Bird' ? '🐦' : type === 'Rabbit' ? '🐰' : '🐾'}
                </span>
                <h2 style={styles.sectionTitle}>{type}s</h2>
                <span style={styles.sectionCount}>{grouped[type].length} available</span>
              </div>

              <div style={styles.grid}>
                {grouped[type].map((pet, i) => {
                  const photo = pet.photo ? pet.photo : PET_PHOTOS[i % PET_PHOTOS.length];
                  const isPending = !!pet.my_pending;
                  return (
                    <div key={pet.id} style={styles.petCard}>
                      <div style={{ position: 'relative' }}>
                        <img
                          src={photo}
                          alt={pet.name}
                          style={styles.petImg}
                          onError={e => { e.target.onerror = null; e.target.src = PET_PHOTOS[i % PET_PHOTOS.length]; }}
                        />
                        {isPending && (
                          <div style={styles.pendingBadge}>⏳ PENDING</div>
                        )}
                      </div>
                      <div style={styles.petInfo}>
                        <strong style={{ fontSize: 15, color: 'var(--text-dark)' }}>{pet.name}</strong>
                        <p style={styles.petMeta}>{pet.breed} • {pet.age_years} yr{pet.age_years !== 1 ? 's' : ''} • {pet.gender}</p>
                        <button
                          onClick={() => navigate(`/adopt/${pet.id}`, { state: { photo } })}
                          style={styles.btnOutline}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </main>

      <Footer />
    </div>
  );
}

const DEMO_PETS = [
  { id: 1, name: 'Buddy', type: 'Dog', breed: 'Labrador', age_years: 2, gender: 'Male', status: 'Available' },
  { id: 2, name: 'Mittens', type: 'Cat', breed: 'Persian', age_years: 1, gender: 'Female', status: 'Available' },
  { id: 3, name: 'Max', type: 'Dog', breed: 'Beagle', age_years: 3, gender: 'Male', status: 'Pending' },
  { id: 4, name: 'Luna', type: 'Cat', breed: 'Siamese', age_years: 2, gender: 'Female', status: 'Available' },
  { id: 5, name: 'Tweety', type: 'Bird', breed: 'Canary', age_years: 1, gender: 'Male', status: 'Available' },
  { id: 6, name: 'Coco', type: 'Rabbit', breed: 'Holland Lop', age_years: 1, gender: 'Female', status: 'Available' },
];

const styles = {
  pageTitle: { fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 700, marginBottom: 8, color: 'var(--text-dark)' },
  filters: { display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 },
  searchBox: {
    display: 'flex', alignItems: 'center', gap: 10,
    border: '1.5px solid var(--border)', borderRadius: 'var(--radius-full)',
    padding: '10px 18px', maxWidth: 400, background: 'white',
  },
  searchInput: { border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 14, flex: 1, color: 'var(--text-dark)' },
  typeTabs: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  typeTab: {
    padding: '8px 18px', borderRadius: 'var(--radius-full)', fontSize: 13, fontWeight: 500,
    border: '1.5px solid var(--border)', background: 'white', color: 'var(--text-mid)',
    cursor: 'pointer', transition: 'all 0.15s',
  },
  typeTabActive: {
    background: 'var(--primary)', color: 'white', border: '1.5px solid var(--primary)', fontWeight: 600,
  },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, borderBottom: '2px solid var(--green-100)', paddingBottom: 10 },
  sectionIcon: { fontSize: 22 },
  sectionTitle: { fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: 'var(--text-dark)', margin: 0 },
  sectionCount: { fontSize: 12, color: 'var(--text-muted)', background: 'var(--green-50)', border: '1px solid var(--green-200)', borderRadius: 20, padding: '2px 10px', fontWeight: 500 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 },
  petCard: { background: 'white', borderRadius: 12, border: '1.5px solid var(--border)', overflow: 'hidden' },
  petImg: { width: '100%', height: 200, objectFit: 'cover', objectPosition: 'top', display: 'block' },
  pendingBadge: {
    position: 'absolute', top: 10, left: 10,
    background: '#d97706', color: 'white', fontSize: 11, fontWeight: 700,
    padding: '3px 10px', borderRadius: 20, letterSpacing: '0.04em',
  },
  petInfo: { padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 4 },
  petMeta: { color: 'var(--text-muted)', fontSize: 13, margin: '0 0 8px' },
  btnOutline: {
    padding: '7px 14px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-full)',
    fontSize: 13, fontWeight: 500, color: 'var(--text-dark)', background: 'white',
    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', alignSelf: 'flex-start',
  },
};