import { safeUrl } from './content.js';

// Public names follow the approved glass labels; IDs keep existing routes and stored content stable.
export const signals = [
  { id: 'about', entity: 'ABOUT', title: 'Origin', subtitle: 'About', summary: 'Background, approach and direction.' },
  { id: 'projects', entity: 'PROJECTS', title: 'Forge', subtitle: 'Projects', summary: 'Selected work and the decisions behind it.' },
  { id: 'experience', entity: 'EXPERIENCE', title: 'Chronicle', subtitle: 'Experience', summary: 'Roles, contributions and work in context.' },
  { id: 'skills', entity: 'SKILLS', title: 'Skills', subtitle: 'Skills & learning', summary: 'Tools, foundations and the evidence that connects them.' },
  { id: 'github', entity: 'GITHUB', title: 'GitHub', subtitle: 'Repositories', summary: 'Explore the source and work in progress.' },
  { id: 'linkedin', section: 'updates', entity: 'LINKEDIN', title: 'Signal', subtitle: 'Updates', summary: 'Notes, progress and professional updates.' },
  { id: 'achievements', entity: 'ACHIEVEMENTS', title: 'Vault', subtitle: 'Achievements', summary: 'Education, milestones and credentials.' },
  { id: 'contact', entity: 'CONTACT', title: 'Nexus', subtitle: 'Contact', summary: 'A direct route to the next conversation.' },
];

export const sectionById = Object.fromEntries(signals.map(s => [s.section || s.id, s]));
export const hubCopy = {
  title: 'Command Center',
  introduction: 'Explore my projects, foundations, experience, and the work ahead.',
  note: '',
};

export function signalLinks(visibility, profile) {
  return signals.map(signal => {
    const { id } = signal;
    const href = id === 'github' ? profile.github : id === 'linkedin' ? (visibility.updates ? '#updates' : profile.linkedin) : '#' + id;
    const enabled = id === 'github' ? Boolean(profile.github) && safeUrl(profile.github)
      : id === 'linkedin' ? Boolean(visibility.updates || profile.linkedin && safeUrl(profile.linkedin))
      : Boolean(visibility[id]);
    return { ...signal, href, enabled };
  });
}
