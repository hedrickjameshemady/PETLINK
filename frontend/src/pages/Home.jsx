import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      {/* Hero Section */}
      <section style={styles.hero}>
        <div style={styles.heroContent}>
          <h1 style={styles.heroTitle}>
            Find Your Forever Friend — Adopt,<br />
            Volunteer, or Donate Today
          </h1>
          <p style={styles.heroSubtitle}>
            Discover adoptable pets, join our volunteer family, or<br />
            support rescues with donations.
          </p>
          <div style={styles.heroBtns}>
            <Link to="/adopt" className="btn btn-primary" style={{ padding: '12px 24px', fontSize: 15 }}>
              <span>♡</span> Adopt a pet Now!
            </Link>
            <Link to="/donate" className="btn btn-outline" style={{ padding: '12px 24px', fontSize: 15 }}>
              <span>♡</span> Donate
            </Link>
          </div>
        </div>

        {/* Dog image + decorative blobs */}
        <div style={styles.heroVisual}>
          {/* Green bottom blob */}
          <div style={styles.blobBottomLeft} />
          <div style={styles.blobBottomRight} />
          <div style={styles.blobRight} />

          {/* Paw prints */}
          <div style={styles.paw1}>🐾</div>
          <div style={styles.paw2}>🐾</div>

          {/* Crown / decorative shapes */}
          <svg style={styles.deco} width="120" height="140" viewBox="0 0 120 140" fill="none">
            <path d="M90 10 L60 50 L30 10 L0 40 L30 80 L90 80 L120 40 Z" stroke="#2d6a4f" strokeWidth="2.5" fill="none"/>
            <path d="M20 20 L30 5 M60 0 L60 15 M100 20 L90 5" stroke="#2d6a4f" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>

          <img src="/corgi.png" alt="Adorable corgi" style={styles.dogImg}
            onError={e => { e.target.src = 'https://placedog.net/400/450?r'; }} />
        </div>
      </section>

      {/* Features Row */}
      <section style={styles.features}>
        <div style={styles.featuresInner}>
          {[
            { icon: '🐕', title: 'Find a Pet', desc: 'Browse hundreds of animals looking for forever homes.' },
            { icon: '🤝', title: 'Volunteer', desc: 'Give your time and make a difference in animals\' lives.' },
            { icon: '💚', title: 'Donate', desc: 'Every peso helps feed, care, and rehome shelter animals.' },
            { icon: '📢', title: 'Campaigns', desc: 'Join community events and awareness campaigns.' },
          ].map(f => (
            <div key={f.title} style={styles.featureCard}>
              <div style={styles.featureIcon}>{f.icon}</div>
              <h3 style={styles.featureTitle}>{f.title}</h3>
              <p style={styles.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}

const styles = {
  hero: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    background: '#f5f8f5',
    minHeight: 520,
    overflow: 'hidden',
    margin: '0',
    padding: '48px 64px',
  },
  heroContent: {
    flex: 1,
    maxWidth: 620,
    zIndex: 2,
    position: 'relative',
  },
  heroTitle: {
    fontFamily: "'Fraunces', serif",
    fontSize: 42,
    fontWeight: 700,
    lineHeight: 1.2,
    color: 'var(--text-dark)',
    marginBottom: 16,
    letterSpacing: '-0.02em',
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'var(--text-mid)',
    lineHeight: 1.6,
    marginBottom: 32,
  },
  heroBtns: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  heroVisual: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    top: 0,
    width: '55%',
    zIndex: 1,
  },
  blobRight: {
    position: 'absolute',
    right: 0,
    top: '20%',
    width: '60%',
    height: '80%',
    background: 'var(--primary)',
    borderRadius: '60% 0 0 60%',
    zIndex: 0,
  },
  blobBottomLeft: {
    position: 'absolute',
    left: '-2%',
    bottom: 0,
    width: 220,
    height: 180,
    background: 'var(--primary-dark)',
    borderRadius: '50% 50% 0 0',
    zIndex: 1,
  },
  blobBottomRight: {
    position: 'absolute',
    left: '30%',
    bottom: 0,
    width: 300,
    height: 120,
    background: 'var(--primary)',
    borderRadius: '50% 50% 0 0',
    zIndex: 1,
  },
  paw1: { position: 'absolute', left: '12%', top: '38%', fontSize: 40, color: '#4a9b6a', zIndex: 2, opacity: 0.7 },
  paw2: { position: 'absolute', left: '5%', top: '55%', fontSize: 32, color: '#4a9b6a', zIndex: 2, opacity: 0.7 },
  deco: { position: 'absolute', right: '24%', top: '5%', zIndex: 3, opacity: 0.8 },
  dogImg: {
    position: 'absolute',
    right: '3%',
    bottom: 0,
    height: '95%',
    objectFit: 'contain',
    zIndex: 2,
  },
  features: {
    background: 'white',
    padding: '48px 32px',
    borderTop: '1px solid var(--border)',
  },
  featuresInner: {
    maxWidth: 1100,
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 24,
  },
  featureCard: {
    textAlign: 'center',
    padding: '28px 20px',
    borderRadius: 'var(--radius-lg)',
    border: '1.5px solid var(--border)',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  featureIcon: { fontSize: 40, marginBottom: 12 },
  featureTitle: { fontWeight: 700, fontSize: 16, marginBottom: 8, color: 'var(--text-dark)' },
  featureDesc: { fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 },
};
