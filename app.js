import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const config = window.COFFEE_CONFIG || {};
const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.supabaseUrl || '') && /^(sb_publishable_|eyJ)/.test(config.supabaseKey || '') && !String(config.supabaseKey).includes('YOUR_');
const $ = (id) => document.getElementById(id);
const authView = $('authView'), journalView = $('journalView');
let supabase, user, entries = [], authMode = 'login';

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
function ratioText(){const dose=Number($('beanWeight').value);const water=Number($('waterWeight').value||$('waterVolume').value);if(!dose||!water)return 'Add coffee dose and water weight';const ratio=(water/dose).toFixed(1).replace(/\.0$/,'');return `1 : ${ratio}${$('waterWeight').value?'':' approx.'}`}
function updateRatio(){ $('ratioValue').textContent=ratioText(); }

async function loadEntries(){if(!user)return;const {data,error}=await supabase.from('coffee_entries').select('*').order('drank_on',{ascending:false}).order('created_at',{ascending:false});if(error){setMessage('entryMessage',error.message);return}entries=data||[];renderEntries()}
function escapeHTML(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function niceDate(value){return value?new Date(`${value}T12:00:00`).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}):''}
function ratingLabel(value){return value?`${value} out of 5`:''}
function visibleValue(key,value){if(value===null||value===undefined||value==='')return '';if(key==='rating')return `${value}/5`;if(key==='drank_on'||key==='roast_date')return niceDate(value);if(key==='bean_weight_g')return `${value} g`;if(key==='water_volume_ml')return `${value} mL`;if(key==='water_weight_g')return `${value} g`;if(key==='water_temp_c')return `${value} °C`;if(key==='brew_time_seconds'||key==='bloom_seconds')return `${value} sec`;if(key==='pressure_bar')return `${value} bar`;if(key==='espresso_yield_g')return `${value} g`;if(key==='pour_count')return `${value}`;return String(value)}
function field(key,value,wide=false){if(value===null||value===undefined||value==='')return '';return `<div class="entry-detail${wide?' wide':''}"><strong>${escapeHTML(LABELS[key]||key)}</strong><span>${escapeHTML(visibleValue(key,value))}</span></div>`}
function renderEntries(){
  const query=$('search').value.trim().toLowerCase();
  const shown=entries.filter(entry=>Object.values(entry).filter(value=>typeof value==='string'||typeof value==='number').join(' ').toLowerCase().includes(query));
  $('entryCount').textContent=entries.length?`· ${entries.length}`:'';
  if(!shown.length){$('entries').innerHTML=`<div class="empty-state"><span>☕</span><h3>${entries.length?'No cups found':'Your first cup is waiting'}</h3><p>${entries.length?'Try another search.':'Add a note to start your journal.'}</p></div>`;return}
  $('entries').innerHTML=shown.map(entry=>{
    const facts=[entry.bean_weight_g&&`${entry.bean_weight_g} g dose`,entry.water_volume_ml&&`${entry.water_volume_ml} mL water`,entry.water_temp_c&&`${entry.water_temp_c} °C`,entry.grind_type,entry.brew_time_seconds&&`${entry.brew_time_seconds}s`,entry.bean_weight_g&&(entry.water_weight_g||entry.water_volume_ml)&&ratioTextForEntry(entry)].filter(Boolean);
    const detailKeys=['roaster','origin','farm','varietal','processing','roast_level','roast_date','batch_id','bean_weight_g','water_volume_ml','water_weight_g','water_temp_c','water_type','grind_type','grinder','brewer','filter_type','brew_time_seconds','bloom_seconds','pour_count','pressure_bar','espresso_yield_g','brew_recipe','aroma','flavor','acidity_score','sweetness_score','bitterness_score','body_score','finish','notes'];
    const detailHtml=detailKeys.map(key=>field(key,entry[key],['brew_recipe','notes'].includes(key))).join('');
    const sourceLine=[entry.source,entry.origin,entry.roaster].filter(Boolean).join(' · ');
    return `<article class="entry-card"><div><h3>${escapeHTML(entry.name)}</h3><p class="entry-meta">${escapeHTML(niceDate(entry.drank_on))}${entry.method?` · ${escapeHTML(entry.method)}`:''}</p></div><span class="stars" aria-label="${entry.rating?`${entry.rating} out of 5 stars`:'No rating'}">${entry.rating?'★'.repeat(entry.rating)+'☆'.repeat(5-entry.rating):''}</span>${sourceLine?`<p class="entry-source">${escapeHTML(sourceLine)}</p>`:''}${facts.length?`<div class="entry-facts">${facts.map(fact=>`<span class="fact-chip">${escapeHTML(fact)}</span>`).join('')}</div>`:''}<details class="entry-more"><summary>View full brew &amp; tasting details</summary><div class="entry-detail-list">${field('rating',entry.rating)}${field('method',entry.method)}${detailHtml}</div></details><div class="entry-actions"><button class="delete-button" data-delete="${escapeHTML(entry.id)}" aria-label="Delete ${escapeHTML(entry.name)}">Delete</button></div></article>`
  }).join('');
  document.querySelectorAll('[data-delete]').forEach(button=>button.addEventListener('click',()=>deleteEntry(button.dataset.delete)));
}
function ratioTextForEntry(entry){const water=entry.water_weight_g||entry.water_volume_ml;if(!entry.bean_weight_g||!water)return '';return `1:${(water/entry.bean_weight_g).toFixed(1)} ratio`}

$('search').addEventListener('input',renderEntries);
['beanWeight','waterVolume','waterWeight'].forEach(id=>$(id).addEventListener('input',updateRatio));
$('entryForm').addEventListener('submit',async(event)=>{
  event.preventDefault();if(!user)return;
  const payload={user_id:user.id,name:$('coffeeName').value.trim(),drank_on:$('coffeeDate').value,rating:numberOrNull('rating'),source:textOrNull('source'),method:textOrNull('method'),notes:textOrNull('notes'),roast_date:$('roastDate').value||null};
  TEXT_FIELDS.forEach(([id,column])=>payload[column]=textOrNull(id));
  NUMBER_FIELDS.forEach(([id,column])=>payload[column]=numberOrNull(id));
  const submit=event.submitter;submit.disabled=true;setMessage('entryMessage','Saving this cup…');
  const {error}=await supabase.from('coffee_entries').insert(payload);submit.disabled=false;
  if(error){setMessage('entryMessage',error.message);return}
  event.target.reset();$('coffeeDate').value=localDate();updateRatio();setMessage('entryMessage','Saved to your private journal.',true);await loadEntries();
});
async function deleteEntry(id){if(!confirm('Delete this coffee note?'))return;const {error}=await supabase.from('coffee_entries').delete().eq('id',id);if(error){setMessage('entryMessage',error.message);return}await loadEntries()}

if('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
