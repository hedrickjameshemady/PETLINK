import { useState, useEffect } from 'react';
import { API } from '../../context/AuthContext';
import { ConfirmModal } from '../../components/ConfirmDialog';
import { fileUrl } from '../../config';

// Breeds commonly found in the Philippines, per pet type
const BREEDS_PH = {
  Dog: ['Aspin (Asong Pinoy)', 'Shih Tzu', 'Poodle', 'Chihuahua', 'Pomeranian', 'Labrador Retriever', 'Golden Retriever', 'German Shepherd', 'Siberian Husky', 'Beagle', 'Dachshund', 'Pug', 'American Bully', 'Rottweiler', 'Corgi', 'Dalmatian'],
  Cat: ['Puspin (Pusang Pinoy)', 'Persian', 'Siamese', 'British Shorthair', 'American Shorthair', 'Ragdoll', 'Bengal', 'Exotic Shorthair', 'Maine Coon', 'Scottish Fold'],
  Bird: ['Maya', 'Lovebird', 'Cockatiel', 'Budgerigar (Budgie)', 'Parakeet', 'Cockatoo', 'Dove', 'Pigeon', 'Myna'],
  Rabbit: ['Native Rabbit', 'Mini Lop', 'Holland Lop', 'Netherland Dwarf', 'Lionhead', 'Rex', 'Flemish Giant', 'Angora'],
  Other: [],
};

// ─── SPECIES CAPABILITY RULES ───
// Not every animal can be neutered, and each species gets different vaccines.
// canNeuter: false  → we HIDE the neuter checkbox entirely for that species.
const SPECIES_RULES = {
  Dog:    { canNeuter: true,  vaccines: ['Rabies', '5-in-1 (DHLPP)', '6-in-1', 'Bordetella (Kennel Cough)', 'Leptospirosis', 'Canine Influenza', 'Deworming'] },
  Cat:    { canNeuter: true,  vaccines: ['Rabies', '3-in-1 (FVRCP)', '4-in-1', 'Feline Leukemia (FeLV)', 'Feline Immunodeficiency (FIV)', 'Deworming'] },
  Rabbit: { canNeuter: true,  vaccines: ['Myxomatosis', 'RHDV (Rabbit Haemorrhagic Disease)', 'Pasteurella', 'Deworming'] },
  // Birds are not neutered in normal shelter practice — hide the checkbox.
  Bird:   { canNeuter: false, vaccines: ['Polyomavirus', 'Pacheco\'s Disease', 'Avian Pox', 'Newcastle Disease', 'Deworming'] },
  Other:  { canNeuter: false, vaccines: ['Rabies', 'Deworming', 'Other (specify)'] },
};

// Safe getter — if someone adds a new species later this won't crash.
const rulesFor = (type) => SPECIES_RULES[type] || SPECIES_RULES.Other;

// Icons for the pet-type filter chips
const TYPE_ICONS = { All: '✨', Dog: '🐶', Cat: '🐱', Bird: '🐦', Rabbit: '🐰', Other: '🐾' };

import ApplicantGrading from '../../components/ApplicantGrading';

