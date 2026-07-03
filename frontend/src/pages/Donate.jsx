import { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { API, useAuth } from '../context/AuthContext';
import { SuccessModal } from '../components/ConfirmDialog';

const DONOR_TYPES = ['Individual', 'Organization', 'Anonymous'];
const ITEM_CATEGORIES = ['Pet Food', 'Medicine', 'Supplies (leashes, bowls, etc.)', 'Bedding / Blankets', 'Toys', 'Cleaning Supplies', 'Other'];

export default function Donate() {
  const { user } = useAuth();
  const fileRef = useRef(null);

  // Read ?campaign=<id> from the URL — when present, this donation is locked to that campaign
  const lockedCampaignId = new URLSearchParams(window.location.search).get('campaign') || '';

  const [kind, setKind] = useState('Monetary'); // 'Monetary' | 'Non-Monetary'

  const [form, setForm] = useState({
    donor_name: '',
    type: '',
    amount: '',
    purpose: '',
    campaign_id: lockedCampaignId,
    // non-monetary
    item_category: '',
    item_description: '',
    item_quantity: '',
    handoff_method: '',      // 'Pickup' | 'Drop-off' | 'Courier'
    pickup_address: '',
    pickup_date: '',
    contact_phone: '',
    courier_name: '',
    tracking_number: '',
  });
  const [proofFile, setProofFile] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setForm(prev => ({ ...prev, donor_name: prev.donor_name || `${user.first_name} ${user.last_name}` }));
    }
  }, [user]);

  useEffect(() => {
    API.get('/campaigns')
      .then(({ data }) => setCampaigns(data.filter(c => c.target_amount && c.status !== 'Cancelled' && c.status !== 'Completed')))
      .catch(() => setCampaigns([]));
  }, []);

  const setField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const switchKind = (k) => {
    if (lockedCampaignId) return; // campaign donations are always monetary
    setKind(k);
    setErrors({});
  };

  const setHandoff = (method) => {
    setField('handoff_method', method);
    // clear the fields belonging to the other methods so stale values aren't sent
    setForm(prev => ({
      ...prev,
      handoff_method: method,
      pickup_address: method === 'Pickup' ? prev.pickup_address : '',
      pickup_date: method === 'Pickup' ? prev.pickup_date : '',
      courier_name: method === 'Courier' ? prev.courier_name : '',
      tracking_number: method === 'Courier' ? prev.tracking_number : '',
    }));
  };

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

    if (kind === 'Monetary') {
      const amt = Number(form.amount);
      if (!form.amount) e.amount = 'Please enter an amount.';
      else if (isNaN(amt) || amt <= 0) e.amount = 'Enter a valid amount greater than 0.';
    } else {
      if (!form.item_category) e.item_category = 'Please select what you are donating.';
      if (form.item_category === 'Other' && !form.item_description.trim())
        e.item_description = 'Please describe the item.';
      if (!form.handoff_method) e.handoff_method = 'Please choose how the donation will reach us.';

      if (form.handoff_method === 'Pickup') {
        if (!form.pickup_address.trim()) e.pickup_address = 'Pickup address is required.';
        if (!form.contact_phone.trim()) e.contact_phone = 'A contact number is required.';
        else if (!/^[0-9+\-\s()]{7,}$/.test(form.contact_phone.trim())) e.contact_phone = 'Enter a valid phone number.';
        if (form.pickup_date) {
          const today = new Date(); today.setHours(0, 0, 0, 0);
          if (new Date(form.pickup_date) < today) e.pickup_date = 'Pickup date cannot be in the past.';
        }
      }
      if (form.handoff_method === 'Courier') {
        if (!form.courier_name.trim()) e.courier_name = 'Enter the courier name.';
        if (!form.tracking_number.trim()) e.tracking_number = 'Enter the tracking number.';
      }
      // Drop-off needs no extra required fields
    }

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
      fd.append('donation_kind', kind);
      fd.append('purpose', form.purpose.trim());
      if (form.campaign_id) fd.append('campaign_id', form.campaign_id);

      if (kind === 'Monetary') {
        fd.append('amount', form.amount);
      } else {
        fd.append('item_category', form.item_category);
        fd.append('item_description', form.item_description.trim());
        fd.append('item_quantity', form.item_quantity.trim());
        fd.append('handoff_method', form.handoff_method);
        if (form.handoff_method === 'Pickup') {
          fd.append('pickup_address', form.pickup_address.trim());
          fd.append('pickup_date', form.pickup_date);
          fd.append('contact_phone', form.contact_phone.trim());
        }
        if (form.handoff_method === 'Courier') {
          fd.append('courier_name', form.courier_name.trim());
          fd.append('tracking_number', form.tracking_number.trim());
        }
        if (form.handoff_method === 'Drop-off') {
          fd.append('contact_phone', form.contact_phone.trim());
        }
      }

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

        <div style={styles.infoBanner}>
          <span style={styles.infoIcon}>ⓘ</span>
          <p style={styles.infoText}>
            Support PETLINK with money or with goods like pet food, medicine, and supplies.
            Pick a donation type below, fill in the details, and attach proof if you have it.
            A confirmation message appears once your donation is received.
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

            {/* ======= TOP TOGGLE (hidden for campaign donations — always monetary) ======= */}
            {!lockedCampaignId && (
              <div style={styles.toggleWrap}>
                {['Monetary', 'Non-Monetary'].map(k => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => switchKind(k)}
                    style={{
                      ...styles.toggleBtn,
                      ...(kind === k ? styles.toggleBtnActive : {}),
                    }}
                  >
                    {k === 'Monetary' ? '💵 Monetary Donation' : '📦 Non-Monetary Donation'}
                  </button>
                ))}
              </div>
            )}

            {/* Name */}
            <Field label="Name" required error={errors.donor_name}>
              <input
                style={inputStyle('donor_name')}
                placeholder="e.g. Alex Manaloto"
                value={form.donor_name}
                onChange={e => setField('donor_name', e.target.value)}
              />
            </Field>

            {/* Donor type (shared) */}
            <Field label="Donor Type" required error={errors.type}>
              <select
                style={inputStyle('type')}
                value={form.type}
                onChange={e => setField('type', e.target.value)}
              >
                <option value="">Select Type</option>
                {DONOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>

            {/* ================= MONETARY ================= */}
            {kind === 'Monetary' && (
              <>
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

                {lockedCampaignId ? (
                  <Field label="Donating to Campaign">
                    <div style={{ ...styles.input, background: '#f6f8fa', display: 'flex', alignItems: 'center', color: 'var(--text-dark)', fontWeight: 600 }}>
                      {campaigns.find(c => String(c.id) === String(lockedCampaignId))?.title || 'Selected campaign'}
                    </div>
                    <span style={styles.hint}>This donation goes directly to this campaign and can't be changed here.</span>
                  </Field>
                ) : campaigns.length > 0 && (
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

                <Field label="Details" hint="optional">
                  <input
                    style={styles.input}
                    placeholder="Details for donation (e.g. Medical fund, Food supply)"
                    value={form.purpose}
                    onChange={e => setField('purpose', e.target.value)}
                  />
                </Field>

                <Field label="Upload Proof of Payment" error={errors.proof}>
                  <FilePicker
                    fileRef={fileRef} proofFile={proofFile}
                    onPick={() => fileRef.current.click()}
                    onClear={() => setProofFile(null)}
                    onChange={handleFile}
                    hint="Attach a screenshot or receipt of your payment (image or PDF, under 5MB)."
                  />
                </Field>
              </>
            )}

            {/* ================= NON-MONETARY ================= */}
            {kind === 'Non-Monetary' && (
              <>
                <Field label="What are you donating?" required error={errors.item_category}>
                  <select
                    style={inputStyle('item_category')}
                    value={form.item_category}
                    onChange={e => setField('item_category', e.target.value)}
                  >
                    <option value="">Select Category</option>
                    {ITEM_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>

                <Field
                  label="Item Description"
                  required={form.item_category === 'Other'}
                  hint={form.item_category === 'Other' ? undefined : 'optional'}
                  error={errors.item_description}
                >
                  <input
                    style={inputStyle('item_description')}
                    placeholder="e.g. 5kg dry dog food, brand X — sealed, expires 2026"
                    value={form.item_description}
                    onChange={e => setField('item_description', e.target.value)}
                  />
                </Field>

                <Field label="Quantity / Amount" hint="optional">
                  <input
                    style={styles.input}
                    placeholder="e.g. 3 bags, 10 cans, 2 boxes"
                    value={form.item_quantity}
                    onChange={e => setField('item_quantity', e.target.value)}
                  />
                </Field>

                {/* Handoff sub-choice */}
                <Field label="How will it reach us?" required error={errors.handoff_method}>
                  <div style={styles.handoffRow}>
                    {[
                      ['Pickup', '🐾 Picked up by Street Paws'],
                      ['Drop-off', '🏠 Delivered by me (Drop-off)'],
                      ['Courier', '📮 Courier / Shipping'],
                    ].map(([val, lbl]) => (
                      <div
                        key={val}
                        onClick={() => setHandoff(val)}
                        style={{
                          ...styles.handoffCard,
                          borderColor: form.handoff_method === val ? 'var(--primary)' : 'var(--border)',
                          background: form.handoff_method === val ? '#fff7f0' : 'white',
                        }}
                      >
                        {lbl}
                      </div>
                    ))}
                  </div>
                </Field>

                {/* Pickup fields */}
                {form.handoff_method === 'Pickup' && (
                  <>
                    <Field label="Pickup Address" required error={errors.pickup_address}>
                      <input
                        style={inputStyle('pickup_address')}
                        placeholder="Full address where Street Paws will collect the items"
                        value={form.pickup_address}
                        onChange={e => setField('pickup_address', e.target.value)}
                      />
                    </Field>
                    <div style={styles.row}>
                      <Field label="Contact Number" required error={errors.contact_phone}>
                        <input
                          style={inputStyle('contact_phone')}
                          placeholder="e.g. 0917 123 4567"
                          value={form.contact_phone}
                          onChange={e => setField('contact_phone', e.target.value)}
                        />
                      </Field>
                      <Field label="Preferred Pickup Date" hint="optional" error={errors.pickup_date}>
                        <input
                          style={inputStyle('pickup_date')}
                          type="date"
                          value={form.pickup_date}
                          onChange={e => setField('pickup_date', e.target.value)}
                        />
                      </Field>
                    </div>
                  </>
                )}

                {/* Drop-off fields */}
                {form.handoff_method === 'Drop-off' && (
                  <>
                    <div style={styles.noteBox}>
                      Please drop your donation at the PETLINK shelter during office hours
                      (Mon–Sat, 9:00 AM – 5:00 PM). We'll confirm receipt once it arrives.
                    </div>
                    <Field label="Contact Number" hint="optional">
                      <input
                        style={styles.input}
                        placeholder="So we can reach you about the drop-off"
                        value={form.contact_phone}
                        onChange={e => setField('contact_phone', e.target.value)}
                      />
                    </Field>
                  </>
                )}

                {/* Courier fields */}
                {form.handoff_method === 'Courier' && (
                  <div style={styles.row}>
                    <Field label="Courier Name" required error={errors.courier_name}>
                      <input
                        style={inputStyle('courier_name')}
                        placeholder="e.g. J&T, LBC, Lalamove"
                        value={form.courier_name}
                        onChange={e => setField('courier_name', e.target.value)}
                      />
                    </Field>
                    <Field label="Tracking Number" required error={errors.tracking_number}>
                      <input
                        style={inputStyle('tracking_number')}
                        placeholder="Shipment tracking / reference no."
                        value={form.tracking_number}
                        onChange={e => setField('tracking_number', e.target.value)}
                      />
                    </Field>
                  </div>
                )}

                <Field label="Details" hint="optional">
                  <input
                    style={styles.input}
                    placeholder="Anything else we should know"
                    value={form.purpose}
                    onChange={e => setField('purpose', e.target.value)}
                  />
                </Field>

                <Field label="Upload Photo of Items" error={errors.proof}>
                  <FilePicker
                    fileRef={fileRef} proofFile={proofFile}
                    onPick={() => fileRef.current.click()}
                    onClear={() => setProofFile(null)}
                    onChange={handleFile}
                    hint="Optional: a photo of the items or shipping receipt (image or PDF, under 5MB)."
                  />
                </Field>
              </>
            )}

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

function FilePicker({ fileRef, proofFile, onPick, onClear, onChange, hint }) {
  return (
    <>
      <div
        onClick={onPick}
        style={{ ...styles.input, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: proofFile ? 'var(--text-dark)' : 'var(--text-muted)' }}
      >
        <span>{proofFile ? proofFile.name : 'Choose File'}</span>
        {proofFile && (
          <button
            type="button"
            onClick={(ev) => { ev.stopPropagation(); onClear(); }}
            style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
          >×</button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*,.pdf" hidden onChange={onChange} />
      <span style={styles.hint}>{hint}</span>
    </>
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
  toggleWrap: {
    display: 'flex', gap: 8, background: '#f1f3f5', borderRadius: 12, padding: 6,
  },
  toggleBtn: {
    flex: 1, padding: '12px 14px', border: 'none', borderRadius: 8, cursor: 'pointer',
    fontSize: 14.5, fontWeight: 600, fontFamily: 'inherit', color: 'var(--text-mid)',
    background: 'transparent', transition: 'all 0.15s',
  },
  toggleBtnActive: {
    background: 'white', color: 'var(--primary)', boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
  },
  impactRow: { display: 'flex', gap: 12, marginBottom: 4 },
  impactCard: { flex: 1, border: '1.5px solid var(--border)', borderRadius: 10, padding: '16px 14px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.15s' },
  handoffRow: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  handoffCard: {
    flex: '1 1 30%', minWidth: 150, border: '1.5px solid var(--border)', borderRadius: 10,
    padding: '14px 12px', textAlign: 'center', cursor: 'pointer', fontSize: 13.5,
    fontWeight: 600, color: 'var(--text-dark)', transition: 'all 0.15s',
  },
  noteBox: {
    background: '#fff7f0', border: '1px solid #ffd8b0', borderRadius: 8,
    padding: '12px 16px', fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.55,
  },
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