// ─────────────────────────────────────────────────────────────
// THE ONE TRUE LIST OF VOLUNTEER ROLES.
// Both the public "Apply" form and the admin "Assign Duty" modal
// import from here, so they can NEVER drift apart again.
// Add a role here once → it appears in BOTH places automatically.
// ─────────────────────────────────────────────────────────────
export const VOLUNTEER_ROLES = [
  'Pet Care',
  'Feeding',
  'Cleaning',
  'Dog Walking',
  'Adoption Helper',
  'Admin Support',
  'Fundraising',
  'Event Support',
];

// A short hint shown under each role in the apply form, so applicants
// actually understand what they're signing up for.
export const ROLE_DESCRIPTIONS = {
  'Pet Care':        'Grooming, bathing, and general day-to-day care of shelter animals.',
  'Feeding':         'Preparing meals and feeding the animals on schedule.',
  'Cleaning':        'Sanitizing kennels, cages, and shelter facilities.',
  'Dog Walking':     'Taking dogs out for daily walks and exercise.',
  'Adoption Helper': 'Assisting visitors, showing pets, and guiding adopters.',
  'Admin Support':   'Encoding records, answering messages, and office tasks.',
  'Fundraising':     'Helping run donation drives and fundraising campaigns.',
  'Event Support':   'Setting up and manning adoption events and outreach drives.',
};

export const AVAILABILITY = ['Weekdays', 'Weekends', 'Both', 'Flexible'];
export const TIME_SLOTS = [
  'Morning (8AM-12PM)',
  'Afternoon (12PM-5PM)',
  'Evening (5PM-9PM)',
  'Whole Day (8AM-9PM)',
];