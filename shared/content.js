export function safeUrl(value) {
  if (!value) return true
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password } catch { return false }
}

export function safeResumeUrl(value) {
  return safeUrl(value) || /^\/[a-z0-9_-]+\.pdf$/i.test(value)
}

export function mergeProjects(manual, pins = []) {
  const merged = []
  for (const pin of pins) {
    const edited = manual.find(p => p.repo?.toLowerCase() === pin.repo?.toLowerCase())
    if (!edited?.hidden) merged.push({ ...pin, ...edited })
  }
  for (const project of manual) {
    if (project.featured && !project.hidden && !merged.some(p => p.id === project.id)) merged.push(project)
  }
  return merged.sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
}

// Only this allowlist crosses the editor/import boundary. Never persist unknown fields.
export function validateContent(input) {
  const text = (v, max = 12000) => { if (typeof v !== 'string' || v.length > max) throw new Error('Invalid or oversized text field'); return v.trim() }
  const url = v => { const s = text(v, 2000); if (!safeUrl(s)) throw new Error('Links must use HTTPS'); return s }
  const strings = (o, keys) => Object.fromEntries(keys.map(k => [k, text(o?.[k])]))
  const list = (v, convert, max = 100) => { if (!Array.isArray(v) || v.length > max) throw new Error('Invalid list'); return v.map(convert) }
  const id = v => { if (typeof v !== 'string' || !/^[a-z0-9_-]{1,80}$/i.test(v)) throw new Error('IDs must be short letters, numbers or hyphens'); return v }
  const unique = rows => { if (new Set(rows.map(r => r.id)).size !== rows.length) throw new Error('Duplicate IDs'); return rows }
  const boolean = v => { if (typeof v !== 'boolean') throw new Error('Invalid visibility flag'); return v }
  const profile = strings(input?.profile, ['name', 'title', 'introduction', 'summary', 'about', 'availability', 'email', 'closing'])
  profile.punchline = text(input.profile.punchline ?? '', 240)
  if (!profile.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email) || /[\r\n]/.test(profile.email)) throw new Error('Name and valid email are required')
  profile.github = url(input.profile.github); profile.linkedin = url(input.profile.linkedin)
  const projects = unique(list(input.projects, p => {
    if (!Number.isInteger(p.order) || p.order < 0 || p.order > 999) throw new Error('Project order must be 0–999')
    const image = text(p.image, 3000000)
    if (image && !/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(image)) throw new Error('Project images must be PNG, JPEG or WebP uploads')
    return { ...strings(p, ['title', 'category', 'year', 'status', 'description', 'contribution', 'challenge', 'outcome', 'credit']), id: id(p.id), repo: url(p.repo), live: url(p.live), tags: list(p.tags, v => text(v, 80), 20), image, featured: boolean(p.featured), hidden: boolean(p.hidden), order: p.order }
  }))
  const posts = unique(list(input.posts, p => {
    const source = url(p.url)
    if (!source || !/(^|\.)linkedin\.com$/.test(new URL(source).hostname)) throw new Error('Posts need a LinkedIn source URL')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date) || Number.isNaN(Date.parse(p.date)) || new Date(p.date).toISOString().slice(0,10) !== p.date) throw new Error('Posts need a valid date')
    return { id: id(p.id), ...strings(p, ['title', 'text', 'summary', 'date']), url: source, published: boolean(p.published) }
  }))
  if (new Set(posts.map(p => p.url.replace(/\/$/, '').split('?')[0])).size !== posts.length) throw new Error('This LinkedIn post is already included')
  const experience = unique(list(input.experience, e => ({ id: id(e.id), ...strings(e, ['organization','role','dates','description','details']), url: url(e.url) })))
  const skills = unique(list(input.skills, s => ({ id: id(s.id), ...strings(s, ['name', 'status', 'technologies', 'evidence']), projects: list(s.projects, id, 100), experience: list(s.experience || [], id, 100) })))
  if (skills.some(s => s.projects.some(p => !projects.some(project => project.id === p)))) throw new Error('Skill evidence must reference an existing project')
  if (skills.some(s => s.experience.some(id => !experience.some(e => e.id === id)))) throw new Error('Skill evidence must reference existing experience')
  const sections = Object.fromEntries(['about','projects','experience','skills','updates','achievements','contact'].map(k => [k, boolean(input.sections?.[k])]))
  const intervalHours = input.sync?.intervalHours
  if (!Number.isInteger(intervalHours) || intervalHours < 1 || intervalHours > 168) throw new Error('Sync interval must be 1–168 hours')
  const resume = { name: text(input.resume?.name || 'Resume.pdf', 120), data: text(input.resume?.data || '', 5600000), url: text(input.resume?.url || '', 2000) }
  if (!safeResumeUrl(resume.url)) throw new Error('Resume links must use HTTPS or a root-relative PDF filename')
  if (resume.data && !/^data:application\/pdf;base64,JVBERi0[A-Za-z0-9+/=]+$/.test(resume.data)) throw new Error('Resume must be a PDF upload')
  return {
    profile, resume, education: strings(input.education, ['institution','degree','specialization','graduation','grade']), projects, skills, posts, sections,
    experience,
    achievements: unique(list(input.achievements, a => ({ id: id(a.id), ...strings(a, ['title','detail']), url: url(a.url) }))),
    sync: { enabled: boolean(input.sync?.enabled), intervalHours },
  }
}

export function publicContent(content, pins = []) {
  const { sync, resume, ...rest } = content
  const s = content.sections
  const projects = s.projects ? mergeProjects(content.projects, pins) : []
  return {
    ...rest,
    resumeAvailable: Boolean(resume?.data || resume?.url),
    resumeUrl: resume?.data ? '' : resume?.url || '',
    profile: { ...rest.profile, ...(!s.about ? { about: '', punchline: '' } : {}), ...(!s.contact ? { email: '', github: '', linkedin: '' } : {}) },
    education: s.achievements || s.about ? rest.education : {},
    projects, experience: s.experience ? rest.experience : [],
    skills: s.skills ? rest.skills.map(skill => ({ ...skill, projects: skill.projects.filter(id => projects.some(p => p.id === id)), experience: s.experience ? skill.experience || [] : [] })) : [],
    achievements: s.achievements ? rest.achievements : [],
    posts: s.updates ? content.posts.filter(p => p.published).map(({ text, published, ...post }) => post) : [],
  }
}
