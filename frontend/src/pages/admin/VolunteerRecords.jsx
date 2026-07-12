import { useState, useEffect } from 'react';
import { API } from '../../context/AuthContext';
import { ConfirmModal } from '../../components/ConfirmDialog';

import volunteeringIcon from '../../assets/volunteering 2.png';
import animalCareIcon from '../../assets/animal-care 1.png';

const TIME_SLOTS = ['Morning (8AM-12PM)', 'Afternoon (12PM-5PM)', 'Evening (5PM-9PM)', 'Whole Day (8AM-9PM)'];
const DUTIES = ['Pet Care', 'Feeding', 'Cleaning', 'Dog Walking', 'Adoption Helper', 'Admin Support', 'Fundraising', 'Event Support'];
const SCHED_COLORS = { Scheduled: '#e3f2fd', Completed: '#e8f5e9', Missed: '#fff3e0', Cancelled: '#fdecea' };

const APPROVAL_CRITERIA = [
  'Contact information is complete (phone and email)',
  'Motivation is clear and sincere',
  "Availability and time fit the shelter's needs",
  'Has volunteer experience, or is a good fit for training',
  'No red flags or concerns in the application',
];

// How many full years since a given date (for volunteering experience)
const yearsSince = (dateStr) => {
  if (!dateStr) return null;
  const then = new Date(String(dateStr).slice(0, 10));
  return Math.max(0, Math.floor((Date.now() - then.getTime()) / (365.25 * 24 * 3600 * 1000)));
};

// Monday of the week containing date d
const startOfWeek = (d) => {
  const x = new Date(d);
  const diff = x.getDay() === 0 ? -6 : 1 - x.getDay();
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
};
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const fmtDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const slotRange = (t) => {
  if (!t) return null;
  const x = String(t).toLowerCase();
  if (x.startsWith('morning'))   return ['08:00', '12:00'];
  if (x.startsWith('afternoon')) return ['12:00', '17:00'];
  if (x.startsWith('evening'))   return ['17:00', '21:00'];
  return null; // Whole day
};

// Returns a warning string if the duty does NOT fit the volunteer's availability, else null
const availabilityWarning = (vol, dateStr, start, end) => {
  const day = new Date(`${dateStr}T00:00:00`).getDay();
  const weekend = day === 0 || day === 6;
  if (vol.availability === 'Weekdays' && weekend) return `${vol.name} is only available on weekdays.`;
  if (vol.availability === 'Weekends' && !weekend) return `${vol.name} is only available on weekends.`;
  const range = slotRange(vol.available_time);
  if (range && (start < range[0] || end > range[1])) return `${vol.name} is only available during: ${vol.available_time}.`;
  return null;
};

