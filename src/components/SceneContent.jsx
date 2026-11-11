import {ExternalLink} from './UI.jsx';

export default function SceneContent({entry,content,onClose}){
  if(!entry)return null;
  const {record:r,type,title}=entry;
  const field=(name,value)=>value&&<div><h4>{name}</h4><p>{value}</p></div>;
  return <aside className="space-detail" aria-labelledby="space-detail-title" onKeyDown={event=>{
    if(onClose&&event.key==='Escape'){event.preventDefault();event.stopPropagation();onClose();}
  }}>
    <div className="space-detail-heading"><h3 id="space-detail-title">{title}</h3>{onClose&&<button onClick={onClose} aria-label="Close selected content">×</button>}</div>
    <div className="space-detail-body" tabIndex="0" role="region" aria-label="Selected content details">
      {type==='empty'?<p>This object has no published content.</p>:type==='projects'?<>
        <p className="space-detail-meta">{r.status}</p><p>{r.description}</p>
        {r.image&&<img src={r.image} alt={`${r.title} screenshot`}/>}
        {field('My contribution',r.contribution)}{field('Technical decisions',r.decisions)}{field('Challenge',r.challenge)}{field('Outcome',r.outcome)}
        {r.tags.length>0&&field('Technologies',r.tags.join(' · '))}{r.credit&&<p>{r.credit}</p>}
        <nav aria-label="Project links">{r.repo&&<ExternalLink href={r.repo}>Repository</ExternalLink>}{r.live&&<ExternalLink href={r.live}>Live site</ExternalLink>}</nav>
      </>:type==='skills'?<>
        <p className="space-detail-meta">{r.status}</p><p>{r.technologies}</p>{r.evidence&&<p>{r.evidence}</p>}
        {r.projects.map(id=>content.projects.find(p=>p.id===id)).filter(Boolean).map(p=><p key={p.id}>Project evidence: {p.title}</p>)}
        {(r.experience||[]).map(id=>content.experience.find(e=>e.id===id)).filter(Boolean).map(e=><p key={e.id}>Experience: {e.organization} · {e.type}</p>)}
        <small>Connections are visual navigation cues, not verified technology dependencies.</small>
      </>:type==='experience'?<>
        <p className="space-detail-meta">{r.type} · {r.organization} · {r.dates}</p><p>{r.description}</p>
        {r.details.split('\n').map(line=><p key={line}>{line}</p>)}{r.url&&<ExternalLink href={r.url}>Related website</ExternalLink>}
      </>:type==='achievements'?<><p>{r.detail}</p>{r.url&&<ExternalLink href={r.url}>{r.id==='forage'?'View credential':'Read the team announcement'}</ExternalLink>}</>:type==='contact'?<>
        <p>{r.availability}</p><a href={'mailto:'+r.email}>{r.email}</a>
        <nav aria-label="Contact links"><ExternalLink href={r.github}>GitHub</ExternalLink><ExternalLink href={r.linkedin}>LinkedIn</ExternalLink>
          {content.resumeAvailable&&<a href={content.resumeUrl||'/api/resume'} target="_blank" rel="noopener noreferrer">View résumé ↗</a>}
        </nav>
      </>:null}
    </div>
  </aside>;
}
