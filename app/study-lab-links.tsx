'use client';
import {stopAudio} from './audio';
export default function StudyLabLinks({disabled=false}:{disabled?:boolean}){
 return <details className="ss-learning-lab"><summary><strong>Learning Lab</strong><span>2D &amp; 3D experiments</span></summary><p>Explore Chinese through movement and objects. Opens in a separate tab, keeping your study workspace here.</p><div className="ss-lab-links">{[{href:'journey.html',label:'2D journey',note:'Follow a day from home to school.'},{href:'world3d.html',label:'3D room',note:'Walk, discover objects and try short missions.'}].map(link=><a key={link.href} href={'/design-references/scene-lab/'+link.href} target="_blank" rel="noopener noreferrer" aria-disabled={disabled} tabIndex={disabled?-1:undefined} onClick={event=>{if(disabled){event.preventDefault();return;}stopAudio();}}><strong>{link.label}<span aria-hidden="true"> ↗</span></strong><span>{link.note}</span></a>)}</div></details>;
}
