import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const config = window.COFFEE_CONFIG || {};
const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.supabaseUrl || '') && /^(sb_publishable_|eyJ)/.test(config.supabaseKey || '') && !String(config.supabaseKey).includes('YOUR_');
const $ = (id) => document.getElementById(id);
const GRAMS_PER_OUNCE = 28.349523125;
const MILLILITERS_PER_FL_OUNCE = 29.5735295625;
const PSI_PER_BAR = 14.5037738;
const authView = $('authView'), journalView = $('journalView');
let supabase, user, entries = [], authMode = 'login', coachEntryId = null;

function setMessage(id, text, success=false) { const el=$(id); el.textContent=text; el.classList.toggle('success',success); }
function localDate() { const d=new Date(); return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10); }
function setMode(mode) { authMode=mode; $('loginTab').classList.toggle('active',mode==='login'); $('signupTab').classList.toggle('active',mode==='signup'); $('loginTab').setAttribute('aria-selected',mode==='login'); $('signupTab').setAttribute('aria-selected',mode==='signup'); $('authHeading').textContent=mode==='login'?'Welcome back':'Make it yours'; $('authSub').textContent=mode==='login'?'Sign in to open your journal.':'Create a private account for your coffee notes.'; $('authSubmit').textContent=mode==='login'?'Sign in':'Create account'; $('password').autocomplete=mode==='login'?'current-password':'new-password'; setMessage('authMessage',''); }
function showAuth(){user=null;authView.hidden=false;journalView.hidden=true;$('connection').textContent=configured?'Not signed in':'Setup needed';}
function showJournal(){authView.hidden=true;journalView.hidden=false;$('connection').textContent='Synced privately';$('signedInAs').textContent=user.email;$('coffeeDate').value=localDate();loadEntries();}

if (!configured) { $('setupNotice').hidden=false; $('connection').textContent='Setup needed'; showAuth(); }
else {
  supabase=createClient(config.supabaseUrl,config.supabaseKey);
  supabase.auth.getSession().then(({data})=>{if(data.session){user=data.session.user;showJournal()}else showAuth()});
  supabase.auth.onAuthStateChange((_event,session)=>{if(session){user=session.user;showJournal()}else showAuth()});
}

$('loginTab').addEventListener('click',()=>setMode('login'));
$('signupTab').addEventListener('click',()=>setMode('signup'));
$('authForm').addEventListener('submit',async(e)=>{e.preventDefault();if(!configured){setMessage('authMessage','Add your Supabase URL and publishable key in config.js first.');return}const email=$('email').value.trim(),password=$('password').value;$('authSubmit').disabled=true;setMessage('authMessage','Working…');try{const result=authMode==='signup'?await supabase.auth.signUp({email,password,options:{emailRedirectTo:`${window.location.origin}${window.location.pathname}`}}):await supabase.auth.signInWithPassword({email,password});if(result.error)throw result.error;if(authMode==='signup'&&!result.data.session)setMessage('authMessage','Account started. Check your email for a confirmation link, then sign in.',true);else if(result.data.session){user=result.data.user;showJournal()}}catch(err){setMessage('authMessage',err.message||'Could not sign in. Please try again.')}finally{$('authSubmit').disabled=false}});
$('signOut').addEventListener('click',async()=>{await supabase.auth.signOut();entries=[];showAuth()});

const TEXT_FIELDS = [
  ['roaster','roaster'],['origin','origin'],['farm','farm'],['varietal','varietal'],['processing','processing'],['roastLevel','roast_level'],['batchId','batch_id'],
  ['waterType','water_type'],['grindType','grind_type'],['grinder','grinder'],['brewer','brewer'],['filterType','filter_type'],['brewRecipe','brew_recipe'],
  ['aroma','aroma'],['flavor','flavor'],['finish','finish']
];
const NUMBER_FIELDS = [
  ['beanWeight','bean_weight_g'],['waterVolume','water_volume_ml'],['waterWeight','water_weight_g'],['waterTemp','water_temp_c'],
  ['brewTime','brew_time_seconds'],['bloomTime','bloom_seconds'],['pourCount','pour_count'],['pressure','pressure_bar'],['espressoYield','espresso_yield_g'],
  ['acidity','acidity_score'],['sweetness','sweetness_score'],['bitterness','bitterness_score'],['body','body_score']
];
const LABELS = {
  name:'Coffee', drank_on:'Date', rating:'Overall rating', source:'Beans or café', method:'Brew method', roaster:'Roaster', origin:'Country / origin', farm:'Farm / region / producer',
  varietal:'Variety', processing:'Processing', roast_level:'Roast level', roast_date:'Roast date', batch_id:'Lot / bag label', bean_weight_g:'Coffee dose',
  water_volume_ml:'Water volume', water_weight_g:'Water weight', water_temp_c:'Water temperature', water_type:'Water / minerals', grind_type:'Grind texture',
  grinder:'Grinder & setting', brewer:'Brewer / machine', filter_type:'Filter / basket', brew_time_seconds:'Brew / shot time', bloom_seconds:'Bloom time',
  pour_count:'Number of pours', pressure_bar:'Espresso pressure', espresso_yield_g:'Espresso yield', brew_recipe:'Recipe / technique', aroma:'Aroma', flavor:'Flavors',
  acidity_score:'Acidity (1 low · 5 high)', sweetness_score:'Sweetness (1 low · 5 high)', bitterness_score:'Bitterness (1 low · 5 high)',
  body_score:'Body (1 light · 5 full)', finish:'Finish / aftertaste', notes:'Your notes'
};

