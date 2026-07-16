import { useState } from 'react';
import { API } from '../context/AuthContext';
import { fileUrl } from '../config';

// ─── Breeds commonly found in the Philippines, per pet type ───
const BREEDS_PH = {
  Dog: ['Aspin (Asong Pinoy)', 'Shih Tzu', 'Poodle', 'Chihuahua', 'Pomeranian', 'Labrador Retriever', 'Golden Retriever', 'German Shepherd', 'Siberian Husky', 'Beagle', 'Dachshund', 'Pug', 'American Bully', 'Rottweiler', 'Corgi', 'Dalmatian'],
  Cat: ['Puspin (Pusang Pinoy)', 'Persian', 'Siamese', 'British Shorthair', 'American Shorthair', 'Ragdoll', 'Bengal', 'Exotic Shorthair', 'Maine Coon', 'Scottish Fold'],
  Bird: ['Maya', 'Lovebird', 'Cockatiel', 'Budgerigar (Budgie)', 'Parakeet', 'Cockatoo', 'Dove', 'Pigeon', 'Myna'],
  Rabbit: ['Native Rabbit', 'Mini Lop', 'Holland Lop', 'Netherland Dwarf', 'Lionhead', 'Rex', 'Flemish Giant', 'Angora'],
  Other: [],
};

// ─── Species capability rules (neuter + vaccines) ───
const SPECIES_RULES = {
  Dog:    { canNeuter: true,  vaccines: ['Rabies', '5-in-1 (DHLPP)', '6-in-1', 'Bordetella (Kennel Cough)', 'Leptospirosis', 'Canine Influenza', 'Deworming'] },
  Cat:    { canNeuter: true,  vaccines: ['Rabies', '3-in-1 (FVRCP)', '4-in-1', 'Feline Leukemia (FeLV)', 'Feline Immunodeficiency (FIV)', 'Deworming'] },
  Rabbit: { canNeuter: true,  vaccines: ['Myxomatosis', 'RHDV (Rabbit Haemorrhagic Disease)', 'Pasteurella', 'Deworming'] },
  Bird:   { canNeuter: false, vaccines: ['Polyomavirus', "Pacheco's Disease", 'Avian Pox', 'Newcastle Disease', 'Deworming'] },
  Other:  { canNeuter: false, vaccines: ['Rabies', 'Deworming', 'Other (specify)'] },
};
const rulesFor = (type) => SPECIES_RULES[type] || SPECIES_RULES.Other;

