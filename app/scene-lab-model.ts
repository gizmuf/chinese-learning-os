export const sceneLabs = [
  {id:'room', title:'3D room', note:'Walk, discover and try short missions.', path:'world3d.html?v=ef81380&embedded=1'},
  {id:'speaking', title:'Guided speaking', note:'See the action, listen and try it yourself.', path:'teacher/index.html?v=ef81380&embedded=1'},
  {id:'journey', title:'2D journey', note:'Explore movement from home to school.', path:'journey.html?v=ef81380&embedded=1'},
] as const;
export type SceneLab = typeof sceneLabs[number]['id'] | 'voice';
export function sceneLab(value:unknown):SceneLab {return value==='voice'||sceneLabs.some(l=>l.id===value)?value as SceneLab:'room';}
export function sceneLabHref(value:SceneLab){return '/?view=labs&lab='+sceneLab(value);}