function textOrNull(id){return $(id).value.trim()||null}
function numberOrNull(id){const value=$(id).value;return value===''?null:Number(value)}
function numberForStorage(id){const value=numberOrNull(id);if(value===null)return null;if(id==='beanWeight'||id==='waterWeight'||id==='espressoYield')return value*GRAMS_PER_OUNCE;if(id==='waterVolume')return value*MILLILITERS_PER_FL_OUNCE;if(id==='waterTemp')return (value-32)*5/9;if(id==='pressure')return value/PSI_PER_BAR;return value}
function formatAmount(value,digits=2){return String(Number(Number(value).toFixed(digits)))}
function ratioText(){const dose=Number($('beanWeight').value);const waterWeight=Number($('waterWeight').value);const waterVolume=Number($('waterVolume').value);if(!dose||(!waterWeight&&!waterVolume))return 'Add coffee and water amounts';const ratio=waterWeight?waterWeight/dose:(waterVolume*MILLILITERS_PER_FL_OUNCE)/(dose*GRAMS_PER_OUNCE);return `1 : ${ratio.toFixed(1).replace(/\.0$/,'')}${waterWeight?'':' approx.'}`}
function updateRatio(){ $('ratioValue').textContent=ratioText(); }

async function loadEntries(){if(!user)return;const {data,error}=await supabase.from('coffee_entries').select('*').order('drank_on',{ascending:false}).order('created_at',{ascending:false});if(error){setMessage('entryMessage',error.message);return}entries=data||[];renderEntries()}
function escapeHTML(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function niceDate(value){return value?new Date(`${value}T12:00:00`).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}):''}
function ratingLabel(value){return value?`${value} out of 5`:''}
function visibleValue(key,value){if(value===null||value===undefined||value==='')return '';if(key==='rating')return `${value}/5`;if(key==='drank_on'||key==='roast_date')return niceDate(value);if(key==='bean_weight_g'||key==='water_weight_g'||key==='espresso_yield_g')return `${formatAmount(Number(value)/GRAMS_PER_OUNCE)} oz`;if(key==='water_volume_ml')return `${formatAmount(Number(value)/MILLILITERS_PER_FL_OUNCE)} fl oz`;if(key==='water_temp_c')return `${formatAmount(Number(value)*9/5+32,1)} °F`;if(key==='brew_time_seconds'||key==='bloom_seconds')return `${value} sec`;if(key==='pressure_bar')return `${formatAmount(Number(value)*PSI_PER_BAR,1)} psi`;if(key==='pour_count')return `${value}`;return String(value)}
function field(key,value,wide=false){if(value===null||value===undefined||value==='')return '';return `<div class="entry-detail${wide?' wide':''}"><strong>${escapeHTML(LABELS[key]||key)}</strong><span>${escapeHTML(visibleValue(key,value))}</span></div>`}
function renderEntries(){
  const query=$('search').value.trim().toLowerCase();
  const shown=entries.filter(entry=>Object.values(entry).filter(value=>typeof value==='string'||typeof value==='number').join(' ').toLowerCase().includes(query));
  $('entryCount').textContent=entries.length?`· ${entries.length}`:'';
  if(!shown.length){$('entries').innerHTML=`<div class="empty-state"><span>☕</span><h3>${entries.length?'No cups found':'Your first cup is waiting'}</h3><p>${entries.length?'Try another search.':'Add a note to start your journal.'}</p></div>`;renderCoach();return}
  $('entries').innerHTML=shown.map(entry=>{
    const facts=[entry.bean_weight_g&&`${visibleValue('bean_weight_g',entry.bean_weight_g)} dose`,entry.water_volume_ml&&`${visibleValue('water_volume_ml',entry.water_volume_ml)} water`,entry.water_temp_c&&visibleValue('water_temp_c',entry.water_temp_c),entry.grind_type,entry.brew_time_seconds&&`${entry.brew_time_seconds}s`,entry.bean_weight_g&&(entry.water_weight_g||entry.water_volume_ml)&&ratioTextForEntry(entry)].filter(Boolean);
    const detailKeys=['roaster','origin','farm','varietal','processing','roast_level','roast_date','batch_id','bean_weight_g','water_volume_ml','water_weight_g','water_temp_c','water_type','grind_type','grinder','brewer','filter_type','brew_time_seconds','bloom_seconds','pour_count','pressure_bar','espresso_yield_g','brew_recipe','aroma','flavor','acidity_score','sweetness_score','bitterness_score','body_score','finish','notes'];
    const detailHtml=detailKeys.map(key=>field(key,entry[key],['brew_recipe','notes'].includes(key))).join('');
    const sourceLine=[entry.source,entry.origin,entry.roaster].filter(Boolean).join(' · ');
    return `<article class="entry-card"><div><h3>${escapeHTML(entry.name)}</h3><p class="entry-meta">${escapeHTML(niceDate(entry.drank_on))}${entry.method?` · ${escapeHTML(entry.method)}`:''}</p></div><span class="stars" aria-label="${entry.rating?`${entry.rating} out of 5 stars`:'No rating'}">${entry.rating?'★'.repeat(entry.rating)+'☆'.repeat(5-entry.rating):''}</span>${sourceLine?`<p class="entry-source">${escapeHTML(sourceLine)}</p>`:''}${facts.length?`<div class="entry-facts">${facts.map(fact=>`<span class="fact-chip">${escapeHTML(fact)}</span>`).join('')}</div>`:''}<details class="entry-more"><summary>View full brew &amp; tasting details</summary><div class="entry-detail-list">${field('rating',entry.rating)}${field('method',entry.method)}${detailHtml}</div></details><div class="entry-actions"><button class="coach-button" data-coach="${escapeHTML(entry.id)}">Brew tips</button><button class="delete-button" data-delete="${escapeHTML(entry.id)}" aria-label="Delete ${escapeHTML(entry.name)}">Delete</button></div></article>`
  }).join('');
  document.querySelectorAll('[data-delete]').forEach(button=>button.addEventListener('click',()=>deleteEntry(button.dataset.delete)));
  document.querySelectorAll('[data-coach]').forEach(button=>button.addEventListener('click',()=>{coachEntryId=button.dataset.coach;renderCoach()}));
  renderCoach();
}
function ratioTextForEntry(entry){const water=entry.method==='Espresso'&&entry.espresso_yield_g?entry.espresso_yield_g:(entry.water_weight_g||entry.water_volume_ml);if(!entry.bean_weight_g||!water)return '';return `1:${(water/entry.bean_weight_g).toFixed(1)} ratio`}