// ─── Validation (same rulebook as the admin Add/Edit forms) ───
function validatePet(f) {
  const err = {};
  const today = new Date().toISOString().slice(0, 10);

  if (!f.name || !f.name.trim()) err.name = 'Pet name is required.';
  else if (f.name.trim().length < 2) err.name = 'Name must be at least 2 characters.';
  else if (!/^[A-Za-z0-9\s'.\-]+$/.test(f.name.trim())) err.name = 'Name can only contain letters, numbers, spaces, apostrophes, and hyphens.';

  if (!f.type) err.type = 'Please pick a species.';
  if (!f.breed || !f.breed.trim()) err.breed = 'Breed is required (pick one or type it in).';
  if (!f.gender) err.gender = 'Please pick a gender.';

  if (f.age_years === '' || f.age_years === null || f.age_years === undefined) {
    err.age_years = 'Age is required.';
  } else {
    const age = Number(f.age_years);
    if (Number.isNaN(age)) err.age_years = 'Age must be a number.';
    else if (age < 0) err.age_years = 'Age cannot be negative.';
    else if (age > 30) err.age_years = 'Age looks too high (max 30 years).';
  }

  if (f.weight !== '' && f.weight !== null && f.weight !== undefined) {
    const w = Number(f.weight);
    if (Number.isNaN(w)) err.weight = 'Weight must be a number.';
    else if (w <= 0) err.weight = 'Weight must be greater than 0.';
    else if (w > 200) err.weight = 'Weight looks too high (max 200 kg).';
    else if (!/^\d{1,3}(\.\d{1,2})?$/.test(String(f.weight))) err.weight = 'Use up to 2 decimal places (e.g. 4.75).';
  }

  if (f.intake_date && f.intake_date > today) err.intake_date = 'Intake date cannot be in the future.';

  if (f.neutered && rulesFor(f.type).canNeuter) {
    if (f.neutered_date && f.neutered_date > today) err.neutered_date = 'Neuter date cannot be in the future.';
  }

  if (f.vaccination_status) {
    const log = f.vaccine_log || [];
    if (log.length === 0) {
      err.vaccine_log = 'You ticked "Vaccinated" — please add at least one vaccine, or untick the box.';
    } else {
      const blank = log.some(v => !v.name || !v.name.trim());
      if (blank) err.vaccine_log = 'Every vaccine row needs a vaccine name selected.';
      const future = log.some(v => v.date && v.date > today);
      if (future) err.vaccine_log = 'Vaccine dates cannot be in the future.';
      const names = log.map(v => (v.name || '').trim().toLowerCase()).filter(Boolean);
      if (new Set(names).size !== names.length) err.vaccine_log = 'You added the same vaccine twice.';
    }
  }

  if (f.last_checkup_date && f.last_checkup_date > today) err.last_checkup_date = 'Checkup date cannot be in the future.';
  if (f.medical_notes && f.medical_notes.length > 500) err.medical_notes = 'Medical notes must be under 500 characters.';
  if (f.description && f.description.length > 1000) err.description = 'Description must be under 1000 characters.';

  return err;
}

// ─── Turn the form object into FormData the backend understands ───
function buildPetFormData(form) {
  const canNeuter = rulesFor(form.type).canNeuter;
  const fd = new FormData();

  Object.entries(form).forEach(([k, v]) => {
    if (k === 'traits' || k === 'vaccine_log') return;
    if (k === 'vaccination_status' || k === 'neutered') return;
    if (k === 'neutered_date') return;
    if (v === undefined || v === null) return;
    fd.append(k, v);
  });

  const isNeutered = canNeuter ? !!form.neutered : false;
  const isVaccinated = !!form.vaccination_status;

  fd.append('neutered', isNeutered ? 'true' : 'false');
  fd.append('vaccination_status', isVaccinated ? 'true' : 'false');
  fd.append('neutered_date', isNeutered ? (form.neutered_date || '') : '');
  fd.append('vaccine_log', isVaccinated ? JSON.stringify(form.vaccine_log || []) : '');

  return fd;
}

// Turn a raw pet row (from the API) into a clean form object.
function petToForm(pet) {
  let vaccineLog = [];
  try {
    const raw = pet.vaccine_log;
    if (raw) { const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw; vaccineLog = Array.isArray(parsed) ? parsed : []; }
  } catch { vaccineLog = []; }

  return {
    name: pet.name || '',
    type: pet.type || 'Dog',
    breed: pet.breed || '',
    age_years: pet.age_years ?? '',
    weight: pet.weight ?? '',
    color: pet.color || '',
    gender: pet.gender || 'Male',
    health_status: pet.health_status || 'Good',
    status: pet.status || 'Available',
    description: pet.description || '',
    intake_date: pet.intake_date ? String(pet.intake_date).slice(0, 10) : '',
    vet_name: pet.vet_name || '',
    clinic_name: pet.clinic_name || '',
    last_checkup_date: pet.last_checkup_date ? String(pet.last_checkup_date).slice(0, 10) : '',
    medical_notes: pet.medical_notes || '',
    vaccination_status: pet.vaccination_status === 1 || pet.vaccination_status === true,
    neutered: pet.neutered === 1 || pet.neutered === true,
    neutered_date: pet.neutered_date ? String(pet.neutered_date).slice(0, 10) : '',
    vaccine_log: vaccineLog,
  };
}

/**
 * A full-featured pet editor modal, identical to the admin's.
 *
 * Props:
 *   pet         – the pet row to edit (raw from the API)
 *   onClose()   – called when the user cancels or the X is clicked
 *   onSaved()   – called after a successful save (parent should refresh)
 *   lockStatusAdopted (optional) – if true, hide the "Adopted" option from Status
 */
export default function PetEditForm({ pet, onClose, onSaved, lockStatusAdopted = false }) {
  const [form, setForm] = useState(() => petToForm(pet));
  const [errors, setErrors] = useState({});
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const errStyle = (msg) => msg ? { borderColor: '#dc3545', background: '#fef2f2' } : {};
  const ErrMsg = ({ msg }) => msg ? (
    <div style={{ color: '#dc3545', fontSize: 12, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
      <span>⚠</span><span>{msg}</span>
    </div>
  ) : null;

  const showToast = (msg, err = false) => { setToast({ msg, err }); setTimeout(() => setToast(''), 3000); };

  const statusOptions = lockStatusAdopted
    ? ['Available', 'Pending', 'Not Available']
    : ['Available', 'Pending', 'Adopted', 'Not Available'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validatePet(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) { showToast('Please fix the highlighted fields.', true); return; }

    try {
      setSaving(true);
      const fd = buildPetFormData(form);
      if (photoFile) fd.append('photo', photoFile);
      await API.put(`/pets/${pet.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      showToast('Pet updated successfully!');
      onSaved && onSaved();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to update pet.', true);
    } finally { setSaving(false); }
  };

  const previewSrc = photoPreview || (pet.photo ? fileUrl(pet.photo) : null);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Edit {pet.name}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Photo upload */}
        <div
          onClick={() => document.getElementById('petEditPhotoInput').click()}
          style={{
            border: '2px dashed #cbd5e1', borderRadius: 12, padding: previewSrc ? 0 : '28px 16px',
            textAlign: 'center', cursor: 'pointer', marginBottom: 16, overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
            background: '#f8fafc', minHeight: previewSrc ? 0 : 120,
          }}
        >
          {previewSrc ? (
            <img src={previewSrc} alt="Preview" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }} />
          ) : (
            <>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 8 }}>
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#444', marginBottom: 4 }}>Change Pet Photo</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Click to upload</div>
            </>
          )}
        </div>
        <input
          id="petEditPhotoInput" type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { const file = e.target.files[0]; if (file) { setPhotoFile(file); setPhotoPreview(URL.createObjectURL(file)); } }}
        />

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Name + Species */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>Pet Name <span style={{ color: '#dc3545' }}>*</span></label>
              <input className="form-input" style={errStyle(errors.name)} value={form.name}
                onChange={e => { setForm({ ...form, name: e.target.value }); setErrors({ ...errors, name: '' }); }} />
              <ErrMsg msg={errors.name} />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>Species <span style={{ color: '#dc3545' }}>*</span></label>
              <select className="form-select" value={form.type}
                onChange={e => {
                  const newType = e.target.value;
                  setForm({
                    ...form, type: newType, breed: '',
                    neutered: rulesFor(newType).canNeuter ? form.neutered : false,
                    neutered_date: rulesFor(newType).canNeuter ? form.neutered_date : '',
                    vaccine_log: [], vaccination_status: false,
                  });
                  setErrors({});
                }}>
                {['Dog', 'Cat', 'Bird', 'Rabbit', 'Other'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Breed */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 700 }}>Breed <span style={{ color: '#dc3545' }}>*</span></label>
            <select className="form-select"
              value={(BREEDS_PH[form.type] || []).includes(form.breed) ? form.breed : '__other__'}
              onChange={e => { setForm({ ...form, breed: e.target.value === '__other__' ? '' : e.target.value }); setErrors({ ...errors, breed: '' }); }}>
              <option value="">Select a breed</option>
              {(BREEDS_PH[form.type] || []).map(b => <option key={b} value={b}>{b}</option>)}
              <option value="__other__">Other / Not listed — type it in</option>
            </select>
            {!(BREEDS_PH[form.type] || []).includes(form.breed) && (
              <input className="form-input" style={{ marginTop: 8, ...errStyle(errors.breed) }} placeholder="Type the breed"
                value={form.breed || ''} onChange={e => { setForm({ ...form, breed: e.target.value }); setErrors({ ...errors, breed: '' }); }} />
            )}
            <ErrMsg msg={errors.breed} />
          </div>

          {/* Age + Weight + Gender */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>Age <span style={{ color: '#dc3545' }}>*</span></label>
              <input className="form-input" type="number" min="0" max="30" step="1" placeholder="yrs" style={errStyle(errors.age_years)}
                value={form.age_years ?? ''} onChange={e => { setForm({ ...form, age_years: e.target.value }); setErrors({ ...errors, age_years: '' }); }} />
              <ErrMsg msg={errors.age_years} />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>Weight</label>
              <input className="form-input" type="number" min="0" max="200" step="0.01" placeholder="e.g. 4.75" style={errStyle(errors.weight)}
                value={form.weight ?? ''} onChange={e => { setForm({ ...form, weight: e.target.value }); setErrors({ ...errors, weight: '' }); }} />
              <ErrMsg msg={errors.weight} />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>Gender <span style={{ color: '#dc3545' }}>*</span></label>
              <select className="form-select" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                <option>Male</option><option>Female</option>
              </select>
            </div>
          </div>

          {/* Health + Status + Intake */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>Health Status</label>
              <select className="form-select" value={form.health_status} onChange={e => setForm({ ...form, health_status: e.target.value })}>
                {['Excellent', 'Good', 'Fair', 'Poor'].map(h => <option key={h}>{h}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>Status</label>
              <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {statusOptions.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>Intake Date</label>
              <input className="form-input" type="date" max={new Date().toISOString().slice(0, 10)} style={errStyle(errors.intake_date)}
                value={form.intake_date || ''} onChange={e => { setForm({ ...form, intake_date: e.target.value }); setErrors({ ...errors, intake_date: '' }); }} />
              <ErrMsg msg={errors.intake_date} />
            </div>
          </div>

          {/* Additional info */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 700 }}>Additional Information</label>
            <textarea className="form-textarea" placeholder="Tell us more about this pet" maxLength={1000}
              style={{ background: '#f0fdf4', minHeight: 90, ...errStyle(errors.description) }}
              value={form.description || ''} onChange={e => { setForm({ ...form, description: e.target.value }); setErrors({ ...errors, description: '' }); }} />
            <ErrMsg msg={errors.description} />
          </div>

          {/* Medical records */}
          <div style={{ borderTop: '1.5px solid #e5e7eb', paddingTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-dark)' }}>🏥 Medical Records</span>
              <span className="badge badge-gray" style={{ fontSize: 11 }}>Optional</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
              Leave everything blank if this {(form.type || '').toLowerCase()} hasn't been checked up yet.
            </div>

            {/* Neuter */}
            {rulesFor(form.type).canNeuter ? (
              <div style={{ marginBottom: 14, padding: 12, background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.neutered === true}
                    onChange={e => setForm({ ...form, neutered: e.target.checked, neutered_date: e.target.checked ? form.neutered_date : '' })} />
                  <span style={{ fontWeight: 700 }}>✂️ Neutered / Spayed</span>
                </label>
                {form.neutered === true && (
                  <div className="form-group" style={{ marginLeft: 24, marginTop: 10 }}>
                    <label className="form-label">Date of Neutering / Spaying <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span></label>
                    <input className="form-input" type="date" max={new Date().toISOString().slice(0, 10)}
                      style={{ maxWidth: 220, ...errStyle(errors.neutered_date) }}
                      value={form.neutered_date || ''} onChange={e => { setForm({ ...form, neutered_date: e.target.value }); setErrors({ ...errors, neutered_date: '' }); }} />
                    <ErrMsg msg={errors.neutered_date} />
                  </div>
                )}
              </div>
            ) : (
              <div style={{ marginBottom: 14, padding: '10px 12px', background: '#f1f5f9', borderRadius: 8, fontSize: 12.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>ℹ️</span>
                <span>Neutering / spaying is not tracked for <strong>{form.type}s</strong> — this section is hidden.</span>
              </div>
            )}

            {/* Vaccination */}
            <div style={{ marginBottom: 14, padding: 12, background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.vaccination_status === true}
                  onChange={e => setForm({
                    ...form, vaccination_status: e.target.checked,
                    vaccine_log: e.target.checked ? ((form.vaccine_log || []).length ? form.vaccine_log : [{ name: '', date: '' }]) : [],
                  })} />
                <span style={{ fontWeight: 700 }}>💉 Vaccinated</span>
              </label>

              {form.vaccination_status === true && (
                <div style={{ marginLeft: 24, marginTop: 10 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                    Vaccines available for <strong>{form.type}s</strong>:
                  </div>

                  {(form.vaccine_log || []).map((v, i) => {
                    const taken = (form.vaccine_log || []).filter((_, idx) => idx !== i).map(x => x.name);
                    const options = rulesFor(form.type).vaccines.includes(v.name) || !v.name
                      ? rulesFor(form.type).vaccines
                      : [...rulesFor(form.type).vaccines, v.name];
                    return (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                        <select className="form-select" value={v.name || ''}
                          onChange={e => { const log = [...form.vaccine_log]; log[i] = { ...log[i], name: e.target.value }; setForm({ ...form, vaccine_log: log }); setErrors({ ...errors, vaccine_log: '' }); }}
                          style={{ flex: 1, fontSize: 13 }}>
                          <option value="">— Select a vaccine —</option>
                          {options.map(name => (
                            <option key={name} value={name} disabled={taken.includes(name)}>
                              {name}{taken.includes(name) ? ' (already added)' : ''}
                            </option>
                          ))}
                        </select>
                        <input className="form-input" type="date" max={new Date().toISOString().slice(0, 10)}
                          value={v.date || ''}
                          onChange={e => { const log = [...form.vaccine_log]; log[i] = { ...log[i], date: e.target.value }; setForm({ ...form, vaccine_log: log }); setErrors({ ...errors, vaccine_log: '' }); }}
                          style={{ width: 155, fontSize: 13 }} />
                        <button type="button" title="Remove this vaccine"
                          onClick={() => setForm({ ...form, vaccine_log: form.vaccine_log.filter((_, idx) => idx !== i) })}
                          style={{ background: 'none', border: 'none', color: '#dc3545', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}>×</button>
                      </div>
                    );
                  })}

                  <ErrMsg msg={errors.vaccine_log} />

                  {(form.vaccine_log || []).length < rulesFor(form.type).vaccines.length && (
                    <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: 4 }}
                      onClick={() => setForm({ ...form, vaccine_log: [...(form.vaccine_log || []), { name: '', date: '' }] })}>+ Add Vaccine</button>
                  )}
                </div>
              )}
            </div>

            {/* Vet / clinic / checkup */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Veterinary Name</label>
                <input className="form-input" placeholder="e.g. Dr. Juan dela Cruz" value={form.vet_name || ''} onChange={e => setForm({ ...form, vet_name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Clinic Name</label>
                <input className="form-input" placeholder="e.g. PetCare Animal Clinic" value={form.clinic_name || ''} onChange={e => setForm({ ...form, clinic_name: e.target.value })} />
              </div>
            </div>
            <div className="form-group" style={{ marginTop: 4 }}>
              <label className="form-label" style={{ fontWeight: 700 }}>Last Checkup Date</label>
              <input className="form-input" type="date" max={new Date().toISOString().slice(0, 10)} style={errStyle(errors.last_checkup_date)}
                value={form.last_checkup_date || ''} onChange={e => { setForm({ ...form, last_checkup_date: e.target.value }); setErrors({ ...errors, last_checkup_date: '' }); }} />
              <ErrMsg msg={errors.last_checkup_date} />
            </div>
            <div className="form-group" style={{ marginTop: 4 }}>
              <label className="form-label" style={{ fontWeight: 700 }}>Medical Notes / Conditions</label>
              <textarea className="form-textarea" placeholder="e.g. No known conditions, previously treated for mange" maxLength={500}
                style={{ minHeight: 70, ...errStyle(errors.medical_notes) }}
                value={form.medical_notes || ''} onChange={e => { setForm({ ...form, medical_notes: e.target.value }); setErrors({ ...errors, medical_notes: '' }); }} />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right', marginTop: 2 }}>
                {(form.medical_notes || '').length}/500
              </div>
              <ErrMsg msg={errors.medical_notes} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1.5px solid #e5e7eb', paddingTop: 16, marginTop: 4 }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ minWidth: 150 }} disabled={saving}>
              {saving ? 'Saving…' : '💾 Save Changes'}
            </button>
          </div>
        </form>

        {toast && (
          <div style={{ position: 'fixed', bottom: 24, right: 24, background: toast.err ? '#dc3545' : '#52a872', color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 14, fontWeight: 500, zIndex: 9999 }}>
            {toast.msg}
          </div>
        )}
      </div>
    </div>
  );
}
