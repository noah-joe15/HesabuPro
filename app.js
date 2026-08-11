// =====================================================
// HesabuPro — Invoice & Receipt Generator
// EDIT THESE BEFORE DEPLOYING:
const CONFIG = {
  mpesaNumber: '0766 347 833',        // <-- YOUR M-Pesa number
  whatsapp: '255766347833',           // <-- YOUR WhatsApp (intl format, no +)
  price: 'TZS 5,200 ($2)',
  freeLimit: 3,
  site: 'hesabupro.pages.dev'         // fallback only
};
// Auto-detect your Cloudflare / GitHub domain
CONFIG.site = (location.hostname && location.hostname.indexOf('localhost') === -1 && location.protocol !== 'file:')
  ? location.hostname
  : CONFIG.site;

// ============ LICENSE CODE SYSTEM (checksum) ============
const SALT = "HSP-TZ-2026-MERINK";
const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function fnv(s){let h=0x811c9dc5;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}return h>>>0;}
function block(n,l){let s="";for(let i=0;i<l;i++){s+=ALPHA[n%32];n=Math.floor(n/32);}return s;}
function verifyCode(code){
  const m=String(code).trim().toUpperCase().replace(/\s/g,"").match(/^HSP-([A-Z0-9]{4})-([A-Z0-9]{4})$/);
  if(!m) return false;
  return block(fnv(m[1]+SALT),4)===m[2];
}

// ============ STATE ============
const state = {
  premium: localStorage.getItem('hsp_premium')==='1',
  color: localStorage.getItem('hsp_color') || '#0B3457',
  logo: localStorage.getItem('hsp_logo') || null,
  mode: 'invoice'
};

// ============ HELPERS ============
function v(id){const el=document.getElementById(id);return el?el.value.trim():'';}
function esc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function fmt(n){return 'TZS '+(Number(n)||0).toLocaleString();}
function hexToRgb(h){const m=h.replace('#','');return{r:parseInt(m.substr(0,2),16),g:parseInt(m.substr(2,2),16),b:parseInt(m.substr(4,2),16)};}
function subtotal(){let s=0;document.querySelectorAll('#itemsBody tr').forEach(tr=>{
  const q=parseFloat(tr.querySelector('.it-qty').value)||0;
  const p=parseFloat(tr.querySelector('.it-price').value)||0;
  s+=q*p;});return s;}

// ============ ITEMS ============
function addItemRow(desc='',qty=1,price=0){
  const tr=document.createElement('tr');
  tr.innerHTML =
    '<td><input class="input it-desc" placeholder="Item / service"></td>'+
    '<td style="width:60px"><input class="input it-qty" type="number" min="1" value="'+qty+'"></td>'+
    '<td style="width:110px"><input class="input it-price" type="number" min="0" value="'+price+'"></td>'+
    '<td style="width:36px"><button class="row-del" title="Remove">×</button></td>';
  tr.querySelectorAll('input').forEach(i=>i.addEventListener('input',refresh));
  tr.querySelector('.row-del').addEventListener('click',()=>{tr.remove();refresh();});
  document.getElementById('itemsBody').appendChild(tr);
  if(desc) tr.querySelector('.it-desc').value=desc;
}
function readItems(){
  const arr=[];
  document.querySelectorAll('#itemsBody tr').forEach(tr=>{
    arr.push({desc:tr.querySelector('.it-desc').value,
              qty:parseFloat(tr.querySelector('.it-qty').value)||0,
              price:parseFloat(tr.querySelector('.it-price').value)||0});
  });
  return arr;
}

// ============ USAGE LIMIT ============
function usage(){
  const key=new Date().getFullYear()+'-'+(new Date().getMonth()+1);
  let u=JSON.parse(localStorage.getItem('hsp_usage')||'null');
  if(!u||u.month!==key) u={month:key,count:0};
  return u;
}
function updateUsageNote(){
  const el=document.getElementById('usageNote');
  if(state.premium){el.textContent='Premium: unlimited documents';return;}
  const u=usage();const left=Math.max(0,CONFIG.freeLimit-u.count);
  el.textContent='Free plan: '+left+' of '+CONFIG.freeLimit+' documents left this month';
}

