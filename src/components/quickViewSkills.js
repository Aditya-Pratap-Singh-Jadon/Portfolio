const categories=[
  {name:'Frontend',status:'Used, still learning',ids:['javascript','react','nextjs','typescript','html-css','ui-tooling']},
  {name:'Backend & Databases',status:'Used, still learning',ids:['node-express','mongodb','rest']},
  {name:'Integrations & APIs',status:'Used, still learning',ids:['oauth','nodemailer','drive']},
  {name:'CS Foundations',status:'Studied, comfortable explaining',ids:['foundations']},
  {name:'DSA',status:'Still learning',ids:['dsa']},
  {name:'Tools & Teamwork',status:'Comfortable using',ids:['tools']},
];

export function groupQuickViewSkills(skills){
  return categories.map(({ids,...category})=>({...category,technologies:[...new Set(ids.flatMap(id=>{
    const skill=skills.find(skill=>skill.id===id);
    return skill?(id==='dsa'?['Data Structures & Algorithms']:skill.technologies.split(',').map(value=>value.trim()).filter(Boolean)):[];
  }))]})).filter(category=>category.technologies.length);
}