function renderCoach(){
  const intro=$('coachIntro'), list=$('coachSuggestions'), beans=$('beanSuggestions');
  if(!intro||!list||!beans)return;
  const current=entries.find(entry=>String(entry.id)===String(coachEntryId))||entries[0];
  const rated=entries.filter(entry=>Number(entry.rating)>=4);
  const suggestions=[];
  if(!current){
    intro.textContent='Log and rate a few cups, then this coach can suggest one small change at a time.';
    list.innerHTML='<li>For a balanced starting point, try about a 1:16 coffee-to-water ratio by weight, then adjust to taste.</li><li>Keep the coffee, dose, and method steady while changing one variable between cups.</li>';
  } else {
    const method=String(current.method||'').toLowerCase(), espresso=method.includes('espresso');
    const text=[current.flavor,current.aroma,current.finish,current.notes].filter(Boolean).join(' ').toLowerCase();
    const bitter=Number(current.bitterness_score)>=4||/bitter|harsh|astringent/.test(text);
    const thin=Number(current.body_score)<=2||/thin|watery|weak/.test(text);
    const sour=(Number(current.acidity_score)>=4&&Number(current.sweetness_score)<=2)||/sour|sharp|under.?extract/.test(text);
    const dose=Number(current.bean_weight_g), water=Number(espresso?current.espresso_yield_g:(current.water_weight_g||current.water_volume_ml));
    intro.textContent=`Ideas for ${current.name||'your selected cup'}${current.rating?` (${current.rating}/5)`:''}. Change one thing next time, then compare.`;
    if(espresso){
      if(dose&&water)suggestions.push(`Your dose-to-yield is about 1:${(water/dose).toFixed(1)}. ${bitter?'Try stopping a little earlier, reducing yield by about 0.1 oz, and keep grind and dose steady.':sour||thin?'Try a slightly finer grind while keeping dose and yield the same.':'Keep this ratio as your baseline and change only one setting next time.'}`);
      else suggestions.push('For espresso, record dose, yield, and shot time. A starting yield near twice the dry dose gives you a useful baseline.');
    } else {
      if(bitter)suggestions.push(`The bitter or harsh notes suggest trying a slightly coarser grind next brew. Keep temperature and recipe the same so you can judge the change.`);
      else if(sour)suggestions.push('The sharp or sour notes can come from a cup extracting too quickly. Try a slightly finer grind, changing nothing else.');
      if(thin&&dose&&water&&!bitter){const target=Math.max(1,water*.94);const currentAmount=current.water_weight_g?`${formatAmount(water/GRAMS_PER_OUNCE)} oz`:current.water_volume_ml?`${formatAmount(water/MILLILITERS_PER_FL_OUNCE)} fl oz`:null;const targetAmount=current.water_weight_g?`${formatAmount(target/GRAMS_PER_OUNCE)} oz`:current.water_volume_ml?`${formatAmount(target/MILLILITERS_PER_FL_OUNCE)} fl oz`:null;suggestions.push(`For a fuller cup, keep the coffee dose and reduce water${currentAmount?` from ${currentAmount}`:''}${targetAmount?` to about ${targetAmount}`:' a little'} (roughly 6% less).`)}
      if(!suggestions.length&&current.water_temp_c&&Number(current.water_temp_c)<94)suggestions.push('If the cup tastes sharp or muted, try raising water temperature by 2–4 °F while keeping grind and timing steady.');
      if(!suggestions.length&&current.brew_time_seconds)suggestions.push('No strong taste pattern stands out. Keep this recipe as a baseline and change just one variable, such as grind, by a small step.');
    if(!suggestions.length)suggestions.push('For a balanced starting point, try about a 1:16 coffee-to-water ratio by weight, then adjust to taste. Add taste words or scores to make the next suggestion more specific.');
    }
    if(Number(current.bitterness_score)>=4&&sour)suggestions.push('You noted both sharpness and bitterness; taste is personal. Change only grind first and see which note moves.');
    list.innerHTML=suggestions.slice(0,3).map(item=>`<li>${escapeHTML(item)}</li>`).join('');
  }
  if(rated.length<2){beans.textContent='As you rate more cups, suggestions will use the methods, roast levels, origins, and flavor notes you enjoyed. To explore now: try a washed light roast for crisp, floral cups, or a medium roast for sweeter chocolate and nut notes.';return;}
  const countBy=key=>{const counts={};rated.forEach(entry=>{const value=entry[key];if(value)counts[value]=(counts[value]||0)+1});return Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0]};
  const methods=countBy('method'), roasts=countBy('roast_level');
  const goodText=rated.map(entry=>[entry.flavor,entry.aroma,entry.origin,entry.processing].filter(Boolean).join(' ')).join(' ').toLowerCase();
  const ideas=[];
  if(/berry|fruit|citrus|floral|jasmine/.test(goodText))ideas.push('explore a washed Ethiopia or Kenya for bright fruit and floral notes');
  if(/chocolate|cocoa|nut|caramel|toffee/.test(goodText))ideas.push('try a Brazil or Colombia lot for chocolate, nut, or caramel sweetness');
  if(/wine|ferment|berry|jammy/.test(goodText))ideas.push('sample a natural or honey-processed lot for a fruitier, heavier cup');
  if(!ideas.length)ideas.push('try the same origin or flavor family from a different roaster, changing only one factor at a time');
  beans.textContent=`Patterns in your ${rated.length} highly rated cups${methods?` (often ${methods})`:''}${roasts?` with ${roasts.toLowerCase()} roasts`:''} suggest you may enjoy: ${ideas.slice(0,2).join('; ')}. These are starting points, not guarantees.`;
}

