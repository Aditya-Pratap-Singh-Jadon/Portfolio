import About from './About.jsx';
import {Updates} from './MoreSections.jsx';
import {ExternalLink} from './UI.jsx';

export default function SectionContent({id,content}) {
  const {profile,sections}=content;
  if(id==='about')return sections.about?<About profile={profile} education={content.education} embedded/>:<p>No introduction is published yet.</p>;
  if(id==='linkedin')return <Updates posts={sections.updates?content.posts:[]} profile={profile} embedded/>;
  const projects=sections.projects?content.projects:[];
  return <section aria-label="GitHub projects and activity">
    <p>Portfolio projects. Live GitHub activity is not connected.</p>
    {profile.github&&<ExternalLink href={profile.github}>GitHub profile ↗</ExternalLink>}
    {projects.length?projects.map(project=><article key={project.id}><h3>{project.title}</h3><p>{project.description}</p>{project.repo&&<ExternalLink href={project.repo}>View repository ↗</ExternalLink>}</article>):<p>No projects are published yet.</p>}
  </section>;
}
