const seed = [
  {id:'cp-18',prompt:'Make the hero section cinematic and more premium',time:'2 min ago',files:[['web/Hero.tsx',34,12],['web/styles.css',48,9],['web/App.tsx',6,2]],risk:46},
  {id:'cp-17',prompt:'Turn the navbar into glassmorphism',time:'11 min ago',files:[['web/Nav.tsx',18,5],['web/styles.css',24,7]],risk:28},
  {id:'cp-16',prompt:'Add an animated background behind the landing page',time:'26 min ago',files:[['web/App.tsx',14,4],['web/particles.ts',72,0],['package.json',3,0],['web/styles.css',16,1]],risk:73}
];

let checkpoints = JSON.parse(localStorage.getItem('vibetrace-demo') || 'null') || seed;
let selected = checkpoints[0]?.id;
const timeline = document.querySelector('#timeline');
const detail = document.querySelector('#detail');
const countBadge = document.querySelector('#countBadge');
const dialog = document.querySelector('#checkpointDialog');
const form = document.querySelector('#checkpointForm');
const promptInput = document.querySelector('#promptInput');
const filesInput = document.querySelector('#filesInput');

function level(score){return score>=70?'high':score>=40?'medium':'low'}
function esc(text){return String(text).replace(/[&<>'"]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function render(){
  countBadge.textContent=`${checkpoints.length} checkpoints`;
  timeline.innerHTML=checkpoints.map(c=>`<button class="checkpoint ${c.id===selected?'active':''}" data-id="${c.id}"><strong>${esc(c.prompt)}</strong><small>${c.time} · <span class="risk ${level(c.risk)}">${level(c.risk).toUpperCase()}</span></small></button>`).join('');
  timeline.querySelectorAll('.checkpoint').forEach(btn=>btn.addEventListener('click',()=>{selected=btn.dataset.id;render()}));
  const c=checkpoints.find(x=>x.id===selected)||checkpoints[0];
  if(!c){detail.innerHTML='<p>No checkpoints yet.</p>';return}
  const lines=c.files.reduce((s,f)=>s+f[1]+f[2],0);
  detail.innerHTML=`
    <span class="label">CHECKPOINT ${esc(c.id.toUpperCase())}</span>
    <div class="promptbox">“${esc(c.prompt)}”</div>
    <div class="metrics">
      <div class="metric"><span>FILES TOUCHED</span><strong>${c.files.length}</strong></div>
      <div class="metric"><span>LINES CHANGED</span><strong>${lines}</strong></div>
      <div class="metric"><span>BLAST RADIUS</span><strong class="risk ${level(c.risk)}">${level(c.risk).toUpperCase()}</strong><div class="riskbar"><i style="width:${c.risk}%"></i></div></div>
    </div>
    <div class="files"><span class="label">CHANGE MAP</span>${c.files.map(f=>`<div class="file"><span>${esc(f[0])}</span><span class="plus">+${f[1]}</span><span class="minus">-${f[2]}</span></div>`).join('')}</div>`;
}

document.querySelector('#newCheckpoint').addEventListener('click',()=>dialog.showModal());
form.addEventListener('submit',(e)=>{
  e.preventDefault();
  const prompt=promptInput.value.trim(); if(!prompt)return;
  const n=Math.max(1,Math.min(30,Number(filesInput.value)||1));
  const demoNames=['src/App.tsx','src/components/Hero.tsx','src/styles.css','src/lib/theme.ts','package.json','src/routes.ts','src/components/Button.tsx','src/hooks/useMotion.ts'];
  const files=Array.from({length:n},(_,i)=>[demoNames[i%demoNames.length].replace(/(\.\w+)$/,`${i>=demoNames.length?`-${i}`:''}$1`),Math.floor(Math.random()*35)+2,Math.floor(Math.random()*14)]);
  const risk=Math.min(100,12+n*7+(files.some(f=>f[0]==='package.json')?16:0));
  const item={id:`cp-${Date.now().toString().slice(-5)}`,prompt,time:'just now',files,risk};
  checkpoints=[item,...checkpoints]; selected=item.id; localStorage.setItem('vibetrace-demo',JSON.stringify(checkpoints));
  promptInput.value=''; dialog.close(); render();
});

const slider=document.querySelector('#slider'); const after=document.querySelector('#afterScreen'); const wipe=document.querySelector('#wipe');
slider.addEventListener('input',()=>{const v=slider.value;after.style.clipPath=`inset(0 0 0 ${v}%)`;wipe.style.left=`${v}%`});
render();