// ============ PREVIEW ============
function renderPreview(){
  const p=document.getElementById('preview');
  const items=readItems();
  const sub=subtotal();
  const vatAmt=sub*(parseFloat(v('vat'))||0)/100;
  const tot=sub+vatAmt;
  const c=state.color;
  p.innerHTML =
  '<div class="p-head" style="background:'+c+'">'+
    (state.logo?'<img class="p-logo" src="'+state.logo+'">':'')+
    '<div class="p-biz"><b>'+esc(v('biz_name')||'Your Business')+'</b>'+
    '<span>'+esc([v('biz_addr'),'TIN: '+v('biz_tin'),v('biz_phone'),v('biz_email')].filter(Boolean).join(' · '))+'</span></div>'+
    '<div class="p-title"><b>'+(state.mode==='receipt'?'RECEIPT':'INVOICE')+'</b>'+
    '<span>#'+esc(v('inv_no'))+'</span><span>'+esc(v('inv_date'))+'</span>'+
    (state.mode!=='receipt'?'<span>Due: '+esc(v('inv_due'))+'</span>':'')+'</div>'+
  '</div>'+
  '<div class="p-billto"><small>Bill To</small><b>'+esc(v('cli_name')||'—')+'</b>'+
  '<span>'+esc([v('cli_phone'),v('cli_addr')].filter(Boolean).join(' · '))+'</span></div>'+
  '<table class="p-items"><thead><tr style="background:'+c+'">'+
  '<th>#</th><th>Description</th><th style="text-align:right">Qty</th><th style="text-align:right">Unit</th><th style="text-align:right">Amount</th></tr></thead><tbody>'+
  items.map((it,i)=>'<tr><td>'+(i+1)+'</td><td>'+esc(it.desc)+'</td><td class="r">'+it.qty+'</td><td class="r">'+fmt(it.price)+'</td><td class="r">'+fmt(it.qty*it.price)+'</td></tr>').join('')+
  '</tbody></table>'+
  '<div class="p-totals"><table>'+
  '<tr><td>Subtotal</td><td style="text-align:right">'+fmt(sub)+'</td></tr>'+
  '<tr><td>VAT</td><td style="text-align:right">'+fmt(vatAmt)+'</td></tr>'+
  '<tr class="p-total-row" style="background:'+c+'"><td>TOTAL</td><td style="text-align:right">'+fmt(tot)+'</td></tr>'+
  '</table></div>'+
  (v('notes')?'<p class="p-notes">'+esc(v('notes'))+'</p>':'')+
    (state.mode==='receipt'?'<img src="paid-stamp.png" alt="PAID" style="position:absolute;top:42%;left:50%;transform:translate(-50%,-50%);width:min(150px,40%);opacity:.92;pointer-events:none;">':'')+
  (!state.premium?'<div class="p-watermark">HesabuPro</div><div class="p-freefoot">Free plan — remove watermark: '+CONFIG.site+'</div>':'');
}
function refresh(){renderPreview();}

// ============ PAID STAMP IMAGE ============
var _stampCache = null;
function getPaidStamp(cb){
  if (_stampCache) return cb(_stampCache);
  var img = document.getElementById('paidStampImg');
  if (!img) return cb(null);
  function done(){
    try{
      var cnv = document.createElement('canvas');
      cnv.width = img.naturalWidth || 500;
      cnv.height = img.naturalHeight || 500;
      cnv.getContext('2d').drawImage(img, 0, 0);
      _stampCache = cnv.toDataURL('image/png');
      cb(_stampCache);
    }catch(e){ cb(null); }
  }
  if (img.complete && img.naturalWidth) done();
  else { img.onload = done; img.onerror = function(){ cb(null); }; }
}

// ============ RESET AFTER DOWNLOAD ============
function resetForm(){
  // clear business + client + notes
  ['biz_name','biz_tin','biz_phone','biz_email','biz_addr',
   'cli_name','cli_phone','cli_addr','notes'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.value='';
  });
  document.getElementById('vat').value='0';
  // fresh document meta
  document.getElementById('inv_no').value='INV-'+Date.now().toString().slice(-6);
  var today=new Date();
  document.getElementById('inv_date').value=today.toISOString().split('T')[0];
  var due=new Date(Date.now()+7*86400000);
  document.getElementById('inv_due').value=due.toISOString().split('T')[0];
  // one empty item row
  document.getElementById('itemsBody').innerHTML='';
  addItemRow();
  // forget saved business info so even a reload starts fresh
  localStorage.removeItem('hsp_business');
  refresh();
}

// ============ PDF ============
function downloadPDF(){
  const u=usage();
  if(!state.premium && u.count>=CONFIG.freeLimit){openUnlock();return;}
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF('p','mm','a4');
  const W=210,M=14,c=hexToRgb(state.color);
  doc.setFillColor(c.r,c.g,c.b);doc.rect(0,0,W,34,'F');
  let x=M;
  if(state.logo){try{doc.addImage(state.logo,'PNG',M,7,20,20);x=M+24;}catch(e){}}
  doc.setTextColor(255);doc.setFont('helvetica','bold');doc.setFontSize(14);
  doc.text(v('biz_name')||'Your Business',x,14);
  doc.setFont('helvetica','normal');doc.setFontSize(8.5);
  doc.text([v('biz_addr'),'TIN: '+v('biz_tin'),v('biz_phone'),v('biz_email')].filter(Boolean).join('  ·  '),x,20);
  doc.setFont('helvetica','bold');doc.setFontSize(16);
  doc.text(state.mode==='receipt'?'RECEIPT':'INVOICE',W-M,14,{align:'right'});
  doc.setFontSize(9);doc.setFont('helvetica','normal');
  doc.text('# '+v('inv_no'),W-M,20,{align:'right'});
  doc.text('Date: '+v('inv_date'),W-M,25,{align:'right'});
   if(state.mode==='receipt'){
    if(_stampCache){
      // real red PAID stamp image (already tilted in the artwork)
      doc.addImage(_stampCache,'PNG', W/2-27, 108, 54, 54, undefined,'FAST');
    } else {
      doc.setDrawColor(20,80,126);doc.setTextColor(20,80,126);doc.setLineWidth(1.2);
      doc.roundedRect(W/2-25,118,50,16,3,3);
      doc.setFont('helvetica','bold');doc.setFontSize(18);
      doc.text('PAID',W/2,128.5,{align:'center'});
    }
  }
  if(!state.premium){
    doc.setTextColor(228);doc.setFont('helvetica','bold');doc.setFontSize(34);
    doc.text('HesabuPro',W/2,150,{align:'center',angle:45});
    doc.setFontSize(8.5);doc.setTextColor(150);
    doc.text('Free plan — remove watermark at '+CONFIG.site,W/2,290,{align:'center'});
  }
    doc.save((v('inv_no')||'invoice')+'.pdf');
  if(!state.premium){u.count++;localStorage.setItem('hsp_usage',JSON.stringify(u));}
  updateUsageNote();
  resetForm();   // start clean for the next customer
}

