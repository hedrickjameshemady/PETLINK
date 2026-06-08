import { useState } from 'react';

import logo from '../assets/image 16.png';

export default function Footer() {
  const [email, setEmail] = useState('');

  return (
    <footer style={styles.footer}>
      <div style={styles.inner}>
        <div style={styles.col}>
          <div style={styles.label}>Contact</div>
          <p>Petlink@gmail.org</p>
          <p>+63 900 000 0000</p>
          <p>Naga City, PH</p>
        </div>
        <div style={styles.col}>
          <div style={styles.label}>Support</div>
          <p>Help Desk</p>
          <p>Privacy</p>
          <p>Terms</p>
        </div>
        <div style={styles.col}>
          <div style={styles.label}>Organization</div>
          <p>About Us</p>
          <p>Careers</p>
          <p>Blogs</p>
        </div>

        <div style={styles.center}>
  <img src={logo} alt="PetLink" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', marginBottom: 6 }} />
  <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: 16 }}>PETLINK</div>
  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>© 2024 PETLINK. All rights reserved.</div>
</div>

        <div style={styles.subscribe}>
          <div style={styles.label}>Stay up to date</div>
          <p style={{ fontSize: 12, marginBottom: 10, color: 'var(--text-muted)' }}>Get the latest news and updates delivered to your inbox.</p>
          <div style={styles.inputRow}>
            <input
              type="email"
              placeholder="Enter your Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={styles.emailInput}
            />
            <button style={styles.subBtn}>Subscribe</button>
          </div>
        </div>
      </div>
    </footer>
  );
}

const styles = {
  footer: {
    background: 'white',
    borderTop: '1px solid var(--border)',
    padding: '32px 0 24px',
    marginTop: 'auto',
  },
  inner: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '0 32px',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr',
    alignItems: 'start',
    gap: 32,
  },
  col: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontSize: 13,
    color: 'var(--text-mid)',
  },
  label: {
    fontWeight: 600,
    fontSize: 14,
    color: 'var(--text-dark)',
    marginBottom: 4,
  },
  center: {
    textAlign: 'center',
    color: 'var(--text-mid)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscribe: { maxWidth: 280 },
  inputRow: { display: 'flex', gap: 6 },
  emailInput: {
    flex: 1,
    padding: '9px 14px',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-full)',
    fontSize: 13,
    outline: 'none',
    fontFamily: 'inherit',
  },
  subBtn: {
    padding: '9px 18px',
    background: 'var(--primary)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius-full)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
};
