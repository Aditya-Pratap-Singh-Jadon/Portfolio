export const sceneBindings=Object.freeze({
  projects:['ssxi','stackvision','cubex',null,null,null],
  skills:['javascript','react','nextjs','typescript','html-css','ui-tooling','node-express','mongodb','rest','oauth','nodemailer','drive','foundations','dsa','tools'],
  experience:['csed',null,null,null,null],
  achievements:['hackathon','forage',null,null],
});

export function sceneEntry(content,destination,index){
  if(index===null||index===undefined)return null;
  if(destination==='contact')return content.sections.contact?{type:'contact',title:content.profile.closing,record:content.profile}:null;
  const id=sceneBindings[destination]?.[index];
  const record=id&&content[destination]?.find(item=>item.id===id);
  return record?{type:destination,title:record.title||record.name||record.role,record}:{type:'empty',title:'No published entry',record:null};
}
