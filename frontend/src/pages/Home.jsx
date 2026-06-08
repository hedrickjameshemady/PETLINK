import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

import dogImg  from '../assets/istockphoto-1482199015-612x612 1.png';
import blobBR  from '../assets/Group 48.png';
import pawsImg from '../assets/Group 80.png';

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <section style={s.hero}>

        {/* LEFT — text */}
        <div style={s.left}>
          <h1 style={s.title}>
            Find Your Forever Friend — Adopt,<br />
            Volunteer, or Donate Today
          </h1>
          <p style={s.subtitle}>
            Discover adoptable pets, join our volunteer family, or
            support rescues with donations.
          </p>
          <div style={s.btns}>
            <Link to="/adopt" style={s.btnPrimary}>♡ Adopt a pet Now!</Link>
            <Link to="/donate" style={s.btnOutline}>♡ Donate</Link>
          </div>
        </div>

        {/* RIGHT — paws + dog + blob all together */}
        <div style={s.right}>
          <img src={blobBR} alt="" style={s.blob} />
          <img src={pawsImg} alt="" style={s.paws1} />
          <img src={pawsImg} alt="" style={s.paws2} />
          <img src={dogImg} alt="Corgi" style={s.dog} />
        </div>

      </section>

      <Footer />
    </div>
  );
}

const s = {
  hero: {
    background: '#f5f8f5',
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    overflow: 'hidden',
    padding: '0 60px',
  },

  /* LEFT */
  left: {
    flex: '0 0 48%',
    zIndex: 2,
    paddingRight: 20,
  },
  title: {
    fontFamily: "'Fraunces', serif",
    fontSize: 48,
    fontWeight: 700,
    lineHeight: 1.15,
    color: '#111',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    lineHeight: 1.7,
    marginBottom: 40,
    maxWidth: 440,
  },
  btns: { display: 'flex', gap: 14 },
  btnPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '13px 26px',
    background: '#2d6a4f',
    color: '#fff',
    borderRadius: 50,
    fontSize: 15,
    fontWeight: 600,
    textDecoration: 'none',
  },
  btnOutline: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '13px 26px',
    background: 'transparent',
    color: '#111',
    border: '2px solid #bbb',
    borderRadius: 50,
    fontSize: 15,
    fontWeight: 600,
    textDecoration: 'none',
  },

  /* RIGHT — all visuals together */
  right: {
    flex: 1,
    position: 'relative',
    height: 580,
  },

  /* Group 48 blob — bottom right */
  blob: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: '85%',
    zIndex: 1,
    pointerEvents: 'none',
  },

  /* Paws — near the dog, left side of the dog */
  paws1: {
    position: 'absolute',
    bottom: '38%',
    left: '8%',
    width: 80,
    zIndex: 3,
    pointerEvents: 'none',
  },
  paws2: {
    position: 'absolute',
    bottom: '20%',
    left: '2%',
    width: 70,
    zIndex: 3,
    pointerEvents: 'none',
  },

  /* Dog on top of blob */
  dog: {
    position: 'absolute',
    bottom: 0,
    right: '2%',
    height: '95%',
    objectFit: 'contain',
    zIndex: 2,
    pointerEvents: 'none',
  },
};