export default function PetsAndAdoptions() {
  const [pets, setPets] = useState([]);
  const [applications, setApplications] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showAddPet, setShowAddPet] = useState(false);
  const [showAssessment, setShowAssessment] = useState(false);
  const [editPet, setEditPet] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editPhotoFile, setEditPhotoFile] = useState(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState(null);
  const [viewApp, setViewApp] = useState(null);
  const [viewPet, setViewPet] = useState(null);
  const [viewProfile, setViewProfile] = useState(null);      // full applicant profile
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [adopted, setAdopted] = useState([]);                // adopted pets + adopter info
  const [monitorApp, setMonitorApp] = useState(null);        // adoption being monitored
  const [followups, setFollowups] = useState([]);
  const [followForm, setFollowForm] = useState({ followup_date: '', outcome: 'Doing Well', notes: '' });
  const [toast, setToast] = useState('');
  const [confirmState, setConfirmState] = useState(null);
  const [petForm, setPetForm] = useState({ name: '', type: 'Dog', breed: '', age_years: '', weight: '', gender: 'Male', health_status: 'Excellent', status: 'Available', description: '', intake_date: '', traits: [], vet_name: '', clinic_name: '', last_checkup_date: '', vaccines_given: '', medical_notes: '', vaccination_status: false, neutered: false, neutered_date: '', vaccine_log: [], fostered_by: '' });
  const [petPhotoFile, setPetPhotoFile] = useState(null);
  const [customBreed, setCustomBreed] = useState(false);
  const [petPhotoPreview, setPetPhotoPreview] = useState(null);
  const [assessForm, setAssessForm] = useState({ pet_id: '', traits: '', description: '', compatibility_notes: '' });
  const [petErrors, setPetErrors] = useState({});     // validation messages for ADD form
  const [editErrors, setEditErrors] = useState({});   // validation messages for EDIT form
  const [petTypeFilter, setPetTypeFilter] = useState('All'); // Dog / Cat / Bird / ...
  const [petSearch, setPetSearch] = useState('');
  const [petStatusFilter, setPetStatusFilter] = useState('All');
  const [fosters, setFosters] = useState([]);          // foster accounts for the dropdown
  const [gradingPet, setGradingPet] = useState(null);  // which pet's applicants we're grading

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      // No more fake fallback data. If the server is down, we SAY so —
      // showing invented pets would hide a real bug during a live demo.
      const [p, a, as, ad, fo] = await Promise.all([
        API.get('/pets/all'),
        API.get('/adoptions'),
        API.get('/pets/assessments'),
        API.get('/adoptions/adopted'),
        API.get('/auth/admin/fosters'),
      ]);
      setPets(p.data);
      setApplications(a.data);
      setAssessments(as.data);
      setAdopted(ad.data);
      setFosters(fo.data);
      setLoadError('');
    } catch (err) {
      setLoadError(
        err?.response?.data?.error
        || 'Could not reach the server. Make sure the backend is running (npm run dev in the backend folder).'
      );
    } finally { setLoading(false); }
  };

  const showToast = (msg, err = false) => {
    setToast({ msg, err });
    setTimeout(() => setToast(''), 3000);
  };

  // The blank starting form — kept in one place so Add + Reset always match.
  const EMPTY_PET = { name: '', type: 'Dog', breed: '', age_years: '', weight: '', gender: 'Male', health_status: 'Excellent', status: 'Available', description: '', intake_date: '', traits: [], vet_name: '', clinic_name: '', last_checkup_date: '', vaccines_given: '', medical_notes: '', vaccination_status: false, neutered: false, neutered_date: '', vaccine_log: [], fostered_by: '' };

  /**
   * Checks a pet form and returns an object of { fieldName: "error message" }.
   * If the object is EMPTY, the form is valid.
   * Medical records stay OPTIONAL — we only validate them IF the user filled them in.
   */
  const validatePet = (f) => {
    const err = {};
    const today = new Date().toISOString().slice(0, 10);

    // ── Required fields ──
    if (!f.name || !f.name.trim()) err.name = 'Pet name is required.';
    else if (f.name.trim().length < 2) err.name = 'Name must be at least 2 characters.';
    else if (!/^[A-Za-z0-9\s'.\-]+$/.test(f.name.trim())) err.name = 'Name can only contain letters, numbers, spaces, apostrophes, and hyphens.';

    if (!f.type) err.type = 'Please pick a species.';
    if (!f.breed || !f.breed.trim()) err.breed = 'Breed is required (pick one or type it in).';
    if (!f.gender) err.gender = 'Please pick a gender.';

    // ── Age: required, must be a sensible number ──
    if (f.age_years === '' || f.age_years === null || f.age_years === undefined) {
      err.age_years = 'Age is required.';
    } else {
      const age = Number(f.age_years);
      if (Number.isNaN(age)) err.age_years = 'Age must be a number.';
      else if (age < 0) err.age_years = 'Age cannot be negative.';
      else if (age > 30) err.age_years = 'Age looks too high (max 30 years).';
    }

    // ── Weight: OPTIONAL, but if given it must be a valid decimal ──
    if (f.weight !== '' && f.weight !== null && f.weight !== undefined) {
      const w = Number(f.weight);
      if (Number.isNaN(w)) err.weight = 'Weight must be a number.';
      else if (w <= 0) err.weight = 'Weight must be greater than 0.';
      else if (w > 200) err.weight = 'Weight looks too high (max 200 kg).';
      else if (!/^\d{1,3}(\.\d{1,2})?$/.test(String(f.weight))) err.weight = 'Use up to 2 decimal places (e.g. 4.75).';
    }

    // ── Intake date: OPTIONAL, but cannot be in the future ──
    if (f.intake_date && f.intake_date > today) err.intake_date = 'Intake date cannot be in the future.';

    // ═══ MEDICAL RECORDS — ALL OPTIONAL ═══
    // We ONLY complain if the admin ticked a box and then left the details blank.

    // Neuter date is only required IF they ticked "neutered"
    if (f.neutered && rulesFor(f.type).canNeuter) {
      if (f.neutered_date && f.neutered_date > today) err.neutered_date = 'Neuter date cannot be in the future.';
    }

    // Vaccines are only required IF they ticked "vaccinated"
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
  };

  /** Turns a pet form object into FormData the backend can read. */
  const buildPetFormData = (form) => {
    const canNeuter = rulesFor(form.type).canNeuter;
    const fd = new FormData();

    Object.entries(form).forEach(([k, v]) => {
      if (k === 'traits' || k === 'vaccine_log') return;    // handled below
      if (k === 'vaccination_status' || k === 'neutered') return; // handled below
      if (k === 'neutered_date') return;                     // handled below
      if (v === undefined || v === null) return;
      fd.append(k, v);
    });

    fd.append('traits', JSON.stringify(form.traits || []));

    // Booleans MUST be sent as the literal words "true"/"false".
    // The backend now checks for the word "true" — so "false" correctly becomes 0.
    const isNeutered = canNeuter ? !!form.neutered : false; // birds can never be neutered
    const isVaccinated = !!form.vaccination_status;

    fd.append('neutered', isNeutered ? 'true' : 'false');
    fd.append('vaccination_status', isVaccinated ? 'true' : 'false');
    fd.append('neutered_date', isNeutered ? (form.neutered_date || '') : '');
    fd.append('vaccine_log', isVaccinated ? JSON.stringify(form.vaccine_log || []) : '');

    return fd;
  };

  const handleAddPet = async (e) => {
    e.preventDefault();

    // 1. Check the form first. If bad, show the red messages and STOP.
    const errs = validatePet(petForm);
    setPetErrors(errs);
    if (Object.keys(errs).length > 0) {
      showToast('Please fix the highlighted fields.', true);
      return;
    }

    // 2. Send it.
    try {
      const formData = buildPetFormData(petForm);
      if (petPhotoFile) formData.append('photo', petPhotoFile);
      await API.post('/pets', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      showToast('Pet added successfully!');
      setShowAddPet(false);
      setPetForm(EMPTY_PET);
      setPetErrors({});
      setPetPhotoFile(null);
      setPetPhotoPreview(null);
      fetchAll();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to add pet.', true);
    }
  };

  const openProfile = async (userId) => {
    if (!userId) { showToast('No linked profile for this applicant'); return; }
    try {
      setLoadingProfile(true);
      const { data } = await API.get(`/auth/users/${userId}`);
      setViewProfile(data);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to load profile');
    } finally {
      setLoadingProfile(false);
    }
  };

  const openMonitor = async (row) => {
    setMonitorApp(row);
    setFollowForm({ followup_date: new Date().toISOString().slice(0, 10), outcome: 'Doing Well', notes: '' });
    try {
      const { data } = await API.get(`/adoptions/${row.application_id}/followups`);
      setFollowups(data);
    } catch { setFollowups([]); }
  };

  const submitFollowup = async () => {
    if (!followForm.followup_date) { showToast('Please pick a date', true); return; }
    try {
      await API.post(`/adoptions/${monitorApp.application_id}/followups`, followForm);
      const { data } = await API.get(`/adoptions/${monitorApp.application_id}/followups`);
      setFollowups(data);
      setFollowForm({ followup_date: new Date().toISOString().slice(0, 10), outcome: 'Doing Well', notes: '' });
      setAdopted(prev => prev.map(a => a.application_id === monitorApp.application_id
        ? { ...a, followup_count: (a.followup_count || 0) + 1, last_followup: followForm.followup_date }
        : a));
      showToast('Follow-up recorded');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save follow-up', true);
    }
  };

 const handleStatus = async (appId, status) => {
    const apply = async () => {
      try {
        await API.patch(`/adoptions/${appId}/status`, { status });
        setApplications(prev => prev.map(a => a.id === appId ? { ...a, status } : a));
        showToast(`Application ${status}`);
        if (status === 'Approved') fetchAll();
      } catch (err) {
        showToast(err?.response?.data?.error || `Failed to ${status.toLowerCase()} the application.`, true);
      }
    };

    if (status === 'Rejected') {
      setConfirmState({
        title: 'Are you sure about rejecting?',
        message: 'The applicant will be notified that their adoption application was not approved.',
        onConfirm: apply,
      });
      return;
    }
    apply();
  };

  const handleDeleteApp = (appId) => {
    setConfirmState({
      title: 'Are you sure about deleting?',
      message: 'This application will be permanently deleted. This cannot be undone.',
      onConfirm: async () => {
        try {
          await API.delete(`/adoptions/${appId}`);
          showToast('Application deleted.');
          fetchAll();
        } catch (err) {
          showToast(err?.response?.data?.error || 'Failed to delete application.', true);
        }
      },
    });
  };

  const handleEditPet = async (e) => {
    e.preventDefault();

    // Same rulebook as Add — one function, two forms. No more mismatch.
    const errs = validatePet(editForm);
    setEditErrors(errs);
    if (Object.keys(errs).length > 0) {
      showToast('Please fix the highlighted fields.', true);
      return;
    }

    try {
      const formData = buildPetFormData(editForm);
      if (editPhotoFile) formData.append('photo', editPhotoFile);
      await API.put(`/pets/${editPet.id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      showToast('Pet updated successfully!');
      setEditPet(null);
      setEditErrors({});
      setEditPhotoFile(null);
      setEditPhotoPreview(null);
      fetchAll();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to update pet.', true);
    }
  };

  const handleDeletePet = (pet) => {
    setConfirmState({
      title: 'Are you sure about deleting?',
      message: `${pet.name} will be permanently removed from the system. This cannot be undone.`,
      onConfirm: async () => {
        try {
          await API.delete(`/pets/${pet.id}`);
          showToast('Pet deleted.');
          fetchAll();
        } catch (err) {
          showToast(err?.response?.data?.error || 'Failed to delete pet.', true);
        }
      },
    });
  };

  const handleSaveAssessment = async (e) => {
    e.preventDefault();
    const traitsArray = assessForm.traits.split(',').map(t => t.trim()).filter(Boolean);
    try {
      await API.post(`/pets/${assessForm.pet_id}/assessment`, {
        traits: traitsArray,
        description: assessForm.description,
        compatibility_notes: assessForm.compatibility_notes,
      });
      showToast('Assessment saved!');
      fetchAll();
    // Only close and reset the form when the save actually WORKED.
      setShowAssessment(false);
      setAssessForm({ pet_id: '', traits: '', description: '', compatibility_notes: '' });
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to save assessment.', true);
    }
  };

  const statusBadge = (s) => {
    const map = { 'Available': 'green', 'Adopted': 'blue', 'Pending': 'yellow', 'Not Available': 'gray', 'Approved': 'green', 'Pending Review': 'yellow', 'Rejected': 'red', 'Cancelled': 'gray', 'Excellent': 'green', 'Good': 'blue', 'Fair': 'yellow', 'Poor': 'red' };
    return <span className={`badge badge-${map[s] || 'gray'}`}>{s}</span>;
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  if (loadError) return (
    <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
      <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Couldn't load pet records</h3>
      <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 18, lineHeight: 1.5 }}>
        {loadError}
      </p>
      <button className="btn btn-primary" onClick={fetchAll}>Try Again</button>
    </div>
  );

  // Base list: everything not yet adopted
  const allActivePets = pets.filter(p => p.status !== 'Adopted').sort((a, b) => (a.pet_id || '').localeCompare(b.pet_id || ''));

  // Now apply the admin's filter chips + search box
  const activePets = allActivePets.filter(p => {
    const okType = petTypeFilter === 'All' ? true : (p.type || 'Other') === petTypeFilter;
    const okStatus = petStatusFilter === 'All' ? true : p.status === petStatusFilter;
    const q = petSearch.trim().toLowerCase();
    const okSearch = !q ? true :
      (p.name || '').toLowerCase().includes(q) ||
      (p.breed || '').toLowerCase().includes(q) ||
      (p.pet_id || '').toLowerCase().includes(q);
    return okType && okStatus && okSearch;
  });

  // Count how many of each species we have, so the chips can show numbers like "Dog 4"
  const typeCounts = allActivePets.reduce((acc, p) => {
    const t = p.type || 'Other';
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});

  // Group the filtered pets by species so the table has clear section headers
  const TYPE_ORDER = ['Dog', 'Cat', 'Bird', 'Rabbit', 'Other'];
  const petGroups = TYPE_ORDER
    .map(t => ({ type: t, items: activePets.filter(p => (p.type || 'Other') === t) }))
    .filter(g => g.items.length > 0);
  const pendingApps = applications.filter(a => a.status === 'Pending Review');
  const finishedApps = applications.filter(a => a.status !== 'Pending Review');

  const petRow = (pet) => (
    <tr key={pet.id}>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {pet.photo ? (
            <img
              src={fileUrl(pet.photo)}
              alt={pet.name}
              style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1.5px solid var(--border)' }}
            />
          ) : (
            <div style={styles.petAvatar}>🐾</div>
          )}
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{pet.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID: {pet.pet_id}</div>
          </div>
        </div>
      </td>
      <td>{pet.type}</td>
      <td>{pet.breed}</td>
      <td>{pet.age_years ?? '—'} year{pet.age_years !== 1 ? 's' : ''} old</td>
      <td>{pet.weight ? `${Number(pet.weight)} kg` : '—'}</td>
      <td>{statusBadge(pet.health_status)}</td>
      <td>{statusBadge(pet.status)}</td>
      <td>
        {pet.foster_name
          ? <span className="badge badge-green">{pet.foster_name}</span>
          : <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>—</span>}
      </td>
      <td>
        <div style={{ display: 'flex', gap: 12 }}>
          <button style={styles.linkBtn} onClick={() => setViewPet(pet)}>View</button>
          <button style={{ ...styles.linkBtn, color: '#dc3545' }} onClick={() => handleDeletePet(pet)}>Delete</button>
        </div>
      </td>
    </tr>
  );

  // A small red line that appears under a field when it fails validation.
  const ErrMsg = ({ msg }) => msg ? (
    <div style={{ color: '#dc3545', fontSize: 12, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
      <span>⚠</span><span>{msg}</span>
    </div>
  ) : null;

  // Red border when a field is invalid
  const errStyle = (msg) => msg ? { borderColor: '#dc3545', background: '#fef2f2' } : {};

  const appRow = (app) => (
    <tr key={app.id}>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {app.applicant_photo ? (
            <img
              src={fileUrl(app.applicant_photo)}
              alt={app.applicant_name || 'Applicant'}
              style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1.5px solid var(--border)' }}
            />
          ) : (
            <div style={styles.avatarCircle}>{(app.full_name || app.applicant_name || app.name || 'U')[0]}</div>
          )}
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{app.full_name || app.applicant_name || app.name}</div>
            <div style={{ fontSize: 12, color: 'var(--primary)' }}>{app.email || app.applicant_email}</div>
          </div>
        </div>
      </td>
      <td style={{ fontWeight: 500 }}>{app.pet_name} ({app.pet_breed})</td>
      <td>{new Date(app.applied_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
      <td>{statusBadge(app.status)}</td>
      <td>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={styles.linkBtn} onClick={() => setViewApp(app)}>View</button>
          {app.status === 'Pending Review' && (
            <>
              <button style={{ ...styles.linkBtn, color: '#dc3545' }} onClick={() => handleStatus(app.id, 'Rejected')}>Reject</button>
              <button style={{ ...styles.linkBtn, color: '#198754' }} onClick={() => handleStatus(app.id, 'Approved')}>Approve</button>
            </>
          )}
          <button style={{ ...styles.linkBtn, color: '#dc3545' }} onClick={() => handleDeleteApp(app.id)}>Delete</button>
        </div>
      </td>
    </tr>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {toast && <div className={`toast${toast.err ? ' toast-error' : ''}`} style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}>{toast.msg}</div>}

      {confirmState && (
        <ConfirmModal
          title={confirmState.title}
          message={confirmState.message}
          onConfirm={() => { confirmState.onConfirm(); setConfirmState(null); }}
          onCancel={() => setConfirmState(null)}
        />
      )}

      {/* ─── PET RECORDS TABLE ─── */}
      <div className="card">
        <div style={styles.tableHeader}>
          <h2 style={styles.sectionTitle}>Pet Records Table</h2>
          <button className="btn btn-primary btn-sm" onClick={() => { setPetForm(EMPTY_PET); setPetErrors({}); setPetPhotoFile(null); setPetPhotoPreview(null); setCustomBreed(false); setShowAddPet(true); }}>+ Add New Pet</button>
        </div>

        {/* ─── FILTER BAR ─── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 16, paddingBottom: 14, borderBottom: '1.5px solid var(--border)' }}>

          {/* Species chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {['All', 'Dog', 'Cat', 'Bird', 'Rabbit', 'Other'].map(t => {
              const active = petTypeFilter === t;
              const count = t === 'All' ? allActivePets.length : (typeCounts[t] || 0);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setPetTypeFilter(t)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                    border: active ? '1.5px solid var(--primary)' : '1.5px solid #d1d5db',
                    background: active ? 'var(--primary)' : '#fff',
                    color: active ? '#fff' : '#555',
                    fontWeight: active ? 700 : 500,
                    transition: 'all 0.15s',
                  }}
                >
                  <span>{TYPE_ICONS[t]}</span>
                  <span>{t}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, minWidth: 18, textAlign: 'center',
                    padding: '1px 5px', borderRadius: 10,
                    background: active ? 'rgba(255,255,255,0.28)' : '#f1f5f9',
                    color: active ? '#fff' : '#64748b',
                  }}>{count}</span>
                </button>
              );
            })}
          </div>

          <div style={{ flex: 1 }} />

          {/* Status dropdown */}
          <select
            className="form-select"
            value={petStatusFilter}
            onChange={e => setPetStatusFilter(e.target.value)}
            style={{ maxWidth: 160, fontSize: 13, padding: '7px 10px' }}
          >
            <option value="All">All Statuses</option>
            <option value="Available">Available</option>
            <option value="Pending">Pending</option>
            <option value="Not Available">Not Available</option>
          </select>

          {/* Search box */}
          <input
            className="form-input"
            placeholder="🔍 Search name, breed, or ID…"
            value={petSearch}
            onChange={e => setPetSearch(e.target.value)}
            style={{ maxWidth: 220, fontSize: 13, padding: '7px 10px' }}
          />

          {(petTypeFilter !== 'All' || petStatusFilter !== 'All' || petSearch) && (
            <button
              type="button"
              onClick={() => { setPetTypeFilter('All'); setPetStatusFilter('All'); setPetSearch(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Result count */}
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 10 }}>
          Showing <strong style={{ color: 'var(--text-dark)' }}>{activePets.length}</strong> of {allActivePets.length} active pets
        </div>

        {/* ─── GROUPED TABLES (one section per species) ─── */}
        {activePets.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px 0' }}>
            <div className="empty-icon">🐾</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>No pets match your filters.</div>
          </div>
        ) : petGroups.map(group => (
          <div key={group.type} style={{ marginBottom: 22 }}>
            <div style={{ ...styles.subLabel, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>{TYPE_ICONS[group.type]}</span>
              <span>{group.type}s</span>
              <span className="badge badge-gray">{group.items.length}</span>
            </div>
            <div style={styles.scrollTable}>
              <table>
                <thead><tr><th>PET</th><th>TYPE</th><th>BREED</th><th>AGE</th><th>WEIGHT</th><th>HEALTH</th><th>STATUS</th><th>FOSTERED BY</th><th></th></tr></thead>
                <tbody>{group.items.map(petRow)}</tbody>
              </table>
            </div>
          </div>
        ))}
        <div style={{ ...styles.subLabel, marginTop: 24 }}>Adopted Pets — Post-Adoption Monitoring</div>
        <div style={styles.scrollTable}>
          <table>
            <thead><tr><th>PET</th><th>ADOPTER</th><th>ADOPTED ON</th><th>FOLLOW-UPS</th><th></th></tr></thead>
            <tbody>
              {adopted.length === 0
                ? <tr><td colSpan={5} style={styles.emptyCell}>No adopted pets yet.</td></tr>
                : adopted.map(row => (
                  <tr key={row.application_id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{row.pet_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{row.pet_breed} • {row.pet_code}</div>
                    </td>
                    <td>
                      <button style={{ ...styles.linkBtn, fontWeight: 600 }} onClick={() => openProfile(row.applicant_id)}>
                        {row.adopter_name}
                      </button>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{row.adopter_email}</div>
                    </td>
                    <td>{row.adopted_at ? new Date(row.adopted_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</td>
                    <td>
                      {row.followup_count > 0
                        ? <span className="badge badge-green">{row.followup_count} logged</span>
                        : <span className="badge badge-yellow">None yet</span>}
                      {row.last_followup && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Last: {new Date(row.last_followup).toLocaleDateString()}</div>}
                    </td>
                    <td>
                      <button style={styles.linkBtn} onClick={() => openMonitor(row)}>Monitor</button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── ADOPTION APPLICATIONS ─── */}
      <div className="card">
        <div style={styles.tableHeader}>
          <h2 style={styles.sectionTitle}>Adoption Applications</h2>
          <button className="btn btn-outline btn-sm">▾ Filter</button>
        </div>
        <div style={styles.subLabel}>Pending Applications</div>
        <div style={styles.scrollTable}>
          <table>
            <thead><tr><th>APPLICANT</th><th>PET</th><th>APPLIED DATE</th><th>STATUS</th><th></th></tr></thead>
            <tbody>
              {pendingApps.length === 0
                ? <tr><td colSpan={5} style={styles.emptyCell}>No pending applications.</td></tr>
                : pendingApps.map(appRow)}
            </tbody>
          </table>
        </div>
        <div style={{ ...styles.subLabel, marginTop: 24 }}>Finished Applications</div>
        <div style={styles.scrollTable}>
          <table>
            <thead><tr><th>APPLICANT</th><th>PET</th><th>APPLIED DATE</th><th>STATUS</th><th></th></tr></thead>
            <tbody>
              {finishedApps.length === 0
                ? <tr><td colSpan={5} style={styles.emptyCell}>No finished applications yet.</td></tr>
                : finishedApps.map(appRow)}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── BEHAVIORAL ASSESSMENT ─── */}
      <div className="card">
        <div style={styles.tableHeader}>
          <h2 style={styles.sectionTitle}>Behavioral Assessment</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline btn-sm">▾ Filter</button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAssessment(true)}>+ Create Analysis</button>
          </div>
        </div>
        {assessments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🐾</div>
            <h3>No assessments yet</h3>
            <p>Create a behavioral assessment for a pet to get started.</p>
          </div>
        ) : (
          <div style={styles.assessGrid}>
            {assessments.map((a, i) => {
              const traits = typeof a.traits === 'string' ? JSON.parse(a.traits) : (a.traits || []);
              return (
                <div key={i} style={styles.assessCard}>
                  <div style={styles.assessHeader}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{a.pet_name}{a.pet_breed ? ` — ${a.pet_breed}` : ''}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {a.created_at ? new Date(a.created_at).toLocaleDateString() : a.last_updated}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    {traits.map(t => {
                      const colors = { Friendly: 'green', Hyperattached: 'yellow', 'Good with kids': 'blue', Nonchalant: 'gray', Scared: 'red', 'Need training': 'yellow' };
                      return <span key={t} className={`badge badge-${colors[t] || 'gray'}`}>{t}</span>;
                    })}
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-mid)', marginBottom: 8, lineHeight: 1.5 }}>{a.description}</p>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Compatibility Analysis:</div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{a.compatibility_notes}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── ADD PET MODAL ─── */}
      {showAddPet && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAddPet(false)}>
          <div className="modal" style={{ maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>

            {/* Close button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
              <button onClick={() => setShowAddPet(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 }}>✕</button>
            </div>

            {/* Photo upload zone */}
            <div
              onClick={() => document.getElementById('petPhotoInput').click()}
              style={{
                border: '2px dashed #c7d2db', borderRadius: 12, padding: '28px 16px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', marginBottom: 24, minHeight: 160,
                background: petPhotoPreview ? 'transparent' : '#fafafa',
                overflow: 'hidden', position: 'relative',
              }}
            >
              {petPhotoPreview ? (
                <img src={petPhotoPreview} alt="preview" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8 }} />
              ) : (
                <>
                  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 10 }}>
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                    <circle cx="19.5" cy="8.5" r="1.2" fill="#555" stroke="none"/>
                    <line x1="12" y1="6" x2="15" y2="6" stroke="#555" strokeWidth="1.5"/>
                    <text x="13.5" y="6.6" fontSize="3" fill="#555" stroke="none">+</text>
                  </svg>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: '#222' }}>Add Pet Photo</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Click to upload</div>
                </>
              )}
            </div>
            <input
              id="petPhotoInput"
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files[0];
                if (file) {
                  setPetPhotoFile(file);
                  setPetPhotoPreview(URL.createObjectURL(file));
                }
              }}
            />

            <form onSubmit={handleAddPet} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Pet Name + Species */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Pet Name <span style={{ color: '#dc3545' }}>*</span></label>
                  <input
                    className="form-input"
                    style={errStyle(petErrors.name)}
                    value={petForm.name}
                    onChange={e => { setPetForm({ ...petForm, name: e.target.value }); setPetErrors({ ...petErrors, name: '' }); }}
                  />
                  <ErrMsg msg={petErrors.name} />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Species <span style={{ color: '#dc3545' }}>*</span></label>
                  <select
                    className="form-select"
                    value={petForm.type}
                    onChange={e => {
                      const newType = e.target.value;
                      setCustomBreed(false);
                      // Changing species RESETS the medical section — a bird's vaccines
                      // make no sense for a dog, and birds can't be neutered at all.
                      setPetForm({
                        ...petForm,
                        type: newType,
                        breed: '',
                        neutered: rulesFor(newType).canNeuter ? petForm.neutered : false,
                        neutered_date: rulesFor(newType).canNeuter ? petForm.neutered_date : '',
                        vaccine_log: [],
                        vaccination_status: false,
                      });
                      setPetErrors({});
                    }}
                  >
                    {['Dog','Cat','Bird','Rabbit','Other'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Breed */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Breed</label>
                <select
                  className="form-select"
                  value={customBreed ? '__other__' : petForm.breed}
                  onChange={e => {
                    if (e.target.value === '__other__') { setCustomBreed(true); setPetForm({ ...petForm, breed: '' }); }
                    else { setCustomBreed(false); setPetForm({ ...petForm, breed: e.target.value }); }
                  }}
                >
                  <option value="">Select a breed</option>
                  {(BREEDS_PH[petForm.type] || []).map(b => <option key={b} value={b}>{b}</option>)}
                  <option value="__other__">Other / Not listed — type it in</option>
                </select>
                {(customBreed || (BREEDS_PH[petForm.type] || []).length === 0) && (
                  <input
                    className="form-input"
                    style={{ marginTop: 8, ...errStyle(petErrors.breed) }}
                    placeholder="Type the breed"
                    value={petForm.breed}
                    onChange={e => { setPetForm({ ...petForm, breed: e.target.value }); setPetErrors({ ...petErrors, breed: '' }); }}
                  />
                )}
                <ErrMsg msg={petErrors.breed} />
              </div>

              {/* Age + Weight + Gender */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Age <span style={{ color: '#dc3545' }}>*</span></label>
                  <input
                    className="form-input"
                    type="number" min="0" max="30" step="1" placeholder="yrs"
                    style={errStyle(petErrors.age_years)}
                    value={petForm.age_years}
                    onChange={e => { setPetForm({ ...petForm, age_years: e.target.value }); setPetErrors({ ...petErrors, age_years: '' }); }}
                  />
                  <ErrMsg msg={petErrors.age_years} />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Weight</label>
                  {/* step="0.01" is what lets you type 4.75 instead of only whole numbers */}
                  <input
                    className="form-input"
                    type="number" min="0" max="200" step="0.01" placeholder="e.g. 4.75"
                    style={errStyle(petErrors.weight)}
                    value={petForm.weight}
                    onChange={e => { setPetForm({ ...petForm, weight: e.target.value }); setPetErrors({ ...petErrors, weight: '' }); }}
                  />
                  <ErrMsg msg={petErrors.weight} />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Gender <span style={{ color: '#dc3545' }}>*</span></label>
                  <select className="form-select" value={petForm.gender} onChange={e => setPetForm({ ...petForm, gender: e.target.value })}>
                    <option>Male</option><option>Female</option>
                  </select>
                </div>
              </div>

              {/* Personality Traits */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Personality Traits</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                  {['Playful','Friendly','Calm','Energetic','Sweet','Aloof','Hyperattached','Unloving'].map(trait => {
                    const selected = (petForm.traits || []).includes(trait);
                    return (
                      <button
                        key={trait}
                        type="button"
                        onClick={() => {
                          const current = petForm.traits || [];
                          setPetForm({ ...petForm, traits: selected ? current.filter(t => t !== trait) : [...current, trait] });
                        }}
                        style={{
                          padding: '7px 18px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                          border: selected ? '1.5px solid var(--primary)' : '1.5px solid #d1d5db',
                          background: selected ? '#f0fdf4' : '#fff5f5',
                          color: selected ? 'var(--primary)' : '#555',
                          fontWeight: selected ? 600 : 400,
                          transition: 'all 0.15s',
                        }}
                      >
                        {trait}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Health Status + Status + Intake Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Health Status</label>
                  <select className="form-select" value={petForm.health_status} onChange={e => setPetForm({ ...petForm, health_status: e.target.value })}>
                    {['Excellent','Good','Fair','Poor'].map(h => <option key={h}>{h}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Status</label>
                  <select className="form-select" value={petForm.status} onChange={e => setPetForm({ ...petForm, status: e.target.value })}>
                    {['Available','Not Available'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Fostered By</label>
                  <select className="form-select" value={petForm.fostered_by || ''} onChange={e => setPetForm({ ...petForm, fostered_by: e.target.value })}>
                    <option value="">— No foster assigned —</option>
                    {fosters.map(f => <option key={f.id} value={f.id}>{f.first_name} {f.last_name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Intake Date</label>
                  <input
                    className="form-input" type="date"
                    max={new Date().toISOString().slice(0, 10)}
                    style={errStyle(petErrors.intake_date)}
                    value={petForm.intake_date}
                    onChange={e => { setPetForm({ ...petForm, intake_date: e.target.value }); setPetErrors({ ...petErrors, intake_date: '' }); }}
                  />
                  <ErrMsg msg={petErrors.intake_date} />
                </div>
              </div>

              {/* Additional Information */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Additional Information</label>
                <textarea
                  className="form-textarea"
                  placeholder="Tells us more about its information"
                  value={petForm.description}
                  onChange={e => setPetForm({ ...petForm, description: e.target.value })}
                  style={{ background: '#f0fdf4', minHeight: 90 }}
                />
              </div>

              {/* ─── MEDICAL RECORDS (all optional, and species-aware) ─── */}
              <div style={{ borderTop: '1.5px solid #e5e7eb', paddingTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-dark)' }}>🏥 Medical Records</span>
                  <span className="badge badge-gray" style={{ fontSize: 11 }}>Optional</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
                  Leave everything blank if this {petForm.type.toLowerCase()} hasn't been checked up yet.
                </div>

                {/* NEUTER — only shown for species that CAN be neutered.
                    For Birds/Other the whole checkbox disappears. */}
                {rulesFor(petForm.type).canNeuter ? (
                  <div style={{ marginBottom: 14, padding: 12, background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={petForm.neutered === true}
                        onChange={e => setPetForm({ ...petForm, neutered: e.target.checked, neutered_date: e.target.checked ? petForm.neutered_date : '' })}
                      />
                      <span style={{ fontWeight: 700 }}>✂️ Neutered / Spayed</span>
                    </label>
                    {petForm.neutered === true && (
                      <div className="form-group" style={{ marginLeft: 24, marginTop: 10 }}>
                        <label className="form-label">Date of Neutering / Spaying <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span></label>
                        <input
                          className="form-input" type="date"
                          max={new Date().toISOString().slice(0, 10)}
                          style={{ maxWidth: 220, ...errStyle(petErrors.neutered_date) }}
                          value={petForm.neutered_date}
                          onChange={e => { setPetForm({ ...petForm, neutered_date: e.target.value }); setPetErrors({ ...petErrors, neutered_date: '' }); }}
                        />
                        <ErrMsg msg={petErrors.neutered_date} />
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ marginBottom: 14, padding: '10px 12px', background: '#f1f5f9', borderRadius: 8, fontSize: 12.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>ℹ️</span>
                    <span>Neutering / spaying is not tracked for <strong>{petForm.type}s</strong> — this section is hidden.</span>
                  </div>
                )}

                {/* VACCINATION — the vaccine names are now a DROPDOWN,
                    and the list changes depending on the species. */}
                <div style={{ marginBottom: 14, padding: 12, background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={petForm.vaccination_status === true}
                      onChange={e => setPetForm({
                        ...petForm,
                        vaccination_status: e.target.checked,
                        // Ticking it gives you one blank row to fill in. Unticking wipes the list.
                        vaccine_log: e.target.checked ? [{ name: '', date: '' }] : [],
                      })}
                    />
                    <span style={{ fontWeight: 700 }}>💉 Vaccinated</span>
                  </label>

                  {petForm.vaccination_status === true && (
                    <div style={{ marginLeft: 24, marginTop: 10 }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                        Vaccines available for <strong>{petForm.type}s</strong>:
                      </div>

                      {(petForm.vaccine_log || []).map((v, i) => {
                        // Vaccines already picked in OTHER rows — so you can't add Rabies twice.
                        const taken = (petForm.vaccine_log || []).filter((_, idx) => idx !== i).map(x => x.name);
                        return (
                          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                            <select
                              className="form-select"
                              value={v.name}
                              onChange={e => {
                                const log = [...petForm.vaccine_log];
                                log[i] = { ...log[i], name: e.target.value };
                                setPetForm({ ...petForm, vaccine_log: log });
                                setPetErrors({ ...petErrors, vaccine_log: '' });
                              }}
                              style={{ flex: 1, fontSize: 13 }}
                            >
                              <option value="">— Select a vaccine —</option>
                              {rulesFor(petForm.type).vaccines.map(name => (
                                <option key={name} value={name} disabled={taken.includes(name)}>
                                  {name}{taken.includes(name) ? ' (already added)' : ''}
                                </option>
                              ))}
                            </select>
                            <input
                              className="form-input" type="date"
                              max={new Date().toISOString().slice(0, 10)}
                              value={v.date || ''}
                              onChange={e => {
                                const log = [...petForm.vaccine_log];
                                log[i] = { ...log[i], date: e.target.value };
                                setPetForm({ ...petForm, vaccine_log: log });
                                setPetErrors({ ...petErrors, vaccine_log: '' });
                              }}
                              style={{ width: 155, fontSize: 13 }}
                            />
                            <button
                              type="button"
                              title="Remove this vaccine"
                              onClick={() => setPetForm({ ...petForm, vaccine_log: petForm.vaccine_log.filter((_, idx) => idx !== i) })}
                              style={{ background: 'none', border: 'none', color: '#dc3545', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}
                            >×</button>
                          </div>
                        );
                      })}

                      <ErrMsg msg={petErrors.vaccine_log} />

                      {/* Hide "+ Add Vaccine" once every vaccine for this species is used up */}
                      {(petForm.vaccine_log || []).length < rulesFor(petForm.type).vaccines.length && (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ marginTop: 4 }}
                          onClick={() => setPetForm({ ...petForm, vaccine_log: [...(petForm.vaccine_log || []), { name: '', date: '' }] })}
                        >+ Add Vaccine</button>
                      )}
                    </div>
                  )}
                </div>

                {/* Checkup / vet — kept for EVERY species, even birds */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>Veterinary Name</label>
                    <input className="form-input" placeholder="e.g. Dr. Juan dela Cruz" value={petForm.vet_name} onChange={e => setPetForm({ ...petForm, vet_name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>Clinic Name</label>
                    <input className="form-input" placeholder="e.g. PetCare Animal Clinic" value={petForm.clinic_name} onChange={e => setPetForm({ ...petForm, clinic_name: e.target.value })} />
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: 4 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>Last Checkup Date</label>
                  <input
                    className="form-input" type="date"
                    max={new Date().toISOString().slice(0, 10)}
                    style={errStyle(petErrors.last_checkup_date)}
                    value={petForm.last_checkup_date}
                    onChange={e => { setPetForm({ ...petForm, last_checkup_date: e.target.value }); setPetErrors({ ...petErrors, last_checkup_date: '' }); }}
                  />
                  <ErrMsg msg={petErrors.last_checkup_date} />
                </div>
                <div className="form-group" style={{ marginTop: 4 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>Medical Notes / Conditions</label>
                  <textarea
                    className="form-textarea"
                    placeholder="e.g. No known conditions, previously treated for mange"
                    maxLength={500}
                    style={{ minHeight: 70, ...errStyle(petErrors.medical_notes) }}
                    value={petForm.medical_notes}
                    onChange={e => { setPetForm({ ...petForm, medical_notes: e.target.value }); setPetErrors({ ...petErrors, medical_notes: '' }); }}
                  />
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right', marginTop: 2 }}>
                    {(petForm.medical_notes || '').length}/500
                  </div>
                  <ErrMsg msg={petErrors.medical_notes} />
                </div>
              </div>

              {/* ─── FOOTER BUTTONS (matches the Edit modal now) ─── */}
              <div style={{
                display: 'flex', gap: 10, justifyContent: 'flex-end',
                borderTop: '1.5px solid #e5e7eb', paddingTop: 16, marginTop: 4,
              }}>
                <button type="button" className="btn btn-outline" onClick={() => { setShowAddPet(false); setPetErrors({}); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ minWidth: 150 }}>
                  🐾 Add Pet
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
      {/* ─── VIEW PET MODAL ─── */}
      {viewPet && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewPet(null)}>
          <div className="modal" style={{ maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2 className="modal-title">Pet Details</h2>
              <button className="modal-close" onClick={() => setViewPet(null)}>✕</button>
            </div>

            {/* Photo */}
            <div style={{ width: '100%', height: 200, borderRadius: 12, overflow: 'hidden', marginBottom: 20, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {viewPet.photo
                ? <img src={fileUrl(viewPet.photo)} alt={viewPet.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 48 }}>🐾</span>
              }
            </div>

            {/* Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
              <div style={styles.detailRow}><span style={styles.detailLbl}>Pet ID</span><span>{viewPet.pet_id}</span></div>
              <div style={styles.detailRow}><span style={styles.detailLbl}>Name</span><span style={{ fontWeight: 600 }}>{viewPet.name}</span></div>
              <div style={styles.detailRow}><span style={styles.detailLbl}>Type</span><span>{viewPet.type}</span></div>
              <div style={styles.detailRow}><span style={styles.detailLbl}>Breed</span><span>{viewPet.breed}</span></div>
              <div style={styles.detailRow}><span style={styles.detailLbl}>Age</span><span>{viewPet.age_years} year{viewPet.age_years !== 1 ? 's' : ''} old</span></div>
              <div style={styles.detailRow}><span style={styles.detailLbl}>Gender</span><span>{viewPet.gender}</span></div>
              {viewPet.weight && <div style={styles.detailRow}><span style={styles.detailLbl}>Weight</span><span>{viewPet.weight} kg</span></div>}
              {viewPet.color && <div style={styles.detailRow}><span style={styles.detailLbl}>Color</span><span>{viewPet.color}</span></div>}
              <div style={styles.detailRow}><span style={styles.detailLbl}>Health Status</span>{statusBadge(viewPet.health_status)}</div>
              <div style={styles.detailRow}><span style={styles.detailLbl}>Status</span>{statusBadge(viewPet.status)}</div>
              {viewPet.intake_date && <div style={styles.detailRow}><span style={styles.detailLbl}>Intake Date</span><span>{new Date(viewPet.intake_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</span></div>}
              {viewPet.description && <div style={styles.detailRow}><span style={styles.detailLbl}>Description</span><span style={{ lineHeight: 1.6 }}>{viewPet.description}</span></div>}

              {/* Medical Records */}
              <div style={{ borderTop: '1.5px solid #e5e7eb', paddingTop: 14, marginTop: 4 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-dark)', marginBottom: 10 }}>🏥 Medical Records</div>

                {!viewPet.neutered && !viewPet.vaccination_status && !viewPet.vet_name && !viewPet.clinic_name && !viewPet.last_checkup_date && !viewPet.medical_notes && (() => {
                  let log = []; try { log = viewPet.vaccine_log ? (typeof viewPet.vaccine_log === 'string' ? JSON.parse(viewPet.vaccine_log) : viewPet.vaccine_log) : []; } catch {}
                  return log.length === 0;
                })() ? (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>No medical records yet.</div>
                ) : (
                  <>
                    {/* Neutered status — hidden for species that can't be neutered */}
                    {rulesFor(viewPet.type).canNeuter && (
                      <div style={styles.detailRow}>
                        <span style={styles.detailLbl}>Neutered / Spayed</span>
                        {viewPet.neutered ? (
                          <span>
                            <span className="badge badge-blue">✂️ Yes</span>
                            {viewPet.neutered_date && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>{new Date(viewPet.neutered_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</span>}
                          </span>
                        ) : (
                          <span className="badge badge-gray">Not Neutered</span>
                        )}
                      </div>
                    )}

                    {/* Vaccination status + log */}
                    <div style={styles.detailRow}>
                      <span style={styles.detailLbl}>Vaccinated</span>
                      {viewPet.vaccination_status ? (
                        <span className="badge badge-green">💉 Yes</span>
                      ) : (
                        <span className="badge badge-gray">Not Vaccinated</span>
                      )}
                    </div>
                    {viewPet.vaccination_status && (() => {
                      let log = []; try { log = viewPet.vaccine_log ? (typeof viewPet.vaccine_log === 'string' ? JSON.parse(viewPet.vaccine_log) : viewPet.vaccine_log) : []; } catch {}
                      return log.length > 0 ? (
                        <div style={{ marginBottom: 10, marginLeft: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Vaccination Log</div>
                          {log.map((v, i) => (
                            <div key={i} style={{ display: 'flex', gap: 12, fontSize: 13, paddingBottom: 4, borderBottom: '1px solid #f3f4f6', marginBottom: 4 }}>
                              <span style={{ fontWeight: 500, flex: 1 }}>{v.name}</span>
                              <span style={{ color: 'var(--text-muted)' }}>{v.date ? new Date(v.date).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</span>
                            </div>
                          ))}
                        </div>
                      ) : null;
                    })()}

                    {viewPet.vet_name && <div style={styles.detailRow}><span style={styles.detailLbl}>Veterinarian</span><span>{viewPet.vet_name}</span></div>}
                    {viewPet.clinic_name && <div style={styles.detailRow}><span style={styles.detailLbl}>Clinic</span><span>{viewPet.clinic_name}</span></div>}
                    {viewPet.last_checkup_date && <div style={styles.detailRow}><span style={styles.detailLbl}>Last Checkup</span><span>{new Date(viewPet.last_checkup_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</span></div>}
                    {viewPet.medical_notes && <div style={styles.detailRow}><span style={styles.detailLbl}>Medical Notes</span><span style={{ lineHeight: 1.6 }}>{viewPet.medical_notes}</span></div>}
                  </>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline btn-sm" onClick={() => {
                setViewPet(null);
                setEditPet(viewPet);
                setEditErrors({});
                // Pull EVERY field the Add form has, so the two forms look the same.
                setEditForm({
                  name: viewPet.name || '',
                  type: viewPet.type || 'Dog',
                  breed: viewPet.breed || '',
                  age_years: viewPet.age_years ?? '',
                  weight: viewPet.weight ?? '',
                  color: viewPet.color || '',
                  intake_date: viewPet.intake_date ? String(viewPet.intake_date).slice(0, 10) : '',
                  gender: viewPet.gender || 'Male',
                  health_status: viewPet.health_status || 'Good',
                  status: viewPet.status || 'Available',
                  fostered_by: viewPet.fostered_by ?? '',
                  description: viewPet.description || '',
                  vet_name: viewPet.vet_name || '',
                  clinic_name: viewPet.clinic_name || '',
                  last_checkup_date: viewPet.last_checkup_date ? String(viewPet.last_checkup_date).slice(0, 10) : '',
                  vaccines_given: viewPet.vaccines_given || '',
                  medical_notes: viewPet.medical_notes || '',
                  vaccination_status: viewPet.vaccination_status === 1 || viewPet.vaccination_status === true,
                  neutered: viewPet.neutered === 1 || viewPet.neutered === true,
                  neutered_date: viewPet.neutered_date ? String(viewPet.neutered_date).slice(0, 10) : '',
                  vaccine_log: (() => {
                    try {
                      const raw = viewPet.vaccine_log;
                      if (!raw) return [];
                      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                      return Array.isArray(parsed) ? parsed : [];
                    } catch { return []; }
                  })(),
                });
                setEditPhotoFile(null);
                setEditPhotoPreview(null);
              }}>Edit</button>
              <button className="btn btn-outline btn-sm" onClick={() => setViewPet(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
      {/* ─── GRADE APPLICANTS MODAL (star comparison) ─── */}
      {gradingPet && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setGradingPet(null)}>
          <div className="modal" style={{ maxWidth: 900, width: '92%' }}>
            <div className="modal-header">
              <h2 className="modal-title">Grade Applicants — {gradingPet.name}</h2>
              <button className="modal-close" onClick={() => setGradingPet(null)}>✕</button>
            </div>
            <ApplicantGrading petId={gradingPet.id} petName={gradingPet.name} />
          </div>
        </div>
      )}

      {/* ─── VIEW APPLICATION MODAL ─── */}
      {viewApp && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewApp(null)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Application Details</h2>
              <button className="modal-close" onClick={() => setViewApp(null)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
              {/* Applicant header with photo + link to full profile */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 12, borderBottom: '1px solid #f0f0f0' }}>
                <img
                  src={viewApp.applicant_photo
                    ? fileUrl(viewApp.applicant_photo)
                    : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(viewApp.applicant_name || viewApp.full_name || 'User') + '&background=e5e7eb&color=374151'}
                  alt="Applicant"
                  style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{viewApp.full_name || viewApp.applicant_name || viewApp.name}</div>
                  <button
                    onClick={() => openProfile(viewApp.applicant_id)}
                    disabled={loadingProfile}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 13, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                  >
                    {loadingProfile ? 'Loading…' : 'View Full Profile'}
                  </button>
                </div>
              </div>
              <div style={styles.detailRow}><span style={styles.detailLbl}>Email</span><span>{viewApp.email || viewApp.applicant_email}</span></div>
              {viewApp.phone && <div style={styles.detailRow}><span style={styles.detailLbl}>Phone</span><span>{viewApp.phone}</span></div>}
              {viewApp.address && <div style={styles.detailRow}><span style={styles.detailLbl}>Address</span><span>{viewApp.address}</span></div>}
              {viewApp.preferred_contact && <div style={styles.detailRow}><span style={styles.detailLbl}>Preferred Contact</span><span>{viewApp.preferred_contact}</span></div>}
              <div style={styles.detailRow}><span style={styles.detailLbl}>Pet</span><span>{viewApp.pet_name} ({viewApp.pet_breed})</span></div>
              <div style={styles.detailRow}><span style={styles.detailLbl}>Applied</span><span>{new Date(viewApp.applied_at).toLocaleDateString()}</span></div>
              <div style={styles.detailRow}><span style={styles.detailLbl}>Status</span>{statusBadge(viewApp.status)}</div>
              {viewApp.living_situation && <div style={styles.detailRow}><span style={styles.detailLbl}>Living Situation</span><span>{viewApp.living_situation}</span></div>}
              {viewApp.reason_for_adoption && <div style={styles.detailRow}><span style={styles.detailLbl}>Reason</span><span>{viewApp.reason_for_adoption}</span></div>}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => { setGradingPet({ id: viewApp.pet_id, name: viewApp.pet_name }); setViewApp(null); }}
              >⭐ Grade All Applicants</button>
              {viewApp.status === 'Pending Review' && (
                <>
                  <button className="btn btn-danger btn-sm" onClick={() => { handleStatus(viewApp.id, 'Rejected'); setViewApp(null); }}>Reject</button>
                  <button className="btn btn-success btn-sm" onClick={() => { handleStatus(viewApp.id, 'Approved'); setViewApp(null); }}>Approve</button>
                </>
              )}
              <button className="btn btn-outline btn-sm" onClick={() => setViewApp(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── APPLICANT PROFILE MODAL (read-only, admin vetting) ─── */}
      {viewProfile && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewProfile(null)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Applicant Profile</h2>
              <button className="modal-close" onClick={() => setViewProfile(null)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 14, borderBottom: '1px solid #f0f0f0' }}>
                <img
                  src={viewProfile.profile_photo
                    ? fileUrl(viewProfile.profile_photo)
                    : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(`${viewProfile.first_name} ${viewProfile.last_name}`) + '&background=e5e7eb&color=374151&size=200'}
                  alt="Applicant"
                  style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{viewProfile.first_name} {viewProfile.last_name}</div>
                  <span className="badge badge-blue" style={{ textTransform: 'capitalize', marginTop: 4, display: 'inline-block' }}>{viewProfile.role}</span>
                </div>
              </div>
              <div style={styles.detailRow}><span style={styles.detailLbl}>Email</span><span>{viewProfile.email}</span></div>
              {viewProfile.phone && <div style={styles.detailRow}><span style={styles.detailLbl}>Phone</span><span>{viewProfile.phone}</span></div>}
              {viewProfile.address && <div style={styles.detailRow}><span style={styles.detailLbl}>Address</span><span>{viewProfile.address}</span></div>}
              {viewProfile.city && <div style={styles.detailRow}><span style={styles.detailLbl}>City</span><span>{viewProfile.city}</span></div>}
              {viewProfile.province && <div style={styles.detailRow}><span style={styles.detailLbl}>Province</span><span>{viewProfile.province}</span></div>}
              {viewProfile.created_at && (
                <div style={styles.detailRow}>
                  <span style={styles.detailLbl}>Member Since</span>
                  <span>{new Date(viewProfile.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline btn-sm" onClick={() => setViewProfile(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── POST-ADOPTION MONITORING MODAL ─── */}
      {monitorApp && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setMonitorApp(null)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Monitor — {monitorApp.pet_name}</h2>
              <button className="modal-close" onClick={() => setMonitorApp(null)}>✕</button>
            </div>

            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              Adopted by <strong style={{ color: 'var(--text-dark)' }}>{monitorApp.adopter_name}</strong>
              {monitorApp.adopted_at && <> on {new Date(monitorApp.adopted_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</>}
              {' · '}
              <button onClick={() => openProfile(monitorApp.applicant_id)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0, textDecoration: 'underline', fontSize: 13 }}>View profile</button>
            </div>

            {/* Add follow-up form */}
            <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Record a check-in</div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                <input type="date" className="form-input" style={{ flex: 1, minWidth: 140 }}
                  value={followForm.followup_date}
                  onChange={e => setFollowForm({ ...followForm, followup_date: e.target.value })} />
                <select className="form-select" style={{ flex: 1, minWidth: 140 }}
                  value={followForm.outcome}
                  onChange={e => setFollowForm({ ...followForm, outcome: e.target.value })}>
                  <option>Doing Well</option>
                  <option>Needs Attention</option>
                  <option>Unable to Reach</option>
                  <option>Other</option>
                </select>
              </div>
              <textarea className="form-textarea" placeholder="Notes (how is the pet settling in, any concerns...)"
                value={followForm.notes}
                onChange={e => setFollowForm({ ...followForm, notes: e.target.value })} />
              <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }} onClick={submitFollowup}>Add Follow-up</button>
            </div>

            {/* Follow-up history */}
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>History</div>
            {followups.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>No follow-ups recorded yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 240, overflowY: 'auto' }}>
                {followups.map(f => (
                  <div key={f.id} style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{new Date(f.followup_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      <span className={`badge badge-${f.outcome === 'Doing Well' ? 'green' : f.outcome === 'Needs Attention' ? 'yellow' : 'gray'}`}>{f.outcome}</span>
                    </div>
                    {f.notes && <p style={{ fontSize: 13, color: 'var(--text-mid)', margin: '4px 0 0', lineHeight: 1.5 }}>{f.notes}</p>}
                    {f.admin_name && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>Logged by {f.admin_name}</div>}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline btn-sm" onClick={() => setMonitorApp(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── EDIT PET MODAL ─── */}
      {editPet && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditPet(null)}>
          <div className="modal" style={{ maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2 className="modal-title">Edit Pet — {editPet.name}</h2>
              <button className="modal-close" onClick={() => { setEditPet(null); setEditPhotoFile(null); setEditPhotoPreview(null); }}>✕</button>
            </div>

            {/* Photo section */}
            <div
              onClick={() => document.getElementById('editPhotoInput').click()}
              style={{
                border: '2px dashed #c7d2db', borderRadius: 12, overflow: 'hidden',
                marginBottom: 20, cursor: 'pointer', position: 'relative',
                minHeight: 160, background: '#fafafa',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {editPhotoPreview || editPet.photo ? (
                <>
                  <img
                    src={editPhotoPreview || fileUrl(editPet.photo)}
                    alt={editPet.name}
                    style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }}
                  />
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'rgba(0,0,0,0.45)', color: 'white',
                    textAlign: 'center', fontSize: 12, fontWeight: 600, padding: '6px 0',
                  }}>
                    Click to change photo
                  </div>
                </>
              ) : (
                <>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 8 }}>
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#444', marginBottom: 4 }}>Add Pet Photo</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Click to upload</div>
                </>
              )}
            </div>
            <input
              id="editPhotoInput"
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files[0];
                if (file) { setEditPhotoFile(file); setEditPhotoPreview(URL.createObjectURL(file)); }
              }}
            />

            <form onSubmit={handleEditPet} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Pet Name + Species — same layout as Add */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Pet Name <span style={{ color: '#dc3545' }}>*</span></label>
                  <input
                    className="form-input"
                    style={errStyle(editErrors.name)}
                    value={editForm.name || ''}
                    onChange={e => { setEditForm({ ...editForm, name: e.target.value }); setEditErrors({ ...editErrors, name: '' }); }}
                  />
                  <ErrMsg msg={editErrors.name} />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Species <span style={{ color: '#dc3545' }}>*</span></label>
                  <select
                    className="form-select"
                    value={editForm.type}
                    onChange={e => {
                      const newType = e.target.value;
                      setEditForm({
                        ...editForm,
                        type: newType,
                        breed: '',
                        neutered: rulesFor(newType).canNeuter ? editForm.neutered : false,
                        neutered_date: rulesFor(newType).canNeuter ? editForm.neutered_date : '',
                        vaccine_log: [],
                        vaccination_status: false,
                      });
                      setEditErrors({});
                    }}
                  >
                    {['Dog','Cat','Bird','Rabbit','Other'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Breed */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Breed <span style={{ color: '#dc3545' }}>*</span></label>
                <select
                  className="form-select"
                  value={(BREEDS_PH[editForm.type] || []).includes(editForm.breed) ? editForm.breed : '__other__'}
                  onChange={e => {
                    setEditForm({ ...editForm, breed: e.target.value === '__other__' ? '' : e.target.value });
                    setEditErrors({ ...editErrors, breed: '' });
                  }}
                >
                  <option value="">Select a breed</option>
                  {(BREEDS_PH[editForm.type] || []).map(b => <option key={b} value={b}>{b}</option>)}
                  <option value="__other__">Other / Not listed — type it in</option>
                </select>
                {!(BREEDS_PH[editForm.type] || []).includes(editForm.breed) && (
                  <input
                    className="form-input"
                    style={{ marginTop: 8, ...errStyle(editErrors.breed) }}
                    placeholder="Type the breed"
                    value={editForm.breed || ''}
                    onChange={e => { setEditForm({ ...editForm, breed: e.target.value }); setEditErrors({ ...editErrors, breed: '' }); }}
                  />
                )}
                <ErrMsg msg={editErrors.breed} />
              </div>

              {/* Age + Weight + Gender — Weight now exists here too, and takes decimals */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Age <span style={{ color: '#dc3545' }}>*</span></label>
                  <input
                    className="form-input" type="number" min="0" max="30" step="1" placeholder="yrs"
                    style={errStyle(editErrors.age_years)}
                    value={editForm.age_years ?? ''}
                    onChange={e => { setEditForm({ ...editForm, age_years: e.target.value }); setEditErrors({ ...editErrors, age_years: '' }); }}
                  />
                  <ErrMsg msg={editErrors.age_years} />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Weight</label>
                  <input
                    className="form-input" type="number" min="0" max="200" step="0.01" placeholder="e.g. 4.75"
                    style={errStyle(editErrors.weight)}
                    value={editForm.weight ?? ''}
                    onChange={e => { setEditForm({ ...editForm, weight: e.target.value }); setEditErrors({ ...editErrors, weight: '' }); }}
                  />
                  <ErrMsg msg={editErrors.weight} />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Gender <span style={{ color: '#dc3545' }}>*</span></label>
                  <select className="form-select" value={editForm.gender} onChange={e => setEditForm({ ...editForm, gender: e.target.value })}>
                    <option>Male</option><option>Female</option>
                  </select>
                </div>
              </div>

              {/* Health + Status + Intake Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Health Status</label>
                  <select className="form-select" value={editForm.health_status} onChange={e => setEditForm({ ...editForm, health_status: e.target.value })}>
                    {['Excellent','Good','Fair','Poor'].map(h => <option key={h}>{h}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Status</label>
                  <select className="form-select" value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                    {['Available','Pending','Adopted','Not Available'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Fostered By</label>
                  <select className="form-select" value={editForm.fostered_by || ''} onChange={e => setEditForm({ ...editForm, fostered_by: e.target.value })}>
                    <option value="">— No foster assigned —</option>
                    {fosters.map(f => <option key={f.id} value={f.id}>{f.first_name} {f.last_name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Intake Date</label>
                  <input
                    className="form-input" type="date"
                    max={new Date().toISOString().slice(0, 10)}
                    style={errStyle(editErrors.intake_date)}
                    value={editForm.intake_date || ''}
                    onChange={e => { setEditForm({ ...editForm, intake_date: e.target.value }); setEditErrors({ ...editErrors, intake_date: '' }); }}
                  />
                  <ErrMsg msg={editErrors.intake_date} />
                </div>
              </div>

              {/* Additional Information */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Additional Information</label>
                <textarea
                  className="form-textarea"
                  placeholder="Tells us more about its information"
                  maxLength={1000}
                  style={{ background: '#f0fdf4', minHeight: 90, ...errStyle(editErrors.description) }}
                  value={editForm.description || ''}
                  onChange={e => { setEditForm({ ...editForm, description: e.target.value }); setEditErrors({ ...editErrors, description: '' }); }}
                />
                <ErrMsg msg={editErrors.description} />
              </div>

              {/* ─── MEDICAL RECORDS (identical logic to the Add form) ─── */}
              <div style={{ borderTop: '1.5px solid #e5e7eb', paddingTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-dark)' }}>🏥 Medical Records</span>
                  <span className="badge badge-gray" style={{ fontSize: 11 }}>Optional</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
                  Leave everything blank if this {(editForm.type || '').toLowerCase()} hasn't been checked up yet.
                </div>

                {/* Neuter — hidden for species that can't be neutered */}
                {rulesFor(editForm.type).canNeuter ? (
                  <div style={{ marginBottom: 14, padding: 12, background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={editForm.neutered === true}
                        onChange={e => setEditForm({ ...editForm, neutered: e.target.checked, neutered_date: e.target.checked ? editForm.neutered_date : '' })}
                      />
                      <span style={{ fontWeight: 700 }}>✂️ Neutered / Spayed</span>
                    </label>
                    {editForm.neutered === true && (
                      <div className="form-group" style={{ marginLeft: 24, marginTop: 10 }}>
                        <label className="form-label">Date of Neutering / Spaying <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span></label>
                        <input
                          className="form-input" type="date"
                          max={new Date().toISOString().slice(0, 10)}
                          style={{ maxWidth: 220, ...errStyle(editErrors.neutered_date) }}
                          value={editForm.neutered_date || ''}
                          onChange={e => { setEditForm({ ...editForm, neutered_date: e.target.value }); setEditErrors({ ...editErrors, neutered_date: '' }); }}
                        />
                        <ErrMsg msg={editErrors.neutered_date} />
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ marginBottom: 14, padding: '10px 12px', background: '#f1f5f9', borderRadius: 8, fontSize: 12.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>ℹ️</span>
                    <span>Neutering / spaying is not tracked for <strong>{editForm.type}s</strong> — this section is hidden.</span>
                  </div>
                )}

                {/* Vaccination — dropdown of species-specific vaccines */}
                <div style={{ marginBottom: 14, padding: 12, background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={editForm.vaccination_status === true}
                      onChange={e => setEditForm({
                        ...editForm,
                        vaccination_status: e.target.checked,
                        vaccine_log: e.target.checked
                          ? ((editForm.vaccine_log || []).length ? editForm.vaccine_log : [{ name: '', date: '' }])
                          : [],
                      })}
                    />
                    <span style={{ fontWeight: 700 }}>💉 Vaccinated</span>
                  </label>

                  {editForm.vaccination_status === true && (
                    <div style={{ marginLeft: 24, marginTop: 10 }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                        Vaccines available for <strong>{editForm.type}s</strong>:
                      </div>

                      {(editForm.vaccine_log || []).map((v, i) => {
                        const taken = (editForm.vaccine_log || []).filter((_, idx) => idx !== i).map(x => x.name);
                        // An old saved vaccine might not be in the new species list — keep it selectable.
                        const options = rulesFor(editForm.type).vaccines.includes(v.name) || !v.name
                          ? rulesFor(editForm.type).vaccines
                          : [...rulesFor(editForm.type).vaccines, v.name];
                        return (
                          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                            <select
                              className="form-select"
                              value={v.name || ''}
                              onChange={e => {
                                const log = [...editForm.vaccine_log];
                                log[i] = { ...log[i], name: e.target.value };
                                setEditForm({ ...editForm, vaccine_log: log });
                                setEditErrors({ ...editErrors, vaccine_log: '' });
                              }}
                              style={{ flex: 1, fontSize: 13 }}
                            >
                              <option value="">— Select a vaccine —</option>
                              {options.map(name => (
                                <option key={name} value={name} disabled={taken.includes(name)}>
                                  {name}{taken.includes(name) ? ' (already added)' : ''}
                                </option>
                              ))}
                            </select>
                            <input
                              className="form-input" type="date"
                              max={new Date().toISOString().slice(0, 10)}
                              value={v.date || ''}
                              onChange={e => {
                                const log = [...editForm.vaccine_log];
                                log[i] = { ...log[i], date: e.target.value };
                                setEditForm({ ...editForm, vaccine_log: log });
                                setEditErrors({ ...editErrors, vaccine_log: '' });
                              }}
                              style={{ width: 155, fontSize: 13 }}
                            />
                            <button
                              type="button"
                              title="Remove this vaccine"
                              onClick={() => setEditForm({ ...editForm, vaccine_log: editForm.vaccine_log.filter((_, idx) => idx !== i) })}
                              style={{ background: 'none', border: 'none', color: '#dc3545', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}
                            >×</button>
                          </div>
                        );
                      })}

                      <ErrMsg msg={editErrors.vaccine_log} />

                      {(editForm.vaccine_log || []).length < rulesFor(editForm.type).vaccines.length && (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ marginTop: 4 }}
                          onClick={() => setEditForm({ ...editForm, vaccine_log: [...(editForm.vaccine_log || []), { name: '', date: '' }] })}
                        >+ Add Vaccine</button>
                      )}
                    </div>
                  )}
                </div>

                {/* Checkup / vet — kept for every species */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>Veterinary Name</label>
                    <input className="form-input" placeholder="e.g. Dr. Juan dela Cruz" value={editForm.vet_name || ''} onChange={e => setEditForm({ ...editForm, vet_name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>Clinic Name</label>
                    <input className="form-input" placeholder="e.g. PetCare Animal Clinic" value={editForm.clinic_name || ''} onChange={e => setEditForm({ ...editForm, clinic_name: e.target.value })} />
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: 4 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>Last Checkup Date</label>
                  <input
                    className="form-input" type="date"
                    max={new Date().toISOString().slice(0, 10)}
                    style={errStyle(editErrors.last_checkup_date)}
                    value={editForm.last_checkup_date || ''}
                    onChange={e => { setEditForm({ ...editForm, last_checkup_date: e.target.value }); setEditErrors({ ...editErrors, last_checkup_date: '' }); }}
                  />
                  <ErrMsg msg={editErrors.last_checkup_date} />
                </div>
                <div className="form-group" style={{ marginTop: 4 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>Medical Notes / Conditions</label>
                  <textarea
                    className="form-textarea"
                    placeholder="e.g. No known conditions, previously treated for mange"
                    maxLength={500}
                    style={{ minHeight: 70, ...errStyle(editErrors.medical_notes) }}
                    value={editForm.medical_notes || ''}
                    onChange={e => { setEditForm({ ...editForm, medical_notes: e.target.value }); setEditErrors({ ...editErrors, medical_notes: '' }); }}
                  />
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right', marginTop: 2 }}>
                    {(editForm.medical_notes || '').length}/500
                  </div>
                  <ErrMsg msg={editErrors.medical_notes} />
                </div>
              </div>

              <div style={{
                display: 'flex', gap: 10, justifyContent: 'flex-end',
                borderTop: '1.5px solid #e5e7eb', paddingTop: 16, marginTop: 4,
              }}>
                <button type="button" className="btn btn-outline" onClick={() => { setEditPet(null); setEditErrors({}); setEditPhotoFile(null); setEditPhotoPreview(null); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ minWidth: 150 }}>
                  💾 Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── CREATE ASSESSMENT MODAL ─── */}
      {showAssessment && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAssessment(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Create Behavioral Assessment</h2>
              <button className="modal-close" onClick={() => setShowAssessment(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveAssessment} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Select Pet *</label>
                <select className="form-select" required value={assessForm.pet_id} onChange={e => setAssessForm({ ...assessForm, pet_id: e.target.value })}>
                  <option value="">Select a pet...</option>
                  {pets.map(p => <option key={p.id} value={p.id}>{p.name} — {p.breed}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Behavioral Traits (comma-separated) *</label>
                <input className="form-input" placeholder="e.g. Friendly, Hyperattached, Good with kids" value={assessForm.traits} onChange={e => setAssessForm({ ...assessForm, traits: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" placeholder="Describe the pet's behavior..." value={assessForm.description} onChange={e => setAssessForm({ ...assessForm, description: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Compatibility Notes</label>
                <textarea className="form-textarea" placeholder="Who is this pet best suited for?" value={assessForm.compatibility_notes} onChange={e => setAssessForm({ ...assessForm, compatibility_notes: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAssessment(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Assessment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}



const styles = {
  tableHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontWeight: 700, fontSize: 16 },
  subLabel: { fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 },
  scrollTable: { overflowY: 'auto', maxHeight: 260, borderRadius: 8, border: '1px solid var(--border)' },
  emptyCell: { textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '16px 0' },
  petAvatar: { width: 36, height: 36, background: 'var(--green-100)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 },
  avatarCircle: { width: 36, height: 36, background: 'var(--green-200)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--primary-dark)', flexShrink: 0 },
  linkBtn: { background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: 0 },
  assessGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  assessCard: { border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px 18px' },
  assessHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  detailRow: { display: 'flex', gap: 12, paddingBottom: 10, borderBottom: '1px solid var(--border)', alignItems: 'flex-start' },
  detailLbl: { minWidth: 120, color: 'var(--text-muted)', fontWeight: 500 },
};