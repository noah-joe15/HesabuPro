// =====================================================
// HesabuPro — Invoice & Receipt Generator (FULL)
// =====================================================
const CONFIG = {
  mpesaNumber: '0766 347 833',
  whatsapp: '255766347833',
  price: 'TZS 5,200 ($2)',
  freeLimit: 3,
  site: 'hesabupro.pages.dev'
};
(function(){
  var h = location.hostname, p = location.pathname;
  if (h && h.indexOf('localhost') === -1 && location.protocol !== 'file:') {
    CONFIG.site = h + (h.indexOf('github.io') !== -1 ? p.replace(/\/+$/, '') : '');
  }
})();

// ============ LICENSE CODE SYSTEM ============
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
  sig: localStorage.getItem('hsp_sig') || null,
  mode: 'invoice'
};

// ============ HELPERS ============
function v(id){const el=document.getElementById(id);return el?el.value.trim():'';}
function esc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function cur(){return v('currency')||'TZS';}
function fmt(n){return cur()+' '+(Number(n)||0).toLocaleString();}
function hexToRgb(h){const m=h.replace('#','');return{r:parseInt(m.substr(0,2),16),g:parseInt(m.substr(2,2),16),b:parseInt(m.substr(4,2),16)};}
function docTitle(){return {invoice:'INVOICE',receipt:'RECEIPT',quote:'QUOTE',estimate:'ESTIMATE'}[state.mode]||'INVOICE';}
function lineTotal(it){return (it.qty*it.price)*(1-(it.disc||0)/100);}
function subtotal(){let s=0;readItems().forEach(function(it){s+=lineTotal(it);});return s;}