export default function VolunteerRecords() {
  const [volunteers, setVolunteers]   = useState([]);
  const [volApps,    setVolApps]      = useState([]);
  const [loading,    setLoading]      = useState(true);
  const [showAddVol, setShowAddVol]   = useState(false);
  const [viewVol,    setViewVol]      = useState(null);
  const [editVol,    setEditVol]      = useState(null);
  const [editVolForm,setEditVolForm]  = useState({});
  const [viewVolApp, setViewVolApp]   = useState(null);
  const [toast,      setToast]        = useState('');
  const [confirmState, setConfirmState] = useState(null);
  const [volFilter,  setVolFilter]    = useState('');
  const [appFilter,  setAppFilter]    = useState('');
  const [appStatusFilter, setAppStatusFilter] = useState('Pending');
  const [criteria,   setCriteria]     = useState([]);
  const [volForm, setVolForm] = useState({
    name: '', email: '', phone: '', availability: 'Weekdays', available_time: 'Whole Day (8AM-9PM)', role: '', status: 'Active',
  });

  /* ─── SCHEDULING STATE ─── */
  const [schedules,  setSchedules]  = useState([]);
  const [weekStart,  setWeekStart]  = useState(startOfWeek(new Date()));
  const [showAssign, setShowAssign] = useState(false);
  const [assignForm, setAssignForm] = useState({
    volunteer_id: '', duty: '', duty_date: '', time_start: '09:00', time_end: '12:00', notes: '',
  });

  const [stats, setStats] = useState({
    totalVolunteers:  { value: '—', weekDelta: null },
    activeThisMonth:  { value: '—', label: '' },
  });

  /* ─── FETCH ─── */
  useEffect(() => {
    setLoading(true);
    Promise.all([
      API.get('/volunteers').catch(() => null),
      API.get('/volunteers/applications').catch(() => null),
      API.get('/volunteers/stats').catch(() => null),
    ]).then(([v, a, s]) => {
      if (v) setVolunteers(v.data);
      if (a) setVolApps(a.data);
      if (s) {
        const { volunteers: vs } = s.data;
        setStats({
          totalVolunteers: {
            value:     vs.total ?? 0,
            weekDelta: vs.added_this_week ?? null,
          },
          activeThisMonth: {
            value: vs.active ?? 0,
            label: 'This week',
          },
        });
      }
    }).finally(() => setLoading(false));
  }, []);

  /* ─── FETCH SCHEDULES (re-runs whenever the visible week changes) ─── */
  const loadSchedules = () => {
    const start = fmtDate(weekStart);
    const end   = fmtDate(addDays(weekStart, 6));
    API.get(`/volunteers/schedules?start=${start}&end=${end}`)
      .then(({ data }) => setSchedules(data))
      .catch(() => setSchedules([]));
  };
  useEffect(() => { loadSchedules(); }, [weekStart]); // eslint-disable-line react-hooks/exhaustive-deps

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  /* ─── ACTIONS ─── */
  const handleVolStatus = async (id, status) => {
    const apply = async () => {
      try {
        await API.patch(`/volunteers/applications/${id}/status`, { status, criteria });
        if (status === 'Approved') {
          const { data } = await API.get('/volunteers');
          setVolunteers(data);
        }
      } catch { /* demo */ }
      setVolApps(prev => prev.map(a => a.id === id ? { ...a, status } : a));
      showToast(`Application ${status}`);
    };

    if (status === 'Rejected') {
      setConfirmState({
        title: 'Are you sure about rejecting?',
        message: 'This applicant will be notified that their volunteer application was not approved.',
        onConfirm: apply,
      });
      return;
    }
    apply();
  };

  const handleEditVol = async (e) => {
    e.preventDefault();
    try { await API.put(`/volunteers/${editVol.id}`, editVolForm); showToast('Volunteer updated!'); }
    catch { /* demo */ }
    setVolunteers(prev => prev.map(v => v.id === editVol.id ? { ...v, ...editVolForm } : v));
    setEditVol(null);
  };

  const handleDeleteVol = (vol) => {
    setConfirmState({
      title: 'Are you sure about removing?',
      message: `${vol.name} will be removed from the volunteers list. This cannot be undone.`,
      onConfirm: async () => {
        try { await API.delete(`/volunteers/${vol.id}`); } catch { /* demo */ }
        setVolunteers(prev => prev.filter(v => v.id !== vol.id));
        showToast('Volunteer removed.');
      },
    });
  };

  const handleAddVol = async (e) => {
    e.preventDefault();
    try {
      const { data } = await API.post('/volunteers', volForm);
      setVolunteers(prev => [...prev, { id: data.id, ...volForm }]);
      showToast('Volunteer added!');
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to add volunteer.');
      return;
    }
    setShowAddVol(false);
    setVolForm({ name: '', email: '', phone: '', availability: 'Weekdays', available_time: 'Whole Day (8AM-9PM)', role: '', status: 'Active' });
  };

  /* ─── SCHEDULING ACTIONS ─── */
  const handleAssign = async (e) => {
    e.preventDefault();
    try {
      await API.post('/volunteers/schedules', assignForm);
      showToast('Duty assigned!');
      setShowAssign(false);
      setAssignForm({ volunteer_id: '', duty: '', duty_date: '', time_start: '09:00', time_end: '12:00', notes: '' });
      loadSchedules();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to assign duty.');
    }
  };

  const handleScheduleStatus = async (id, status) => {
    try { await API.patch(`/volunteers/schedules/${id}/status`, { status }); } catch { /* demo */ }
    setSchedules(prev => prev.map(sc => sc.id === id ? { ...sc, status } : sc));
    showToast(`Duty marked ${status}.`);
    // Refresh masterlist so hours/duty counts update
    API.get('/volunteers').then(({ data }) => setVolunteers(data)).catch(() => {});
  };

  const handleDeleteSchedule = (sc) => {
    setConfirmState({
      title: 'Remove this duty?',
      message: `${sc.duty} for ${sc.volunteer_name} on ${String(sc.duty_date).slice(0, 10)} will be removed from the schedule.`,
      onConfirm: async () => {
        try { await API.delete(`/volunteers/schedules/${sc.id}`); } catch { /* demo */ }
        setSchedules(prev => prev.filter(x => x.id !== sc.id));
        showToast('Duty removed.');
      },
    });
  };

  /* ─── EXPORT MASTERLIST AS CSV ─── */
  const exportCSV = () => {
    const header = ['#', 'Name', 'Email', 'Phone', 'Availability', 'Available Time', 'Role', 'Status', 'Start Date', 'Duties Assigned', 'Hours Completed'];
    const rows = volunteers.map((v, i) => [
      i + 1, v.name, v.email, v.phone, v.availability, v.available_time || '',
      v.role || '', v.status, v.start_date ? String(v.start_date).slice(0, 10) : '',
      v.total_duties ?? 0, v.hours_completed ?? 0,
    ]);
    const csv = [header, ...rows]
      .map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'volunteer_masterlist.csv';
    a.click();
  };

  /* ─── FILTERED DATA ─── */
  const filteredVols = volunteers.filter(v =>
    !volFilter || v.name?.toLowerCase().includes(volFilter.toLowerCase()) ||
    v.role?.toLowerCase().includes(volFilter.toLowerCase())
  );
  const filteredApps = volApps.filter(a =>
    (appStatusFilter === 'All' || a.status === appStatusFilter) &&
    (!appFilter || a.name?.toLowerCase().includes(appFilter.toLowerCase()) ||
    a.preferred_role?.toLowerCase().includes(appFilter.toLowerCase()))
  );

  /* ─── HELPERS ─── */
  const statusBadge = (st) => {
    const map = { Active: 'green', Inactive: 'gray', Pending: 'yellow', Approved: 'green', Rejected: 'red' };
    return <span className={`badge badge-${map[st] || 'gray'}`}>{st}</span>;
  };

  const avatarCircle = (name, bg = 'var(--green-200)', photo = null) => (
    photo ? (
      <img
        src={`http://localhost:5000${photo}`}
        alt={name || ''}
        style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1.5px solid var(--border)' }}
      />
    ) : (
      <div style={{ width: 36, height: 36, background: bg, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--primary-dark)', flexShrink: 0 }}>
        {(name || '?')[0].toUpperCase()}
      </div>
    )
  );

  /* ─── STAT CARD ─── */
  const StatCard = ({ label, value, sub, subColor, icon, bg }) => (
    <div className="card" style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, whiteSpace: 'nowrap' }}>{label}</div>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Fraunces',serif", marginBottom: 2, lineHeight: 1.1 }}>{value}</div>
          {sub != null && (
            <div style={{ fontSize: 12, color: subColor || 'var(--primary)', fontWeight: 500 }}>
              {sub}
            </div>
          )}
        </div>
        <div style={{ width: 56, height: 56, background: bg, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 8 }}>
          <img src={icon} alt="" style={{ width: 32, height: 32, objectFit: 'contain' }} />
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {toast && (
        <div className="toast" style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}>{toast}</div>
      )}

      {confirmState && (
        <ConfirmModal
          title={confirmState.title}
          message={confirmState.message}
          onConfirm={() => { confirmState.onConfirm(); setConfirmState(null); }}
          onCancel={() => setConfirmState(null)}
        />
      )}

      {/* ─── STAT CARDS ─── */}
      <div style={s.statsRow}>
        <StatCard
          label="Total Volunteers"
          value={stats.totalVolunteers.value}
          sub={stats.totalVolunteers.weekDelta != null ? `+${stats.totalVolunteers.weekDelta} this week` : null}
          subColor="var(--primary)"
          icon={volunteeringIcon}
          bg="#e8f5e9"
        />
        <StatCard
          label="Active this month"
          value={stats.activeThisMonth.value}
          sub={stats.activeThisMonth.label || null}
          subColor="var(--primary)"
          icon={animalCareIcon}
          bg="#e3f2fd"
        />
      </div>

      {/* ─── VOLUNTEER RECORD ─── */}
      <div className="card">
        <div style={s.tableHeader}>
          <h2 style={s.sectionTitle}>Volunteer Masterlist</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              className="form-input"
              placeholder="Search name or role…"
              value={volFilter}
              onChange={e => setVolFilter(e.target.value)}
              style={{ height: 32, fontSize: 13, width: 180 }}
            />
            <button className="btn btn-outline btn-sm" onClick={exportCSV}>⬇ Export CSV</button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddVol(true)}>+ Add Volunteer</button>
          </div>
        </div>
        <div style={s.scrollTable}>
          <table style={{ minWidth: 1000 }}>
            <thead>
              <tr>
                <th>#</th><th>NAME</th><th>CONTACT</th><th>AVAILABILITY</th>
                <th>TIME</th><th>ROLE</th><th>START DATE</th>
                <th>DUTIES</th><th>HRS</th><th>STATUS</th><th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} style={s.empty}>Loading…</td></tr>
              ) : filteredVols.length === 0 ? (
                <tr><td colSpan={11} style={s.empty}>No volunteers found.</td></tr>
              ) : filteredVols.map((v, i) => (
                <tr key={v.id}>
                  <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                  <td>
                    <div style={s.nameCell}>
                      {avatarCircle(v.name, 'var(--green-200)', v.profile_photo)}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{v.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{v.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{v.phone}</td>
                  <td>{v.availability}</td>
                  <td style={{ fontSize: 12.5 }}>{v.available_time || '—'}</td>
                  <td>{v.role}</td>
                  <td>{v.start_date ? String(v.start_date).slice(0, 10) : '—'}</td>
                  <td style={{ textAlign: 'center' }}>{v.total_duties ?? 0}</td>
                  <td style={{ textAlign: 'center' }}>{v.hours_completed ?? 0}</td>
                  <td>{statusBadge(v.status)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button style={s.linkBtn} onClick={() => setViewVol(v)}>View</button>
                      <button style={s.linkBtn} onClick={() => { setEditVol(v); setEditVolForm({ availability: v.availability, available_time: v.available_time || '', role: v.role, status: v.status }); }}>Edit</button>
                      <button style={{ ...s.linkBtn, color: '#e53935' }} onClick={() => handleDeleteVol(v)}>Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── VOLUNTEER APPLICATIONS ─── */}
      <div className="card">
        <div style={s.tableHeader}>
          <h2 style={s.sectionTitle}>Volunteer Application</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              className="form-select"
              value={appStatusFilter}
              onChange={e => setAppStatusFilter(e.target.value)}
              style={{ height: 32, fontSize: 13, width: 'auto', minWidth: 130, padding: '0 28px 0 10px' }}
            >
              {['Pending', 'Approved', 'Rejected', 'All'].map(x => <option key={x}>{x}</option>)}
            </select>
            <input
              className="form-input"
              placeholder="Search applicants…"
              value={appFilter}
              onChange={e => setAppFilter(e.target.value)}
              style={{ height: 32, fontSize: 13, width: 180 }}
            />
          </div>
        </div>
        <div style={s.scrollTable}>
          <table style={{ minWidth: 680 }}>
            <thead>
              <tr>
                <th>NAME / EMAIL</th><th>CONTACT</th><th>AVAILABILITY</th>
                <th>TIME</th><th>PREFERRED ROLE</th><th>STATUS</th><th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={s.empty}>Loading…</td></tr>
              ) : filteredApps.length === 0 ? (
                <tr><td colSpan={7} style={s.empty}>No applications found.</td></tr>
              ) : filteredApps.map(a => (
                <tr key={a.id}>
                  <td>
                    <div style={s.nameCell}>
                      {avatarCircle(a.name, '#e3f2fd', a.profile_photo)}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{a.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{a.phone}</td>
                  <td>{a.availability}</td>
                  <td style={{ fontSize: 12.5 }}>{a.available_time || '—'}</td>
                  <td>{a.preferred_role}</td>
                  <td>{statusBadge(a.status)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button style={s.linkBtn} onClick={() => { setCriteria([]); setViewVolApp(a); }}>Review</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── DUTY SCHEDULE (weekly calendar) ─── */}
      <div className="card">
        <div style={s.tableHeader}>
          <h2 style={s.sectionTitle}>Duty Schedule</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn btn-outline btn-sm" onClick={() => setWeekStart(addDays(weekStart, -7))}>‹ Prev</button>
            <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
              {weekStart.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
              {' – '}
              {addDays(weekStart, 6).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <button className="btn btn-outline btn-sm" onClick={() => setWeekStart(addDays(weekStart, 7))}>Next ›</button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAssign(true)}>+ Assign Duty</button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, overflowX: 'auto' }}>
          {[0, 1, 2, 3, 4, 5, 6].map(i => {
            const day = addDays(weekStart, i);
            const dayStr = fmtDate(day);
            const daySchedules = schedules.filter(sc => String(sc.duty_date).slice(0, 10) === dayStr);
            const isToday = dayStr === fmtDate(new Date());
            return (
              <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 8, minHeight: 130, minWidth: 105, background: isToday ? '#f0f9f1' : 'white' }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: isToday ? 'var(--primary)' : 'var(--text-dark)' }}>
                  {day.toLocaleDateString('en-PH', { weekday: 'short' })} {day.getDate()}
                </div>
                {daySchedules.length === 0 && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</div>
                )}
                {daySchedules.map(sc => (
                  <div key={sc.id} style={{ background: SCHED_COLORS[sc.status] || '#eee', borderRadius: 6, padding: '5px 7px', marginBottom: 5, fontSize: 11 }}>
                    <div style={{ fontWeight: 700 }}>{sc.duty}</div>
                    <div>{sc.volunteer_name}</div>
                    <div style={{ color: 'var(--text-muted)' }}>
                      {String(sc.time_start).slice(0, 5)}–{String(sc.time_end).slice(0, 5)}
                    </div>
                    {sc.status === 'Scheduled' ? (
                      <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
                        <button style={{ ...s.linkBtn, fontSize: 11, color: '#2e7d32' }} onClick={() => handleScheduleStatus(sc.id, 'Completed')}>Done</button>
                        <button style={{ ...s.linkBtn, fontSize: 11, color: '#e65100' }} onClick={() => handleScheduleStatus(sc.id, 'Missed')}>Missed</button>
                        <button style={{ ...s.linkBtn, fontSize: 11, color: '#e53935' }} onClick={() => handleDeleteSchedule(sc)}>✕</button>
                      </div>
                    ) : (
                      <div style={{ fontWeight: 600, marginTop: 2 }}>{sc.status}</div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* ASSIGN DUTY MODAL */}
      {showAssign && (() => {
        const selVol = volunteers.find(v => String(v.id) === String(assignForm.volunteer_id));
        const warn = selVol && assignForm.duty_date
          ? availabilityWarning(selVol, assignForm.duty_date, assignForm.time_start, assignForm.time_end)
          : null;
        return (
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAssign(false)}>
            <div className="modal">
              <div className="modal-header">
                <h2 className="modal-title">Assign Duty</h2>
                <button className="modal-close" onClick={() => setShowAssign(false)}>✕</button>
              </div>
              <form onSubmit={handleAssign} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Volunteer *</label>
                  <select className="form-select" required value={assignForm.volunteer_id}
                    onChange={e => setAssignForm({ ...assignForm, volunteer_id: e.target.value })}>
                    <option value="">Select a volunteer</option>
                    {volunteers.filter(v => v.status === 'Active').map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name} — {v.availability}{v.available_time ? `, ${v.available_time}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Duty *</label>
                    <select className="form-select" required value={assignForm.duty}
                      onChange={e => setAssignForm({ ...assignForm, duty: e.target.value })}>
                      <option value="">Select a duty</option>
                      {DUTIES.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date *</label>
                    <input className="form-input" type="date" required value={assignForm.duty_date}
                      onChange={e => setAssignForm({ ...assignForm, duty_date: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Start Time *</label>
                    <input className="form-input" type="time" required value={assignForm.time_start}
                      onChange={e => setAssignForm({ ...assignForm, time_start: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Time *</label>
                    <input className="form-input" type="time" required value={assignForm.time_end}
                      onChange={e => setAssignForm({ ...assignForm, time_end: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <input className="form-input" placeholder="Optional notes for this duty"
                    value={assignForm.notes}
                    onChange={e => setAssignForm({ ...assignForm, notes: e.target.value })} />
                </div>
                {warn && (
                  <div style={{ background: '#fff3e0', border: '1px solid #ffcc80', color: '#e65100', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
                    ⚠ {warn}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setShowAssign(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={!!warn}>Assign Duty</button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* ════════════════ MODALS ════════════════ */}

      {/* ADD VOLUNTEER */}
      {showAddVol && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAddVol(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Add Volunteer</h2>
              <button className="modal-close" onClick={() => setShowAddVol(false)}>✕</button>
            </div>
            <form onSubmit={handleAddVol} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="form-input" value={volForm.name} onChange={e => setVolForm({ ...volForm, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" value={volForm.email} onChange={e => setVolForm({ ...volForm, email: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={volForm.phone} onChange={e => setVolForm({ ...volForm, phone: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Availability</label>
                  <select className="form-select" value={volForm.availability} onChange={e => setVolForm({ ...volForm, availability: e.target.value })}>
                    {['Weekdays','Weekends','Both','Flexible'].map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Available Time</label>
                  <select className="form-select" value={volForm.available_time} onChange={e => setVolForm({ ...volForm, available_time: e.target.value })}>
                    {TIME_SLOTS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <input className="form-input" placeholder="e.g. Pet Care, Cleaning" value={volForm.role} onChange={e => setVolForm({ ...volForm, role: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={volForm.status} onChange={e => setVolForm({ ...volForm, status: e.target.value })}>
                    <option>Active</option><option>Inactive</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddVol(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Volunteer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW VOLUNTEER */}
      {viewVol && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewVol(null)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Volunteer Details</h2>
              <button className="modal-close" onClick={() => setViewVol(null)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
              {[['Name', viewVol.name],['Email', viewVol.email],['Phone', viewVol.phone],
                ['Availability', viewVol.availability],['Available Time', viewVol.available_time || '—'],
                ['Role', viewVol.role],['Start Date', viewVol.start_date ? String(viewVol.start_date).slice(0, 10) : '—'],
                ['Duties Assigned', String(viewVol.total_duties ?? 0)],['Hours Completed', String(viewVol.hours_completed ?? 0)],
                ['Status', viewVol.status]]
                .map(([l, v]) => (
                  <div key={l} style={s.detailRow}>
                    <span style={s.detailLbl}>{l}</span>
                    <span>{l === 'Status' ? statusBadge(v) : v}</span>
                  </div>
              ))}
            </div>
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-outline" onClick={() => setViewVol(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT VOLUNTEER */}
      {editVol && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditVol(null)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Edit Volunteer — {editVol.name}</h2>
              <button className="modal-close" onClick={() => setEditVol(null)}>✕</button>
            </div>
            <form onSubmit={handleEditVol} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Availability</label>
                  <select className="form-select" value={editVolForm.availability} onChange={e => setEditVolForm({ ...editVolForm, availability: e.target.value })}>
                    {['Weekdays','Weekends','Both','Flexible'].map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Available Time</label>
                  <select className="form-select" value={editVolForm.available_time || ''} onChange={e => setEditVolForm({ ...editVolForm, available_time: e.target.value })}>
                    <option value="">—</option>
                    {TIME_SLOTS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={editVolForm.status} onChange={e => setEditVolForm({ ...editVolForm, status: e.target.value })}>
                    <option>Active</option><option>Inactive</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Role</label>
                  <input className="form-input" value={editVolForm.role} onChange={e => setEditVolForm({ ...editVolForm, role: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setEditVol(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW APPLICATION */}
      {viewVolApp && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewVolApp(null)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Application Details</h2>
              <button className="modal-close" onClick={() => setViewVolApp(null)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
              {[
                ['Name',          viewVolApp.name],
                ['Email',         viewVolApp.email],
                ['Phone',         viewVolApp.phone],
                ['Availability',  viewVolApp.availability],
                ['Available Time', viewVolApp.available_time],
                ['Volunteering Since', viewVolApp.volunteering_since
                  ? `${String(viewVolApp.volunteering_since).slice(0, 10)} (${yearsSince(viewVolApp.volunteering_since)} yr${yearsSince(viewVolApp.volunteering_since) === 1 ? '' : 's'} of experience)`
                  : 'First-time volunteer'],
                ['Preferred Role',viewVolApp.preferred_role],
                ['Motivation',    viewVolApp.motivation],
                ['Experience',    viewVolApp.experience],
              ].filter(([, v]) => v).map(([l, v]) => (
                <div key={l} style={s.detailRow}>
                  <span style={s.detailLbl}>{l}</span>
                  <span style={{ flex: 1 }}>{v}</span>
                </div>
              ))}
              <div style={s.detailRow}>
                <span style={s.detailLbl}>Status</span>
                {statusBadge(viewVolApp.status)}
              </div>
            </div>

            {viewVolApp.status === 'Pending' && (
              <div style={{ marginTop: 18 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Approval Criteria</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 10 }}>
                  All criteria must be checked before this application can be approved.
                </div>
                {APPROVAL_CRITERIA.map(c => (
                  <label key={c} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13.5, marginBottom: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={criteria.includes(c)}
                      onChange={e => setCriteria(prev => e.target.checked ? [...prev, c] : prev.filter(x => x !== c))}
                      style={{ marginTop: 2 }}
                    />
                    <span>{c}</span>
                  </label>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end', alignItems: 'center' }}>
              {viewVolApp.status === 'Pending' ? (
                <>
                  {criteria.length < APPROVAL_CRITERIA.length && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 'auto' }}>
                      {criteria.length}/{APPROVAL_CRITERIA.length} criteria checked
                    </span>
                  )}
                  <button className="btn btn-danger btn-sm" onClick={() => { handleVolStatus(viewVolApp.id, 'Rejected'); setViewVolApp(null); }}>Reject</button>
                  <button
                    className="btn btn-success btn-sm"
                    disabled={criteria.length < APPROVAL_CRITERIA.length}
                    onClick={() => { handleVolStatus(viewVolApp.id, 'Approved'); setViewVolApp(null); }}
                  >Approve</button>
                </>
              ) : (
                <button className="btn btn-outline btn-sm" onClick={() => setViewVolApp(null)}>Close</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── STYLES ─── */
const s = {
  statsRow:   { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 },
  tableHeader:{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle:{ fontWeight: 700, fontSize: 16 },
  scrollTable:{ overflowY: 'auto', maxHeight: 280, borderRadius: 8, border: '1px solid var(--border)' },
  nameCell:   { display: 'flex', alignItems: 'center', gap: 10 },
  linkBtn:    { background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: 0 },
  detailRow:  { display: 'flex', gap: 12, paddingBottom: 10, borderBottom: '1px solid var(--border)', alignItems: 'center' },
  detailLbl:  { minWidth: 110, color: 'var(--text-muted)', fontWeight: 500 },
  empty:      { textAlign: 'center', padding: 28, color: 'var(--text-muted)' },
};