import { useState } from 'react';
import logo from '../assets/image 16.png';

export default function Footer() {
  const [email, setEmail] = useState('');

  return (
    <footer style={styles.footer}>
      <div style={styles.inner}>

        {/* LEFT: Contact, Support, Organization */}
        <div style={styles.leftCol}>
          <div style={styles.group}>
            <div style={styles.label}>Contact</div>
            <p>Petlink@gmail.org</p>
            <p>+63 900 000 0000</p>
            <p>Naga City, PH</p>
          </div>
          <div style={styles.group}>
            <div style={styles.label}>Support</div>
            <p>Help Desk</p>
            <p>Privacy</p>
            <p>Terms</p>
          </div>
          <div style={styles.group}>
            <div style={styles.label}>Organization</div>
            <p>About Us</p>
            <p>Careers</p>
            <p>Blogs</p>
          </div>
        </div>

        {/* CENTER: Logo + Name + Copyright */}
        <div style={styles.center}>
          <img
            src={logo}
            alt="PetLink"
            style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', marginBottom: 8 }}
          />
          <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 16, color: 'var(--text-dark)' }}>
            PETLINK
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            © 2026 PETLINK. All rights reserved.
          </div>
        </div>

        {/* RIGHT: Stay up to date */}
        <div style={styles.rightCol}>
          <div style={styles.label}>Stay up to date</div>
          <p style={{ fontSize: 12, marginBottom: 10, color: 'var(--text-muted)' }}>
            Get the latest news and updates delivered to your inbox.
          </p>
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
    gridTemplateColumns: '1fr 1fr 1fr',
    alignItems: 'center',
    gap: 32,
  },
  leftCol: {
    display: 'flex',
    flexDirection: 'row',
    gap: 32,
    fontSize: 13,
    color: 'var(--text-mid)',
  },
  group: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
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
  rightCol: {
    display: 'flex',
    flexDirection: 'column',
    maxWidth: 320,
    marginLeft: 'auto',
    fontSize: 13,
    color: 'var(--text-mid)',
  },
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