// ============ ITEMS (with discount) ============
function addItemRow(desc,qty,price,disc){
  desc=desc||'';qty=qty||1;price=price||0;disc=disc||0;
  const tr=document.createElement('tr');
  tr.innerHTML =
    '<td><input class="input it-desc" placeholder="Item / service"></td>'+
    '<td style="width:56px"><input class="input it-qty" type="number" min="1" value="'+qty+'"></td>'+
    '<td style="width:100px"><input class="input it-price" type="number" min="0" value="'+price+'"></td>'+
    '<td style="width:56px"><input class="input it-disc" type="number" min="0" max="100" value="'+disc+'"></td>'+
    '<td style="width:36px"><button class="row-del" title="Remove">×</button></td>';
  tr.querySelectorAll('input').forEach(function(i){i.addEventListener('input',refresh);});
  tr.querySelector('.row-del').addEventListener('click',function(){tr.remove();refresh();});
  document.getElementById('itemsBody').appendChild(tr);
  if(desc) tr.querySelector('.it-desc').value=desc;
}
function readItems(){
  const arr=[];
  document.querySelectorAll('#itemsBody tr').forEach(function(tr){
    arr.push({desc:tr.querySelector('.it-desc').value,
              qty:parseFloat(tr.querySelector('.it-qty').value)||0,
              price:parseFloat(tr.querySelector('.it-price').value)||0,
              disc:parseFloat(tr.querySelector('.it-disc').value)||0});
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

// ============ PAID STAMP ============
var _stampCache = null;
function getPaidStamp(cb){
  if (_stampCache) return cb(_stampCache);
  var img = document.getElementById('paidStampImg');
  if (!img) return cb(null);
  function done(){
    try{
      var cnv=document.createElement('canvas');
      cnv.width=img.naturalWidth||500; cnv.height=img.naturalHeight||500;
      cnv.getContext('2d').drawImage(img,0,0);
      _stampCache=cnv.toDataURL('image/png');
      cb(_stampCache);
    }catch(e){ cb(null); }
  }
  if (img.complete && img.naturalWidth) done();
  else { img.onload=done; img.onerror=function(){cb(null);}; }
}

// ============ PREVIEW ============
function renderPreview(){
  const p=document.getElementById('preview');
  const items=readItems();
  const sub=subtotal();
  const vatAmt=sub*(parseFloat(v('vat'))||0)/100;
  const tot=sub+vatAmt;
  const c=state.color;
  const prem=state.premium;
  let html='';
  if(prem&&v('custom_header')) html+='<div style="background:'+c+';color:#FFFFF0;padding:6px 16px;font-size:10.5px;">'+esc(v('custom_header'))+'</div>';
  html+='<div class="p-head" style="background:'+c+'">'+
    (state.logo?'<img class="p-logo" src="'+state.logo+'">':'')+
    '<div class="p-biz"><b>'+esc(v('biz_name')||'Your Business')+'</b>'+
    '<span>'+esc([v('biz_addr'),'TIN: '+v('biz_tin'),v('biz_phone'),v('biz_email')].filter(Boolean).join(' · '))+'</span></div>'+
    '<div class="p-title"><b>'+docTitle()+'</b>'+
    '<span>#'+esc(v('inv_no'))+'</span><span>'+esc(v('inv_date'))+'</span>'+
    (state.mode!=='receipt'?'<span>'+(state.mode==='quote'||state.mode==='estimate'?'Valid until: ':'Due: ')+esc(v('inv_due'))+'</span>':'')+'</div>'+
  '</div>'+
  '<div class="p-billto"><small>Bill To</small><b>'+esc(v('cli_name')||'—')+'</b>'+
  '<span>'+esc([v('cli_phone'),v('cli_email'),v('cli_addr')].filter(Boolean).join(' · '))+'</span></div>'+
  '<table class="p-items"><thead><tr style="background:'+c+'">'+
  '<th>#</th><th>Description</th><th style="text-align:right">Qty</th><th style="text-align:right">Unit</th><th style="text-align:right">Disc%</th><th style="text-align:right">Amount</th></tr></thead><tbody>'+
  items.map(function(it,i){return '<tr><td>'+(i+1)+'</td><td>'+esc(it.desc)+'</td><td class="r">'+it.qty+'</td><td class="r">'+fmt(it.price)+'</td><td class="r">'+(it.disc||0)+'%</td><td class="r">'+fmt(lineTotal(it))+'</td></tr>';}).join('')+
  '</tbody></table>'+
  '<div class="p-totals"><table>'+
  '<tr><td>Subtotal</td><td style="text-align:right">'+fmt(sub)+'</td></tr>'+
  '<tr><td>VAT</td><td style="text-align:right">'+fmt(vatAmt)+'</td></tr>'+
  '<tr class="p-total-row" style="background:'+c+'"><td>TOTAL</td><td style="text-align:right">'+fmt(tot)+'</td></tr>'+
  '</table></div>';
  const termsTxt=v('terms_text')||v('terms');
  if(prem&&termsTxt) html+='<div class="p-billto"><small>Payment Terms</small><span>'+esc(termsTxt)+'</span></div>';
  const bankLines=[v('bank_name'),v('bank_account')&&'A/C: '+v('bank_account'),v('bank_swift')&&'SWIFT: '+v('bank_swift'),v('bank_branch')].filter(Boolean);
  if(prem&&bankLines.length) html+='<div class="p-billto"><small>Bank Details</small><span>'+esc(bankLines.join(' · '))+'</span></div>';
  if(v('notes')) html+='<p class="p-notes">'+esc(v('notes'))+'</p>';
  if(prem&&(v('sig_name')||state.sig)) html+='<div style="text-align:right;padding:10px 16px;">'+(state.sig?'<img src="'+state.sig+'" style="height:38px;"><br>':'')+'<span style="border-top:1px solid #999;display:inline-block;padding-top:4px;font-size:11px;">'+esc(v('sig_name'))+(v('sig_title')?' — '+esc(v('sig_title')):'')+'</span></div>';
  if(state.mode==='receipt') html+='<img src="paid-stamp.png" alt="PAID" style="position:absolute;top:42%;left:50%;transform:translate(-50%,-50%);width:min(150px,40%);opacity:.92;pointer-events:none;">';
  if(prem&&v('custom_footer')) html+='<div style="text-align:center;padding:8px 16px;font-size:9.5px;color:#51626f;">'+esc(v('custom_footer'))+'</div>';
  if(!prem) html+='<div class="p-watermark">HesabuPro</div><div class="p-freefoot">Free plan — remove watermark: '+CONFIG.site+'</div>';
  p.innerHTML=html;
}
function refresh(){renderPreview();}

// ============ RESET AFTER DOWNLOAD ============
function resetForm(){
  ['biz_name','biz_tin','biz_phone','biz_email','biz_addr',
   'cli_name','cli_phone','cli_addr','cli_email','notes'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.value='';
  });
  document.getElementById('vat').value='0';
  document.getElementById('inv_no').value='INV-'+Date.now().toString().slice(-6);
  var today=new Date();
  document.getElementById('inv_date').value=today.toISOString().split('T')[0];
  var due=new Date(Date.now()+7*86400000);
  document.getElementById('inv_due').value=due.toISOString().split('T')[0];
  document.getElementById('itemsBody').innerHTML='';
  addItemRow();
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
  const prem=state.premium;
  doc.setFillColor(c.r,c.g,c.b);doc.rect(0,0,W,34,'F');
  let x=M;
  if(state.logo){try{doc.addImage(state.logo,'PNG',M,7,20,20);x=M+24;}catch(e){}}
  doc.setTextColor(255);doc.setFont('helvetica','bold');doc.setFontSize(14);
  doc.text(v('biz_name')||'Your Business',x,14);
  doc.setFont('helvetica','normal');doc.setFontSize(8.5);
  doc.text([v('biz_addr'),'TIN: '+v('biz_tin'),v('biz_phone'),v('biz_email')].filter(Boolean).join('  ·  '),x,20);
  doc.setFont('helvetica','bold');doc.setFontSize(16);
  doc.text(docTitle(),W-M,14,{align:'right'});
  doc.setFontSize(9);doc.setFont('helvetica','normal');
  doc.text('# '+v('inv_no'),W-M,20,{align:'right'});
  doc.text('Date: '+v('inv_date'),W-M,25,{align:'right'});
  if(state.mode!=='receipt')doc.text((state.mode==='quote'||state.mode==='estimate'?'Valid until: ':'Due: ')+v('inv_due'),W-M,30,{align:'right'});
  let y=40;
  if(prem&&v('custom_header')){doc.setTextColor(c.r,c.g,c.b);doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text(doc.splitTextToSize(v('custom_header'),W-2*M),M,y);y+=8;}
  doc.setTextColor(30);doc.setFont('helvetica','bold');doc.setFontSize(9);
  doc.text('BILL TO',M,y);y+=5;
  doc.setFont('helvetica','normal');
  doc.text(v('cli_name')||'—',M,y);y+=4.5;
  doc.text([v('cli_phone'),v('cli_email'),v('cli_addr')].filter(Boolean).join('  ·  '),M,y);y+=6;
  const items=readItems();
  doc.autoTable({
    startY:y,
    head:[['#','Description','Qty','Unit Price','Disc%','Amount']],
    body:items.map(function(it,i){return [i+1,it.desc,it.qty,fmt(it.price),(it.disc||0)+'%',fmt(lineTotal(it))];}),
    theme:'striped',
    headStyles:{fillColor:[c.r,c.g,c.b]},
    styles:{fontSize:9,cellPadding:2.5},
    columnStyles:{0:{cellWidth:8},2:{hAlign:'right',cellWidth:12},3:{hAlign:'right',cellWidth:28},4:{hAlign:'right',cellWidth:14},5:{hAlign:'right',cellWidth:30}},
    margin:{left:M,right:M}
  });
  y=doc.lastAutoTable.finalY+6;
  const sub=subtotal(),vatAmt=sub*(parseFloat(v('vat'))||0)/100,tot=sub+vatAmt;
  doc.setFontSize(9);doc.setTextColor(60);
  doc.text('Subtotal',W-M-40,y);doc.text(fmt(sub),W-M,y,{align:'right'});y+=5;
  doc.text('VAT ('+(parseFloat(v('vat'))||0)+'%)',W-M-40,y);doc.text(fmt(vatAmt),W-M,y,{align:'right'});y+=6;
  doc.setFillColor(c.r,c.g,c.b);doc.rect(W-M-46,y-4,46,8,'F');
  doc.setTextColor(255);doc.setFont('helvetica','bold');
  doc.text('TOTAL',W-M-42,y+1.5);doc.text(fmt(tot),W-M-2,y+1.5,{align:'right'});
  y+=10;
  const termsTxt=v('terms_text')||v('terms');
  if(prem&&termsTxt){doc.setTextColor(60);doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.text('Payment terms: '+termsTxt,M,y);y+=6;}
  const bankLines=[v('bank_name'),v('bank_account')&&'A/C: '+v('bank_account'),v('bank_swift')&&'SWIFT: '+v('bank_swift'),v('bank_branch')].filter(Boolean);
  if(prem&&bankLines.length){doc.setTextColor(60);doc.setFontSize(8.5);doc.text('Bank: '+bankLines.join('  ·  '),M,y);y+=6;}
  if(v('notes')){doc.setTextColor(90);doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.text(doc.splitTextToSize(v('notes'),W-2*M),M,y);y+=10;}
  if(prem&&(v('sig_name')||state.sig)){
    const sy=Math.max(y+6,240);
    if(state.sig){try{doc.addImage(state.sig,'PNG',W-M-45,sy-12,45,16);}catch(e){}}
    doc.setDrawColor(120);doc.setLineWidth(0.3);
    doc.line(W-M-50,sy+2,W-M,sy+2);
    doc.setTextColor(60);doc.setFontSize(8.5);
    doc.text(v('sig_name')+(v('sig_title')?' — '+v('sig_title'):''),W-M-50,sy+7);
  }
  if(state.mode==='receipt'){
    if(_stampCache){doc.addImage(_stampCache,'PNG',W/2-27,108,54,54,undefined,'FAST');}
    else{doc.setDrawColor(20,80,126);doc.setTextColor(20,80,126);doc.setLineWidth(1.2);doc.roundedRect(W/2-25,118,50,16,3,3);doc.setFont('helvetica','bold');doc.setFontSize(18);doc.text('PAID',W/2,128.5,{align:'center'});}
  }
  if(prem&&v('custom_footer')){doc.setTextColor(120);doc.setFontSize(8);doc.text(v('custom_footer'),W/2,290,{align:'center'});}
  if(!prem){
    doc.setTextColor(228);doc.setFont('helvetica','bold');doc.setFontSize(34);
    doc.text('HesabuPro',W/2,150,{align:'center',angle:45});
    doc.setFontSize(8.5);doc.setTextColor(150);
    doc.text('Free plan — remove watermark at '+CONFIG.site,W/2,290,{align:'center'});
  }
  doc.save((v('inv_no')||'invoice')+'.pdf');
  if(!prem){u.count++;localStorage.setItem('hsp_usage',JSON.stringify(u));}
  updateUsageNote();
  resetForm();
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
    ['colorInput','logoInput','terms','terms_text','bank_name','bank_account','bank_swift','bank_branch','custom_header','custom_footer','sig_name','sig_title','sigImage'].forEach(function(id){
      var el=document.getElementById(id); if(el) el.disabled=false;
    });
    document.getElementById('colorInput').value=state.color;
  }
}

// ============ INIT ============
var EXTRA=['terms','terms_text','bank_name','bank_account','bank_swift','bank_branch','custom_header','custom_footer','sig_name','sig_title'];
function init(){
  const today=new Date();
  document.getElementById('inv_date').value=today.toISOString().split('T')[0];
  const due=new Date(Date.now()+7*86400000);
  document.getElementById('inv_due').value=due.toISOString().split('T')[0];
  document.getElementById('inv_no').value='INV-'+Date.now().toString().slice(-6);
  try{
    const b=JSON.parse(localStorage.getItem('hsp_business')||'{}');
    ['biz_name','biz_tin','biz_phone','biz_email','biz_addr'].forEach(function(id){if(b[id])document.getElementById(id).value=b[id];});
  }catch(e){}
  try{
    const ex=JSON.parse(localStorage.getItem('hsp_extra')||'{}');
    EXTRA.forEach(function(id){if(ex[id]!=null)document.getElementById(id).value=ex[id];});
  }catch(e){}
  ['biz_name','biz_tin','biz_phone','biz_email','biz_addr'].forEach(function(id){
    document.getElementById(id).addEventListener('input',function(){
      const o={};['biz_name','biz_tin','biz_phone','biz_email','biz_addr'].forEach(function(k){o[k]=v(k);});
      localStorage.setItem('hsp_business',JSON.stringify(o));refresh();
    });
  });
  EXTRA.forEach(function(id){
    var el=document.getElementById(id);
    function save(){
      const o={};EXTRA.forEach(function(k){o[k]=v(k);});
      localStorage.setItem('hsp_extra',JSON.stringify(o));refresh();
    }
    el.addEventListener('input',save);
    el.addEventListener('change',save);
  });
  ['cli_name','cli_phone','cli_addr','cli_email','inv_no','inv_date','inv_due','vat','notes','currency'].forEach(function(id){
    document.getElementById(id).addEventListener('input',refresh);
    document.getElementById(id).addEventListener('change',refresh);
  });
  document.getElementById('mode').addEventListener('change',function(e){state.mode=e.target.value;refresh();});
  document.getElementById('addItemBtn').addEventListener('click',function(){addItemRow();});
  document.getElementById('downloadBtn').addEventListener('click',downloadPDF);
  document.getElementById('colorInput').addEventListener('input',function(e){
    state.color=e.target.value;localStorage.setItem('hsp_color',state.color);refresh();
  });
  document.getElementById('logoInput').addEventListener('change',function(e){
    const f=e.target.files[0];if(!f)return;
    const fr=new FileReader();
    fr.onload=function(ev){const img=new Image();
      img.onload=function(){const cnv=document.createElement('canvas');
        const s=Math.min(1,300/img.width);cnv.width=img.width*s;cnv.height=img.height*s;
        cnv.getContext('2d').drawImage(img,0,0,cnv.width,cnv.height);
        state.logo=cnv.toDataURL('image/png');localStorage.setItem('hsp_logo',state.logo);refresh();};
      img.src=ev.target.result;};
    fr.readAsDataURL(f);
  });
  document.getElementById('sigImage').addEventListener('change',function(e){
    const f=e.target.files[0];if(!f)return;
    const fr=new FileReader();
    fr.onload=function(ev){const img=new Image();
      img.onload=function(){const cnv=document.createElement('canvas');
        const s=Math.min(1,300/img.width);cnv.width=img.width*s;cnv.height=img.height*s;
        cnv.getContext('2d').drawImage(img,0,0,cnv.width,cnv.height);
        state.sig=cnv.toDataURL('image/png');localStorage.setItem('hsp_sig',state.sig);refresh();};
      img.src=ev.target.result;};
    fr.readAsDataURL(f);
  });
  document.getElementById('mpesaRef').addEventListener('input',function(e){
    const ref=e.target.value.trim();
    document.getElementById('waLink').href=
      'https://wa.me/'+CONFIG.whatsapp+'?text='+encodeURIComponent('Hello, I paid '+CONFIG.price+' for HesabuPro Premium. M-Pesa ref: '+ref);
  });
  getPaidStamp(function(){});
  addItemRow();
  applyTier();
  updateUsageNote();
  renderPreview();
}
init();
