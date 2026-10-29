const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const money=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const now=new Date(), today=new Date(now.getFullYear(),now.getMonth(),now.getDate());let month=new Date(now.getFullYear(),now.getMonth(),1),page='overview',filter='all',search='';
const key='kostrapi-v1';const defaultTemplate='Halo Kak {nama}, semoga kabarnya baik 😊\n\nMengingatkan sewa kamar {kamar} untuk bulan {bulan} sebesar {nominal}, jatuh tempo pada {tanggal}.\n\nSetelah transfer, boleh kirim bukti pembayarannya ya, Kak. Terima kasih 🙏';
const builtInTemplates = () => [
 {id:'rent',name:'Pengingat pembayaran',body:'Halo Kak {nama}, semoga kabarnya baik 😊\n\nMengingatkan sewa kamar {kamar} untuk periode {periode} ({tenure}) sebesar {nominal}, jatuh tempo pada {tanggal}.\n\nSetelah transfer, boleh kirim bukti pembayarannya ya, Kak. Terima kasih 🙏'},
 {id:'renewal',name:'Konfirmasi perpanjangan',body:'Halo Kak {nama}, periode sewa kamar {kamar} berakhir pada {akhir}. Kakak mau ambil sewa dengan tenure yang sama ({tenure}) atau ganti ke 3, 6, atau 12 bulan?\n\nBoleh kabari pilihannya ya, Kak. Terima kasih 😊'},
 {id:'late',name:'Tindak lanjut pembayaran',body:'Halo Kak {nama}, izin menanyakan pembayaran sewa kamar {kamar} untuk periode {periode} sebesar {nominal}, dengan jatuh tempo {tanggal}.\n\nKalau sudah transfer, boleh kirim bukti pembayarannya ya, Kak. Terima kasih 🙏'}
];
let selectedTemplate='rent';
function seed(){return {rooms:Array.from({length:8},(_,i)=>({id:'r'+(i+1),name:'A'+String(i+1).padStart(2,'0'),price:i>3?1500000:1250000,note:i>3?'Lantai 2 · AC · Kamar mandi dalam':'Lantai 1 · Kamar mandi dalam'})),tenants:[['Nadia Putri','081200000001',1,Math.max(1,now.getDate()-5)],['Rizky Pratama','081200000002',2,now.getDate()],['Dinda Maharani','081200000003',3,Math.min(28,now.getDate()+2)],['Fajar Ramadhan','081200000004',4,Math.min(28,now.getDate()+3)],['Ayu Lestari','081200000005',5,5],['Bima Saputra','081200000006',6,10]].map((t,i)=>({id:'t'+(i+1),name:t[0],phone:t[1],room:'r'+t[2],day:t[3],term:i===4?3:i===5?6:1,start:localDate(new Date(now.getFullYear(),now.getMonth(),1))})),payments:[{id:'p1',tenant:'t5',period:period(),months:3,status:'paid',amount:4500000,date:localDate(today),note:'Pembayaran contoh',receipt:null},{id:'p2',tenant:'t6',period:period(),months:6,status:'review',amount:9000000,date:localDate(today),note:'Bukti diterima via WhatsApp (contoh)',receipt:null}],reminders:[],template:defaultTemplate};}
function localDate(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function period(){return `${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,'0')}`}
let state;try{state=JSON.parse(localStorage.getItem(key))||seed()}catch{state=seed()}
function migrateState(data) {
 if(!Array.isArray(data.templates)||!data.templates.length){
  data.templates=builtInTemplates();
  if(data.template && data.template!==defaultTemplate)data.templates[0].body=data.template;
 }
 data.tenants.forEach(t=>{t.term=Billing.term(t)});
 data.payments.forEach(p=>{p.months=Billing.count(p)});
 return data;
}
state=migrateState(state);
function mutateAndSave(change) {
 const previous=JSON.stringify(state);
 change();
 if(save())return true;
 state=JSON.parse(previous);
 return false;
}
function periodName(value){return Billing.date(value,1).toLocaleDateString('id-ID',{month:'long',year:'numeric'})}
function rangeLabel(start,months){return months===1?periodName(start):periodName(start)+' – '+periodName(Billing.shift(start,months-1))}
function termEnd(tenant,start,months){const next=Billing.date(Billing.shift(start,months),tenant.day);next.setDate(next.getDate()-1);return next}
const dateLabel=date=>date.toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
const cycle=t=>Billing.cycle(t,period());
const monthlyDue=t=>payment(t)?Billing.monthlyAmount(payment(t)):room(t).price;
const termOptions=selected=>Billing.termOptions.map(n=>`<option value="${n}" ${Number(selected)===n?'selected':''}>${n} bulan${n===1?' (bulanan)':''}</option>`).join('');
function save(){try{localStorage.setItem(key,JSON.stringify(state));return true}catch{toast('Penyimpanan penuh. Coba bukti dengan ukuran lebih kecil.');return false}}
function toast(msg){$('#toast').textContent=msg;$('#toast').style.display='block';clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>$('#toast').style.display='none',3500)}
const room=t=>state.rooms.find(r=>r.id===t.room)||{name:'—',price:0};
const payment=t=>Billing.findPayment(state.payments,t.id,period());
const due=t=>payment(t)?Billing.date(payment(t).period,t.day):cycle(t).due;
const days=t=>Math.round((due(t)-today)/86400000);
function status(t){const p=payment(t);return p?p.status:days(t)<0?'late':days(t)<=3?'soon':'unpaid'}
function activeTenants(){return state.tenants.filter(t=>t.start<=localDate(new Date(month.getFullYear(),month.getMonth()+1,0)))}
function dueText(t){let d=days(t);return d<0?`${Math.abs(d)} hari terlambat`:d===0?'Jatuh tempo hari ini':d===1?'Jatuh tempo besok':`${d} hari lagi`}
function badge(t){let s=status(t);return `<span class="badge ${s}">${s==='paid'?(Billing.count(payment(t))>1?'Lunas · prabayar':'Lunas'):s==='review'?'Perlu verifikasi':dueText(t)}</span>`}
const initials=t=>t.name.split(' ').slice(0,2).map(n=>n[0]).join('');
const names={overview:['Selamat datang kembali ☀','Yuk, lihat apa yang perlu diperhatikan hari ini.','Ringkasan'],reminders:['Pengingat sewa','Pesan yang tepat, untuk penghuni yang tepat.','Pengingat sewa'],tenants:['Penghuni','Kenali siapa yang membuat kost ini terasa seperti rumah.','Penghuni'],rooms:['Kamar','Semua ruang dan penghuninya, dalam satu tempat.','Kamar'],payments:['Pembayaran','Catat transfer, periksa bukti, lalu tandai lunas.','Pembayaran'],settings:['Pengaturan pesan','Buat pengingat yang terasa ramah dan personal.','Pengaturan pesan']};
function go(p){page=p;filter='all';search='';render()}
function render(){const a=activeTenants(),pending=a.filter(t=>!['paid','review'].includes(status(t))&&days(t)<=3).sort((a,b)=>due(a)-due(b));const paid=a.filter(t=>status(t)==='paid');$('#title').textContent=names[page][0];$('#subtitle').textContent=names[page][1];$('#breadcrumb').innerHTML=`Kost Keluarga <span>/</span> ${names[page][2]}`;$$('[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===page));$('#nav-count').textContent=pending.length;$('#month').textContent=month.toLocaleDateString('id-ID',{month:'long',year:'numeric'});$('#today').textContent='Hari ini, '+today.toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});$('#top-add').textContent=page==='rooms'?'＋ Tambah kamar':'＋ Tambah penghuni';$('#top-add').style.visibility=page==='settings'?'hidden':'visible';let html='';
if(page==='overview'){
 const total=a.reduce((s,t)=>s+monthlyDue(t),0), received=paid.reduce((s,t)=>s+Billing.monthlyAmount(payment(t)),0), left=total-received;
 html=`<div class="stats">${stat('Sewa bulan ini',money(received),'↙',`Alokasi bulanan · ${paid.length} dari ${a.length} lunas`)}${stat('Belum terkumpul',money(left),'◷','Termasuk pembayaran perlu verifikasi')}${stat('Perlu diingatkan',pending.length+' penghuni','♧','Jatuh tempo hingga 3 hari ke depan')}${stat('Kamar terisi',state.tenants.length+' <small>/ '+state.rooms.length+'</small>','▤',`${state.rooms.length-state.tenants.length} kamar tersedia`)}</div><div class="grid"><div><section class="panel"><div class="panel-head"><div><h2>Waktunya mengingatkan <span style="color:#a8af9d">↗</span></h2><p>Satu pesan kecil, satu urusan beres.</p></div><button class="text-button" onclick="go('reminders')">Lihat semua →</button></div>${tabs()}<div id="queue">${queue(pending)}</div></section><section class="panel"><div class="panel-head"><div><h2>Pembayaran perlu diperiksa</h2><p>Pastikan dana masuk sebelum menandai lunas.</p></div><span class="badge review">${a.filter(t=>status(t)==='review').length} pembayaran</span></div>${a.filter(t=>status(t)==='review').map(t=>row(t,'review')).join('')||empty('Semua bukti pembayaran sudah diperiksa. ✓')}</section></div><div class="right-col"><div class="callout"><span class="big-icon">✳</span><h3>Tak perlu ingat semuanya.</h3><p>Pengingat sudah disiapkan. Tinggal periksa pesannya, lalu buka WhatsApp.</p><button onclick="go('reminders')">Siapkan pengingat &nbsp; ↗</button></div><section class="panel"><div class="panel-head"><h2>Pembayaran bulan ini</h2><span style="color:#a4b297">◔</span></div><div class="summary-body"><strong>${total?Math.round(received/total*100):0}% <small>terkumpul</small></strong><div class="progress"><span style="width:${total?Math.min(100,received/total*100):0}%"></span></div><div class="legend"><span>● ${paid.length} lunas</span><span>${a.length-paid.length} belum lunas</span></div><div class="hint">Pembayaran beberapa bulan dialokasikan ke setiap bulan yang ditanggung, bukan seluruhnya ke bulan transfer.</div></div></section><section class="panel"><div class="panel-head"><h2>Catatan kecil</h2></div><div class="activity"><p><span class="activity-dot"></span>${state.reminders.filter(r=>(r.viewPeriod||r.period)===period()).length} pengingat ditandai terkirim</p><small>Konfirmasi pengiriman dicatat manual.</small></div></section></div></div>`;
}else if(page==='reminders'){html=`<div class="notice">✳ &nbsp; Pesan siap pakai untuk jatuh tempo hingga 3 hari ke depan. Buka WhatsApp, kirim pesannya, lalu tandai sudah dikirim di sini. Belum ada pengiriman otomatis.</div><section class="panel"><div class="panel-head"><div><h2>Antrean pengingat</h2><p>${pending.length} penghuni perlu diingatkan bulan ini</p></div><button class="text-button" onclick="go('settings')">Edit template →</button></div>${tabs()}<div id="queue">${queue(pending)}</div></section>`;
}else if(page==='tenants'){html=`<section class="panel"><div class="toolbar"><input type="search" placeholder="Cari nama atau kamar…" aria-label="Cari penghuni" oninput="search=this.value;renderTenants()"><span class="badge paid">${state.tenants.length} penghuni aktif</span></div><div class="table-wrap" id="tenant-table"></div></section>`;
}else if(page==='rooms'){html=`<div class="notice">${state.rooms.length} kamar · ${state.tenants.length} terisi · ${state.rooms.length-state.tenants.length} tersedia</div><div class="rooms">${state.rooms.map(r=>{let t=state.tenants.find(t=>t.room===r.id);return `<article class="room"><span>▤</span><div class="room-bottom"><h3>Kamar ${esc(r.name)}</h3><span class="badge ${t?'paid':'soon'}">${t?'Terisi':'Tersedia'}</span></div><p>${esc(r.note)}</p><b>${money(r.price)} <small style="font-weight:400;color:#969e8b">/ bulan</small></b><div class="room-bottom"><span style="font-size:11px;color:#8c957f">${t?esc(t.name):'Siap untuk penghuni baru'}</span><button class="text-button" onclick="editRoom('${r.id}')">Edit →</button></div></article>`}).join('')}</div>`;
}else if(page==='payments'){html=paymentsHTML(a);
}else{html=settingsHTML()}
 $('#content').innerHTML=html;if(page==='tenants')renderTenants();}
function stat(label,value,icon,note){return `<div class="stat"><div class="stat-top">${label}<span class="stat-icon">${icon}</span></div><strong>${value}</strong><small>${note}</small></div>`}
function tabs(){return `<div class="tabs">${[['all','Semua'],['late','Terlambat'],['soon','Segera jatuh tempo']].map(([id,label])=>`<button class="${filter===id?'active':''}" onclick="filter='${id}';render()">${label}</button>`).join('')}</div>`}
function empty(s){return `<div class="empty">${s}</div>`}
function queue(list){list=list.filter(t=>filter==='all'||status(t)===filter);return list.map(t=>row(t)).join('')||empty('Tidak ada pengingat di kategori ini. Semua rapi! ✓')}
function row(t,mode){
 const bill=cycle(t),p=payment(t),sent=state.reminders.find(r=>r.tenant===t.id&&r.period===bill.period);
 const detail=mode?rangeLabel(p.period,Billing.count(p)):sent?'Ditandai terkirim '+new Date(sent.date).toLocaleDateString('id-ID',{day:'numeric',month:'short'}):Billing.term(t)+' bulan · jatuh tempo '+dateLabel(bill.due);
 return `<div class="tenant-row"><span class="avatar sage">${esc(initials(t))}</span><div class="tenant-info"><b>${esc(t.name)}</b><small>Kamar ${esc(room(t).name)} · ${esc(detail)}</small></div><div class="tenant-amount"><b>${money(p?p.amount:room(t).price*bill.months)}</b>${badge(t)}</div><button class="remind" onclick="${mode?'pay':'reminder'}('${t.id}')">${mode?'Periksa bukti →':'◌ Ingatkan'}</button></div>`;
}
function renderTenants(){
 const list=state.tenants.filter(t=>(t.name+' '+room(t).name).toLowerCase().includes(search.toLowerCase()));
 $('#tenant-table').innerHTML=`<table><thead><tr><th>PENGHUNI</th><th>KAMAR / SEWA BULANAN</th><th>TENURE</th><th>PERPANJANGAN BERIKUTNYA</th><th></th></tr></thead><tbody>${list.map(t=>`<tr><td><b>${esc(t.name)}</b><small>${esc(t.phone)}</small></td><td>${esc(room(t).name)}<small>${money(room(t).price)} / bulan</small></td><td><span class="badge paid">${Billing.term(t)} bulan</span><small>${money(room(t).price*Billing.term(t))} / periode</small></td><td>${dateLabel(nextDeadline(t))}<small>Awal periode: ${dateLabel(cycle(t).due)}</small></td><td><div class="table-actions"><button class="text-button" onclick="reminder('${t.id}')">Siapkan pesan</button><button class="text-button" onclick="editTenant('${t.id}')">Edit →</button></div></td></tr>`).join('')}</tbody></table>${list.length?'':empty('Penghuni tidak ditemukan.')}`;
}
function nextDeadline(t){const p=payment(t);return p?.status==='paid'?Billing.date(Billing.shift(p.period,Billing.count(p)),t.day):cycle(t).next}
function paymentsHTML(tenants){
 return `<div class="notice">↙ &nbsp; Tampilan per bulan: pembayaran 3, 6, atau 12 bulan muncul di setiap bulan yang ditanggung. Total transfer disimpan satu kali; angka ringkasan adalah alokasi untuk bulan yang dipilih.</div><section class="panel"><div class="panel-head"><div><h2>Catatan sewa · ${periodName(period())}</h2><p>Pilih pembayaran untuk melihat periode yang ditanggung, total transfer, dan buktinya.</p></div></div><div class="table-wrap"><table><thead><tr><th>PENGHUNI / KAMAR</th><th>ALOKASI BULAN INI</th><th>PERIODE PEMBAYARAN</th><th>STATUS</th><th>TINDAKAN</th></tr></thead><tbody>${tenants.map(t=>{const p=payment(t),bill=cycle(t);return `<tr><td><b>${esc(t.name)}</b><small>Kamar ${esc(room(t).name)} · tenure ${Billing.term(t)} bulan</small></td><td><b>${money(monthlyDue(t))}</b><small>${p?'Bagian dari transfer '+money(p.amount):'Belum ada pembayaran'}</small></td><td>${rangeLabel(p?.period||bill.period,p?Billing.count(p):bill.months)}<small>${p?Billing.count(p)+' bulan · transfer '+esc(p.date):'Jatuh tempo '+dateLabel(bill.due)}</small></td><td>${badge(t)}</td><td><button class="remind" onclick="pay('${t.id}')">${status(t)==='paid'?'Lihat catatan':status(t)==='review'?'Periksa bukti':'Catat pembayaran'}</button></td></tr>`}).join('')}</tbody></table></div>${tenants.length?'':empty('Belum ada penghuni pada bulan ini.')}</section>`;
}
function modal(title,html){$('#modal-title').textContent=title;$('#modal-body').innerHTML=html;$('#modal').showModal()}
function closeModal(){$('#modal').close()}
function editTenant(id){
 const t=state.tenants.find(x=>x.id===id),available=state.rooms.filter(r=>!state.tenants.some(x=>x.room===r.id&&x.id!==id));
 if(!available.length){toast('Tambahkan kamar tersedia terlebih dahulu.');return}
 const anchor=t?.termStart|| (t?localDate(Billing.date(t.start.slice(0,7),t.day)):localDate(today));
 modal(t?'Edit penghuni':'Penghuni baru',`<form id="tenant-form"><div class="form-grid"><label class="full">Nama lengkap<input name="name" required maxlength="70" value="${esc(t?.name||'')}" placeholder="Contoh: Nadia Putri"></label><label class="full">Nomor WhatsApp<input name="phone" type="tel" required pattern="[0-9+ ]{9,20}" value="${esc(t?.phone||'')}" placeholder="08… atau +62…"></label><label>Kamar<select name="room">${available.map(r=>`<option value="${r.id}" ${t?.room===r.id?'selected':''}>${esc(r.name)} · ${money(r.price)}</option>`).join('')}</select></label><label>Tenure / lama sewa<select name="term" id="tenant-term">${termOptions(t?Billing.term(t):1)}</select></label><label>Mulai menghuni<input type="date" name="start" required value="${t?.start||localDate(today)}"></label><label>Awal periode sewa ini<input type="date" name="termStart" required value="${anchor}"></label></div><div class="hint" id="term-preview" aria-live="polite"></div><p style="font-size:10px">Jatuh tempo dihitung dari awal periode, berulang setiap tenure. Tanggal 29–31 menyesuaikan akhir bulan. Saat mengganti tenure, isi awal periode perpanjangan yang baru. Catatan pembayaran lama tetap tersimpan.</p><div class="actions"><button type="button" class="secondary" onclick="closeModal()">Batal</button><button class="primary">Simpan penghuni</button></div></form>`);
 const form=$('#tenant-form');
 function preview(){const anchor=form.elements.termStart.value,months=Number(form.elements.term.value),r=state.rooms.find(r=>r.id===form.elements.room.value);if(!anchor)return;const day=Number(anchor.slice(8,10)),next=Billing.date(Billing.shift(anchor.slice(0,7),months),day),end=new Date(next);end.setDate(end.getDate()-1);$('#term-preview').innerHTML=`${months} bulan · ${money(r.price*months)} / periode<br>Periode: ${dateLabel(Billing.date(anchor.slice(0,7),day))} – ${dateLabel(end)}<br><b>Perpanjangan / jatuh tempo berikutnya: ${dateLabel(next)}</b>`}
 form.oninput=preview;form.onchange=preview;
 form.elements.start.onchange=()=>{if(!t)form.elements.termStart.value=form.elements.start.value;preview()};preview();
 form.onsubmit=e=>{e.preventDefault();const f=new FormData(form),termStart=f.get('termStart'),data={id:id||crypto.randomUUID(),name:f.get('name').trim(),phone:f.get('phone').trim(),room:f.get('room'),day:t&&termStart===anchor?t.day:Number(termStart.slice(8,10)),term:Number(f.get('term')),termStart,start:f.get('start')};if(!data.name)return;if(data.termStart<data.start)return toast('Awal periode tidak boleh sebelum mulai menghuni.');if(mutateAndSave(()=>{if(t)Object.assign(state.tenants.find(item=>item.id===id),data);else state.tenants.push(data)})){closeModal();render();toast('Data penghuni dan tenure tersimpan.')}};
}
function editRoom(id){let r=state.rooms.find(r=>r.id===id);modal(r?'Edit kamar':'Kamar baru',`<form id="room-form"><label>Nomor / nama kamar<input name="name" required maxlength="20" value="${esc(r?.name||'')}" placeholder="A09"></label><label>Sewa bulanan (Rp)<input name="price" type="number" required min="1" step="1" value="${r?.price||1250000}"></label><label>Fasilitas / catatan<input name="note" maxlength="150" value="${esc(r?.note||'')}"></label>${r?'<p style="font-size:11px">Perubahan harga berlaku pada tagihan yang belum dicatat. Nominal pembayaran tersimpan tetap dipertahankan.</p>':''}<div class="actions"><button type="button" class="secondary" onclick="closeModal()">Batal</button><button class="primary">Simpan kamar</button></div></form>`);$('#room-form').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),name=f.get('name').trim();if(!name)return;if(state.rooms.some(x=>x.id!==id&&x.name.toLowerCase()===name.toLowerCase()))return toast('Nama kamar sudah digunakan.');let d={id:id||crypto.randomUUID(),name,price:Number(f.get('price')),note:f.get('note').trim()};r?Object.assign(r,d):state.rooms.push(d);if(save()){closeModal();render();toast('Kamar tersimpan.')}}}
function message(t,templateId=selectedTemplate){
 const template=state.templates.find(item=>item.id===templateId)||state.templates[0],bill=cycle(t),p=payment(t);
 const start=p?.status==='paid'?Billing.shift(p.period,Billing.count(p)):bill.period;
 const end=termEnd(t,p?.period||bill.period,p?Billing.count(p):bill.months);
 const values={nama:t.name,kamar:room(t).name,bulan:periodName(start),periode:rangeLabel(start,bill.months),nominal:money(room(t).price*bill.months),tanggal:dateLabel(Billing.date(start,t.day)),tenure:bill.months+' bulan',akhir:dateLabel(end)};
 return template.body.replace(/\{(nama|kamar|bulan|periode|nominal|tanggal|tenure|akhir)\}/g,(_,key)=>values[key]);
}
function templateOptions(selected){return state.templates.map(item=>`<option value="${esc(item.id)}" ${item.id===selected?'selected':''}>${esc(item.name)}</option>`).join('')}
function settingsHTML(){
 const current=state.templates.find(item=>item.id===selectedTemplate)||state.templates[0];selectedTemplate=current.id;
 return `<section class="panel"><div class="settings-body"><div class="settings-title"><h2 style="font:700 16px Manrope">Template chat WhatsApp</h2><button class="secondary" onclick="newTemplate()">＋ Template baru</button></div><p>Pilih template untuk pengingat, perpanjangan, atau tindak lanjut. Semua dapat disesuaikan.</p><label>Pilih template<select id="settings-template" onchange="selectedTemplate=this.value;render()">${templateOptions(current.id)}</select></label><label>Nama template<input id="template-name" maxlength="70" value="${esc(current.name)}"></label><label>Isi pesan<textarea id="template" rows="9">${esc(current.body)}</textarea></label><p class="template-tokens">Variabel: {nama}, {kamar}, {bulan}, {periode}, {nominal}, {tanggal}, {tenure}, {akhir}.</p><div class="actions template-actions"><button class="danger" onclick="deleteTemplate()" ${state.templates.length===1?'disabled':''}>Hapus template</button><button class="primary" onclick="saveTemplate()">Simpan template</button></div><div class="hint">{nominal} adalah total sewa satu tenure. {akhir} adalah akhir periode saat ini; template perpanjangan dapat dipakai meski sewa sudah lunas.<br>Pengiriman dan konfirmasi tetap manual. Belum ada notifikasi saat situs ditutup.</div><h3 style="margin-top:30px">Data prototipe</h3><p>Data dan bukti disimpan di browser ini. Ekspor JSON untuk menyimpan salinan.</p><button class="secondary" onclick="exportData()">↓ Ekspor data</button></div></section>`;
}
function newTemplate(){modal('Template chat baru',`<form id="template-form"><label>Nama template<input name="name" required maxlength="70" placeholder="Misalnya: Konfirmasi tenure baru"></label><label>Isi pesan<textarea name="body" required rows="7" placeholder="Halo Kak {nama}, …"></textarea></label><p style="font-size:11px">Variabel: {nama}, {kamar}, {periode}, {nominal}, {tanggal}, {tenure}, {akhir}.</p><div class="actions"><button type="button" class="secondary" onclick="closeModal()">Batal</button><button class="primary">Simpan template baru</button></div></form>`);$('#template-form').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),data={id:crypto.randomUUID(),name:f.get('name').trim(),body:f.get('body').trim()};if(!data.name||!data.body)return;if(mutateAndSave(()=>state.templates.push(data))){selectedTemplate=data.id;closeModal();go('settings');toast('Template baru tersimpan.')}}}
function deleteTemplate(){if(state.templates.length===1)return;modal('Hapus template?',`<p>Template ini akan dihapus. Pesan yang sudah ditandai terkirim tetap tersimpan.</p><div class="actions"><button class="secondary" onclick="closeModal()">Batal</button><button class="primary" id="confirm-delete">Hapus template</button></div>`);$('#confirm-delete').onclick=()=>{if(mutateAndSave(()=>state.templates=state.templates.filter(t=>t.id!==selectedTemplate))){selectedTemplate=state.templates[0].id;closeModal();render();toast('Template dihapus.')}}}

