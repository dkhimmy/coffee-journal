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
$('authForm').addEventListener('submit',async(e)=>{e.preventDefault();if(!configured){setMessage('authMessage','Add your Supabase URL and publishable key in config.js first.');return}const email=$('email').value.trim(),password=$('password').value;$('authSubmit').disabled=true;setMessage('authMessage','Working…');try{const result=authMode==='signup'?await supabase.auth.signUp({email,password}):await supabase.auth.signInWithPassword({email,password});if(result.error)throw result.error;if(authMode==='signup'&&!result.data.session)setMessage('authMessage','Account started. Check your email for a confirmation link, then sign in.',true);else if(result.data.session){user=result.data.user;showJournal()}}catch(err){setMessage('authMessage',err.message||'Could not sign in. Please try again.')}finally{$('authSubmit').disabled=false}});
$('signOut').addEventListener('click',async()=>{await supabase.auth.signOut();entries=[];showAuth()});

async function loadEntries(){if(!user)return;const {data,error}=await supabase.from('coffee_entries').select('id,name,drank_on,rating,source,method,notes,created_at').order('drank_on',{ascending:false}).order('created_at',{ascending:false});if(error){setMessage('entryMessage',error.message);return}entries=data||[];renderEntries()}
function escapeHTML(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function renderEntries(){const query=$('search').value.trim().toLowerCase();const shown=entries.filter(e=>[e.name,e.source,e.method,e.notes].join(' ').toLowerCase().includes(query));$('entryCount').textContent=entries.length?`· ${entries.length}`:'';if(!shown.length){$('entries').innerHTML=`<div class="empty-state"><span>☕</span><h3>${entries.length?'No cups found':'Your first cup is waiting'}</h3><p>${entries.length?'Try another search.':'Add a note to start your journal.'}</p></div>`;return} $('entries').innerHTML=shown.map(e=>`<article class="entry-card"><div><h3>${escapeHTML(e.name)}</h3><p class="entry-meta">${new Date(`${e.drank_on}T12:00:00`).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'})}${e.method?` · ${escapeHTML(e.method)}`:''}</p></div><span class="stars" aria-label="${e.rating?`${e.rating} out of 5 stars`:'No rating'}">${e.rating?'★'.repeat(e.rating)+'☆'.repeat(5-e.rating):''}</span>${e.notes?`<p class="entry-notes">${escapeHTML(e.notes)}</p>`:''}${e.source?`<p class="entry-source">From ${escapeHTML(e.source)}</p>`:''}<div class="entry-actions"><button class="delete-button" data-delete="${escapeHTML(e.id)}" aria-label="Delete ${escapeHTML(e.name)}">Delete</button></div></article>`).join('');document.querySelectorAll('[data-delete]').forEach(btn=>btn.addEventListener('click',()=>deleteEntry(btn.dataset.delete)))}
$('search').addEventListener('input',renderEntries);
$('entryForm').addEventListener('submit',async(e)=>{e.preventDefault();if(!user)return;const payload={user_id:user.id,name:$('coffeeName').value.trim(),drank_on:$('coffeeDate').value,rating:$('rating').value?Number($('rating').value):null,source:$('source').value.trim()||null,method:$('method').value||null,notes:$('notes').value.trim()||null};const submit=e.submitter;submit.disabled=true;setMessage('entryMessage','Saving…');const {error}=await supabase.from('coffee_entries').insert(payload);submit.disabled=false;if(error){setMessage('entryMessage',error.message);return}e.target.reset();$('coffeeDate').value=localDate();setMessage('entryMessage','Saved to your private journal.',true);await loadEntries()});
async function deleteEntry(id){if(!confirm('Delete this coffee note?'))return;const {error}=await supabase.from('coffee_entries').delete().eq('id',id);if(error){setMessage('entryMessage',error.message);return}await loadEntries()}

if('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
