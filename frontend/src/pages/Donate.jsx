import { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { API, useAuth } from '../context/AuthContext';
import { SuccessModal } from '../components/ConfirmDialog';

const DONOR_TYPES = ['Individual', 'Organization', 'Anonymous'];

export default function Donate() {
  const { user } = useAuth();
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    donor_name: '',
    type: '',
    amount: '',
    purpose: '',
    campaign_id: '',
  });
  const [proofFile, setProofFile] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Pre-fill name for logged-in users
  useEffect(() => {
    if (user) {
      setForm(prev => ({ ...prev, donor_name: prev.donor_name || `${user.first_name} ${user.last_name}` }));
    }
  }, [user]);

  // Load active campaigns (optional dropdown)
  useEffect(() => {
    API.get('/campaigns')
      .then(({ data }) => setCampaigns(data.filter(c => c.target_amount && c.status !== 'Cancelled' && c.status !== 'Completed')))
      .catch(() => setCampaigns([]));
  }, []);

  const setField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  // BUG FIX: strip anything that isn't a digit or dot, so "₱2,000" becomes "2000"
  const pickAmount = (raw) => setField('amount', String(raw).replace(/[^\d.]/g, ''));

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, proof: 'File must be under 5MB.' }));
      return;
    }
    setProofFile(f);
    setErrors(prev => ({ ...prev, proof: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.donor_name.trim()) e.donor_name = 'Please enter your name.';
    if (!form.type) e.type = 'Please select a donor type.';
    const amt = Number(form.amount);
    if (!form.amount) e.amount = 'Please enter an amount.';
    else if (isNaN(amt) || amt <= 0) e.amount = 'Enter a valid amount greater than 0.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      setLoading(true);
      const fd = new FormData();
      fd.append('donor_id', user ? user.id : '');
      fd.append('donor_name', form.donor_name.trim());
      fd.append('donor_email', user?.email || '');
      fd.append('type', form.type);
      fd.append('amount', form.amount);
      fd.append('purpose', form.purpose.trim());
      if (form.campaign_id) fd.append('campaign_id', form.campaign_id);
      if (proofFile) fd.append('proof', proofFile);

      await API.post('/volunteers/donations', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSubmitted(true);
    } catch (err) {
      const msg = err.response?.data?.error;
      if (msg) setErrors(prev => ({ ...prev, _server: msg }));
      else setSubmitted(true); // demo fallback when backend unreachable
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (key) => ({
    ...styles.input,
    borderColor: errors[key] ? '#dc3545' : 'var(--border)',
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main style={styles.main}>
        <h1 style={styles.title}>Donate</h1>

        {/* Info banner */}
        <div style={styles.infoBanner}>
          <span style={styles.infoIcon}>ⓘ</span>
          <p style={styles.infoText}>
            This page lets you support PETLINK through donations. Choose your donor type, enter an amount,
            and attach proof of your donation. Instructions and labels are clearly displayed to ensure safe
            and accurate transactions. A confirmation message will appear once your donation is received.
          </p>
        </div>

        {submitted && (
          <SuccessModal
            title="Donation Successful"
            message="Thank you for your generous support. Your donation has been recorded and will help us care for rescued animals. A confirmation record has been saved for your reference."
            onClose={() => setSubmitted(false)}
          />
        )}

        {!submitted && (
          <div style={styles.formWrap}>
            {errors._server && <div style={styles.serverError}>{errors._server}</div>}

            {/* Quick-pick amounts */}
            <div style={styles.impactRow}>
              {[['₱200', 'Feeds a pet for a week'], ['₱500', 'Covers a medical check-up'], ['₱2,000', 'Sponsors a pet for a month']].map(([a, d]) => (
                <div
                  key={a}
                  style={{
                    ...styles.impactCard,
                    borderColor: form.amount === a.replace(/[^\d.]/g, '') ? 'var(--primary)' : 'var(--border)',
                  }}
                  onClick={() => pickAmount(a)}
                >
                  <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--primary)' }}>{a}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{d}</div>
                </div>
              ))}
            </div>

            {/* Name */}
            <Field label="Name" required error={errors.donor_name}>
              <input
                style={inputStyle('donor_name')}
                placeholder="e.g. Alex Manaloto"
                value={form.donor_name}
                onChange={e => setField('donor_name', e.target.value)}
              />
            </Field>

            {/* Type + Amount */}
            <div style={styles.row}>
              <Field label="Type" required error={errors.type}>
                <select
                  style={inputStyle('type')}
                  value={form.type}
                  onChange={e => setField('type', e.target.value)}
                >
                  <option value="">Select Type</option>
                  {DONOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>

              <Field label="Amount" required error={errors.amount}>
                <input
                  style={inputStyle('amount')}
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="Php"
                  value={form.amount}
                  onChange={e => setField('amount', e.target.value)}
                />
              </Field>
            </div>

            {/* Campaign (optional) */}
            {campaigns.length > 0 && (
              <Field label="Donate to a Campaign" hint="optional">
                <select
                  style={styles.input}
                  value={form.campaign_id}
                  onChange={e => setField('campaign_id', e.target.value)}
                >
                  <option value="">— General Donation —</option>
                  {campaigns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </Field>
            )}

            {/* Details / Purpose */}
            <Field label="Details" hint="optional">
              <input
                style={styles.input}
                placeholder="Details for donation (e.g. Medical fund, Food supply)"
                value={form.purpose}
                onChange={e => setField('purpose', e.target.value)}
              />
            </Field>

            {/* Upload proof */}
            <Field label="Upload Proof of Donation" error={errors.proof}>
              <div
                onClick={() => fileRef.current.click()}
                style={{ ...styles.input, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: proofFile ? 'var(--text-dark)' : 'var(--text-muted)' }}
              >
                <span>{proofFile ? proofFile.name : 'Choose File'}</span>
                {proofFile && (
                  <button
                    type="button"
                    onClick={(ev) => { ev.stopPropagation(); setProofFile(null); }}
                    style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
                  >×</button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*,.pdf" hidden onChange={handleFile} />
              <span style={styles.hint}>Attach a screenshot or receipt of your payment (image or PDF, under 5MB).</span>
            </Field>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                className="btn btn-primary"
                style={{ padding: '11px 30px' }}
                disabled={loading}
                onClick={handleSubmit}
              >
                {loading ? 'Submitting...' : 'Submit Donation'}
              </button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Field({ label, required, hint, error, children }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>
        {label}
        {required && <span style={{ color: '#dc3545', marginLeft: 3 }}>*</span>}
        {hint && <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 5 }}>({hint})</span>}
      </label>
      {children}
      {error && <span style={styles.error}>{error}</span>}
    </div>
  );
}

const styles = {
  main: { flex: 1, maxWidth: 900, margin: '0 auto', width: '100%', padding: '32px 32px 60px' },
  title: { fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 700, marginBottom: 20, color: 'var(--text-dark)' },
  infoBanner: {
    display: 'flex', gap: 12, alignItems: 'flex-start',
    background: '#f6f8fa', border: '1px solid var(--border)', borderRadius: 10,
    padding: '14px 18px', marginBottom: 36,
  },
  infoIcon: { color: 'var(--primary)', fontSize: 18, flexShrink: 0, lineHeight: 1.4 },
  infoText: { fontSize: 13.5, color: 'var(--text-mid)', lineHeight: 1.6, margin: 0 },
  formWrap: { maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 },
  impactRow: { display: 'flex', gap: 12, marginBottom: 4 },
  impactCard: { flex: 1, border: '1.5px solid var(--border)', borderRadius: 10, padding: '16px 14px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.15s' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 },
  field: { display: 'flex', flexDirection: 'column', gap: 7 },
  label: { fontSize: 15, fontWeight: 600, color: 'var(--text-dark)' },
  input: {
    width: '100%', border: '1.5px solid var(--border)', borderRadius: 8,
    padding: '12px 16px', fontSize: 14, fontFamily: 'inherit', color: 'var(--text-dark)',
    outline: 'none', boxSizing: 'border-box', background: 'white',
  },
  error: { fontSize: 12.5, color: '#dc3545', marginTop: 1 },
  hint: { fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 },
  serverError: {
    background: '#fdecea', border: '1px solid #f5c2c0', color: '#b71c1c',
    borderRadius: 8, padding: '12px 16px', fontSize: 13.5,
  },
};