$('search').addEventListener('input',renderEntries);
['beanWeight','waterVolume','waterWeight'].forEach(id=>$(id).addEventListener('input',updateRatio));
$('entryForm').addEventListener('submit',async(event)=>{
  event.preventDefault();if(!user)return;
  const payload={user_id:user.id,name:$('coffeeName').value.trim(),drank_on:$('coffeeDate').value,rating:numberOrNull('rating'),source:textOrNull('source'),method:textOrNull('method'),notes:textOrNull('notes'),roast_date:$('roastDate').value||null};
  TEXT_FIELDS.forEach(([id,column])=>payload[column]=textOrNull(id));
  NUMBER_FIELDS.forEach(([id,column])=>payload[column]=numberForStorage(id));
  const submit=event.submitter;submit.disabled=true;setMessage('entryMessage','Saving this cup…');
  const {error}=await supabase.from('coffee_entries').insert(payload);submit.disabled=false;
  if(error){setMessage('entryMessage',error.message);return}
  event.target.reset();$('coffeeDate').value=localDate();updateRatio();setMessage('entryMessage','Saved to your private journal.',true);await loadEntries();
});
async function deleteEntry(id){if(!confirm('Delete this coffee note?'))return;const {error}=await supabase.from('coffee_entries').delete().eq('id',id);if(error){setMessage('entryMessage',error.message);return}await loadEntries()}

if('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./service-worker.js?v=6').catch(()=>{});
