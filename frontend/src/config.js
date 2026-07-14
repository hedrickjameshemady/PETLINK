// ═══════════════════════════════════════════════════════════
// ONE place that knows where the backend lives.
//
// In DEV: nothing to do — it falls back to localhost:5000.
// In PROD: put VITE_API_URL=https://your-server.com in
//          frontend/.env, and every image URL in the entire
//          app follows automatically. One line, whole app.
// ═══════════════════════════════════════════════════════════
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Turns a database path into a real, working URL.
 *
 *   fileUrl('/uploads/pets/pet_1.png')  →  'http://localhost:5000/uploads/pets/pet_1.png'
 *   fileUrl(null)                       →  ''      (no broken-image icon)
 *   fileUrl('https://cdn.com/a.png')    →  'https://cdn.com/a.png'  (already complete, leave it)
 */
export function fileUrl(path) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API_BASE}${path}`;
}

/**
 * Same idea, but for people's profile pictures.
 * If they have no photo, we auto-generate a nice initials circle
 * instead of showing a broken image.
 */
export function avatarFor(person) {
  if (!person) return '';
  const photo = person.profile_photo || person.applicant_photo || person.donor_photo;
  if (photo) return fileUrl(photo);

  const name = `${person.first_name || ''} ${person.last_name || ''}`.trim()
    || person.name
    || person.applicant_name
    || person.donor_name
    || '?';

  return 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name)
    + '&background=e5e7eb&color=374151&size=200';
}