function reminder(id){
 const t=state.tenants.find(t=>t.id===id);
 if(!state.templates.some(item=>item.id===selectedTemplate))selectedTemplate=state.templates[0].id;
 modal('Siapkan pesan WhatsApp',`<div class="message-recipient"><b>${esc(t.name)} · Kamar ${esc(room(t).name)}</b><small>${esc(t.phone)} · tenure ${Billing.term(t)} bulan</small></div><label>Pilih template chat<select id="message-template">${templateOptions(selectedTemplate)}</select></label><label>Pesan yang akan dikirim<textarea id="message" rows="9">${esc(message(t))}</textarea></label><p style="font-size:10px">Mengganti template mengisi ulang isi pesan. Periksa penerima dan tekan Kirim di WhatsApp. Jangan kirim ke nomor data contoh.</p><div class="actions" style="flex-wrap:wrap"><button class="secondary" id="copy-message">Salin pesan</button><button class="primary" id="open-wa">Buka WhatsApp ↗</button></div><div class="actions"><button class="text-button" onclick="markSent('${id}')">Saya sudah mengirim pesan ✓</button><button class="text-button" onclick="closeModal();go('settings')">Kelola template</button></div>`);
 $('#message-template').onchange=e=>{selectedTemplate=e.target.value;$('#message').value=message(t)};
 $('#copy-message').onclick=async()=>{try{await navigator.clipboard.writeText($('#message').value);toast('Pesan disalin.')}catch{$('#message').select();toast('Pilih dan salin teks pesan.')}};
 $('#open-wa').onclick=()=>{let phone=t.phone.replace(/\D/g,'');if(phone.startsWith('0'))phone='62'+phone.slice(1);window.open('https://wa.me/'+phone+'?text='+encodeURIComponent($('#message').value),'_blank','noopener,noreferrer')};
}
function markSent(id){
 const t=state.tenants.find(t=>t.id===id),entry={tenant:id,period:cycle(t).period,viewPeriod:period(),templateId:$('#message-template').value,message:$('#message').value,date:new Date().toISOString()};
 if(mutateAndSave(()=>state.reminders.push(entry))){closeModal();render();toast('Pesan ditandai sudah dikirim.')}
}
function pay(id){
 const t=state.tenants.find(t=>t.id===id),p=payment(t),bill=cycle(t);
 if(p?.status==='paid'){
  modal('Pembayaran tercatat',`<div class="message-recipient"><b>${esc(t.name)} · Kamar ${esc(room(t).name)}</b><small>${rangeLabel(p.period,Billing.count(p))} · ${Billing.count(p)} bulan</small></div><span class="badge paid">Lunas${Billing.count(p)>1?' · prabayar':''}</span><div class="payment-money">${money(p.amount)} <small>total transfer</small></div><div class="hint"><b>${periodName(period())}: ${money(Billing.monthlyAmount(p))}</b><br>Alokasi sama untuk setiap bulan yang ditanggung. Transfer dicatat satu kali, pada ${esc(p.date)}.</div><p>${esc(p.note)}</p>${p.receipt?`<img class="receipt-img" src="${p.receipt}" alt="Bukti pembayaran">`:empty('Tidak ada lampiran bukti.')}<p style="font-size:10px">Membatalkan status lunas mengembalikan seluruh ${Billing.count(p)} bulan pada catatan ini ke perlu verifikasi.</p><div class="actions"><button class="danger" onclick="undoPayment('${id}')">Batalkan status lunas</button><button class="primary" onclick="closeModal()">Selesai</button></div>`);return;
 }
 const savedRate=p?Billing.monthlyAmount(p):room(t).price;
 modal(p?'Periksa pembayaran':'Catat pembayaran',`<div class="message-recipient"><b>${esc(t.name)} · Kamar ${esc(room(t).name)}</b><small>Sewa ${money(savedRate)} / bulan · tenure ${Billing.term(t)} bulan</small></div><form id="pay-form"><div class="form-grid"><label>Mulai bulan yang dibayar<input type="month" name="period" required min="${t.start.slice(0,7)}" value="${p?.period||bill.period}"></label><label>Jumlah bulan dibayar<input type="number" name="months" required min="1" max="12" step="1" value="${p?Billing.count(p):bill.months}"></label></div><div class="hint" id="coverage-preview" aria-live="polite"></div><div class="form-grid" style="margin-top:15px"><label>Total nominal transfer (Rp)<input type="number" name="amount" required min="1" step="1" value="${p?.amount||room(t).price*bill.months}"></label><label>Tanggal transfer<input type="date" name="date" required max="${localDate(today)}" value="${p?.date||localDate(today)}"></label></div><label style="margin-top:15px">Catatan<input name="note" maxlength="200" value="${esc(p?.note||'')}" placeholder="Nama pengirim / catatan transfer"></label><label>Bukti transfer (JPG / PNG / WebP, maks. 1 MB)<input type="file" id="receipt" accept="image/jpeg,image/png,image/webp"></label>${p?.receipt?`<img class="receipt-img" src="${p.receipt}" alt="Bukti transfer terlampir">`:''}<p style="font-size:10px">Periksa mutasi rekening sebelum menandai lunas. Satu transfer dibagi ke setiap bulan yang ditanggung; cicilan dan diskon belum didukung.</p><p class="form-error" id="payment-error" role="alert"></p><div class="actions"><button type="submit" name="action" value="review" class="secondary">Simpan untuk diperiksa</button><button type="submit" name="action" value="paid" class="primary">Dana masuk · tandai lunas</button></div></form>`);
 const form=$('#pay-form');
 function preview(updateAmount=false){const months=Number(form.elements.months.value),start=form.elements.period.value;if(!start||!Number.isInteger(months)||months<1||months>12)return;const expected=savedRate*months;if(updateAmount)form.elements.amount.value=expected;$('#coverage-preview').innerHTML=`<b>${rangeLabel(start,months)} · ${months} bulan</b><br>${money(savedRate)} per bulan × ${months} = ${money(expected)}<br>Muncul sebagai ${money(savedRate)} di setiap bulan yang ditanggung.`}
 form.elements.months.oninput=()=>preview(true);form.elements.period.oninput=()=>preview();preview();
 let submitting=false;
 form.onsubmit=async e=>{
  e.preventDefault();if(submitting)return;
  const f=new FormData(form),action=e.submitter.value,amount=Number(f.get('amount')),months=Number(f.get('months')),start=f.get('period');
  const fail=msg=>{$('#payment-error').textContent=msg};
  if(!Number.isInteger(months)||months<1||months>12)return fail('Pilih 1 hingga 12 bulan.');
  if(start<t.start.slice(0,7))return fail('Bulan pembayaran tidak boleh sebelum mulai menghuni.');
  if(!Billing.includes({period:start,months},period()))return fail('Periode harus mencakup bulan yang sedang dilihat. Pindah bulan untuk mencatat periode lain.');
  if(amount!==savedRate*months)return fail('Total harus sama dengan '+money(savedRate)+' × '+months+' bulan.');
  const data={id:p?.id||crypto.randomUUID(),tenant:id,period:start,months,status:action,amount,date:f.get('date'),note:f.get('note').trim(),receipt:p?.receipt||null};
  if(Billing.overlaps(state.payments,data))return fail('Ada bulan yang sudah tercatat pada pembayaran lain. Pilih periode yang tidak tumpang tindih.');
  submitting=true;const buttons=[...form.querySelectorAll('button')];buttons.forEach(button=>button.disabled=true);
  try{
   const file=$('#receipt').files[0];
   if(file){
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>1024*1024){fail('Gunakan JPG, PNG, atau WebP maksimal 1 MB.');return}
    data.receipt=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file)});
   }
   if(mutateAndSave(()=>{state.payments=state.payments.filter(item=>item.id!==data.id);state.payments.push(data)})){closeModal();render();toast(action==='paid'?'Pembayaran '+months+' bulan ditandai lunas.':'Pembayaran disimpan untuk diperiksa.')}
  }catch{fail('Bukti gagal dibaca. Pilih ulang berkas dan coba lagi.')}
  finally{submitting=false;buttons.forEach(button=>button.disabled=false)}
 };
}
function undoPayment(id){
 const p=payment(state.tenants.find(t=>t.id===id));
 if(mutateAndSave(()=>state.payments.find(item=>item.id===p.id).status='review')){closeModal();render();toast('Seluruh '+Billing.count(p)+' bulan kembali perlu verifikasi.')}
}
function saveTemplate(){
 const name=$('#template-name').value.trim(),body=$('#template').value.trim();if(!name||!body)return toast('Isi nama dan pesan template terlebih dahulu.');
 if(mutateAndSave(()=>{const item=state.templates.find(t=>t.id===selectedTemplate);item.name=name;item.body=body})){render();toast('Template chat tersimpan.')}
}
function exportData(){let blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='kost-rapi-'+localDate(today)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
$$('[data-page]').forEach(b=>b.onclick=()=>go(b.dataset.page));$('#top-add').onclick=()=>page==='rooms'?editRoom():editTenant();$('#close').onclick=closeModal;$('#modal').onclick=e=>{if(e.target===$('#modal')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal()}};$('#prev').onclick=()=>{month=new Date(month.getFullYear(),month.getMonth()-1,1);render()};$('#next').onclick=()=>{month=new Date(month.getFullYear(),month.getMonth()+1,1);render()};render();