// ============ UNLOCK ============
function openUnlock(){
  document.getElementById('priceTag').textContent=CONFIG.price;
  document.getElementById('priceTag2').textContent=CONFIG.price;
  document.getElementById('mpesaNo').textContent=CONFIG.mpesaNumber;
  document.getElementById('unlockModal').hidden=false;
}
function closeUnlock(){document.getElementById('unlockModal').hidden=true;}
function tryUnlock(){
  const msg=document.getElementById('unlockMsg');
  if(verifyCode(document.getElementById('codeInput').value)){
    state.premium=true;localStorage.setItem('hsp_premium','1');
    applyTier();closeUnlock();refresh();updateUsageNote();
  }else{
    msg.textContent='Invalid code. Check it and try again.';msg.className='msg err';
  }
}
function applyTier(){
  const badge=document.getElementById('tierBadge');
  if(state.premium){
    badge.textContent='PREMIUM';badge.className='tier-badge premium';
    document.getElementById('unlockBtn').style.display='none';
    document.getElementById('colorInput').disabled=false;
    document.getElementById('logoInput').disabled=false;
    document.getElementById('colorInput').value=state.color;
  }
}

// ============ INIT ============
function init(){
  const today=new Date();
  document.getElementById('inv_date').value=today.toISOString().split('T')[0];
  const due=new Date(Date.now()+7*86400000);
  document.getElementById('inv_due').value=due.toISOString().split('T')[0];
  document.getElementById('inv_no').value='INV-'+Date.now().toString().slice(-6);
  try{
    const b=JSON.parse(localStorage.getItem('hsp_business')||'{}');
    ['biz_name','biz_tin','biz_phone','biz_email','biz_addr'].forEach(id=>{if(b[id])document.getElementById(id).value=b[id];});
  }catch(e){}
  ['biz_name','biz_tin','biz_phone','biz_email','biz_addr'].forEach(id=>{
    document.getElementById(id).addEventListener('input',()=>{
      const o={};['biz_name','biz_tin','biz_phone','biz_email','biz_addr'].forEach(k=>o[k]=v(k));
      localStorage.setItem('hsp_business',JSON.stringify(o));refresh();
    });
  });
  ['cli_name','cli_phone','cli_addr','inv_no','inv_date','inv_due','vat','notes'].forEach(id=>{
    document.getElementById(id).addEventListener('input',refresh);
  });
  document.getElementById('mode').addEventListener('change',e=>{state.mode=e.target.value;refresh();});
  document.getElementById('addItemBtn').addEventListener('click',()=>addItemRow());
  document.getElementById('downloadBtn').addEventListener('click',downloadPDF);
  document.getElementById('colorInput').addEventListener('input',e=>{
    state.color=e.target.value;localStorage.setItem('hsp_color',state.color);refresh();
  });
  document.getElementById('logoInput').addEventListener('change',e=>{
    const f=e.target.files[0];if(!f)return;
    const fr=new FileReader();
    fr.onload=ev=>{const img=new Image();
      img.onload=()=>{const cnv=document.createElement('canvas');
        const s=Math.min(1,300/img.width);cnv.width=img.width*s;cnv.height=img.height*s;
        cnv.getContext('2d').drawImage(img,0,0,cnv.width,cnv.height);
        state.logo=cnv.toDataURL('image/png');localStorage.setItem('hsp_logo',state.logo);refresh();};
      img.src=ev.target.result;};
    fr.readAsDataURL(f);
  });
  document.getElementById('mpesaRef').addEventListener('input',e=>{
    const ref=e.target.value.trim();
    document.getElementById('waLink').href=
      'https://wa.me/'+CONFIG.whatsapp+'?text='+encodeURIComponent('Hello, I paid '+CONFIG.price+' for HesabuPro Premium. M-Pesa ref: '+ref);
  });
    getPaidStamp(function(){});  // warm the cache so the PDF is instant
  addItemRow();
