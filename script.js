const STORAGE_KEY = 'prestamosEquiposTecnologicos';
let equipment = loadEquipment();
const form = document.querySelector('#equipmentForm');
const fields = {
  editingId: document.querySelector('#editingId'), code: document.querySelector('#code'),
  type: document.querySelector('#type'), model: document.querySelector('#model'),
  responsible: document.querySelector('#responsible'), loanDate: document.querySelector('#loanDate'),
  returnDate: document.querySelector('#returnDate'), status: document.querySelector('#status'), notes: document.querySelector('#notes')
};
function loadEquipment(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function saveEquipment(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(equipment)); }
function normalize(value){ return value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
function escapeHTML(value=''){ const div=document.createElement('div'); div.textContent=value; return div.innerHTML; }
function formatDate(value){ if(!value)return 'Sin fecha'; return new Date(`${value}T00:00:00`).toLocaleDateString('es-PE'); }
function notify(message){
  const box=document.querySelector('#notification'); box.textContent=message; box.classList.add('show');
  clearTimeout(notify.timer); notify.timer=setTimeout(()=>box.classList.remove('show'),2400);
}
function updateStats(){
  document.querySelector('#totalCount').textContent=equipment.length;
  document.querySelector('#availableCount').textContent=equipment.filter(item=>item.status==='Disponible').length;
  document.querySelector('#loanedCount').textContent=equipment.filter(item=>item.status==='Prestado').length;
  document.querySelector('#maintenanceCount').textContent=equipment.filter(item=>item.status==='Mantenimiento').length;
}
function render(){
  const query=normalize(document.querySelector('#searchInput').value);
  const filter=document.querySelector('#statusFilter').value;
  const filtered=equipment.filter(item=>{
    const matches=[item.code,item.type,item.model,item.responsible].some(value=>normalize(value||'').includes(query));
    return matches && (filter==='Todos'||item.status===filter);
  });
  const list=document.querySelector('#equipmentList');
  document.querySelector('#emptyState').classList.toggle('hidden',filtered.length>0);
  list.innerHTML=filtered.map(item=>`
    <article class="equipment-card">
      <div>
        <div class="meta"><span class="badge type">${escapeHTML(item.type)}</span><span class="badge ${normalize(item.status)}">${escapeHTML(item.status)}</span></div>
        <h3>${escapeHTML(item.code)} · ${escapeHTML(item.model)}</h3>
        <p><strong>Responsable:</strong> ${escapeHTML(item.responsible||'Sin asignar')}</p>
        <p><strong>Préstamo:</strong> ${formatDate(item.loanDate)} · <strong>Devolución:</strong> ${formatDate(item.returnDate)}</p>
        ${item.notes?`<p><strong>Observaciones:</strong> ${escapeHTML(item.notes)}</p>`:''}
      </div>
      <div class="card-actions"><button onclick="editEquipment('${item.id}')">Editar</button><button class="delete" onclick="deleteEquipment('${item.id}')">Eliminar</button></div>
    </article>`).join('');
  updateStats();
}
form.addEventListener('submit',event=>{
  event.preventDefault();
  const data=Object.fromEntries(Object.entries(fields).map(([key,input])=>[key,input.value.trim()]));
  if(data.status==='Prestado'&&!data.responsible){ notify('Ingresa el responsable del préstamo'); fields.responsible.focus(); return; }
  if(data.loanDate&&data.returnDate&&data.returnDate<data.loanDate){ notify('La devolución no puede ser anterior al préstamo'); return; }
  const duplicated=equipment.some(item=>normalize(item.code)===normalize(data.code)&&item.id!==data.editingId);
  if(duplicated){ notify('El código del equipo ya existe'); fields.code.focus(); return; }
  if(data.editingId){
    equipment=equipment.map(item=>item.id===data.editingId?{...item,...data,updatedAt:new Date().toISOString()}:item);
    notify('Equipo actualizado correctamente');
  }else{
    equipment.unshift({...data,id:crypto.randomUUID?crypto.randomUUID():Date.now().toString(),createdAt:new Date().toISOString()});
    notify('Equipo registrado correctamente');
  }
  saveEquipment(); resetForm(); render();
});
window.editEquipment=id=>{
  const item=equipment.find(record=>record.id===id); if(!item)return;
  Object.entries(fields).forEach(([key,input])=>input.value=item[key]||'');
  document.querySelector('#formTitle').textContent='Editar equipo';
  document.querySelector('#saveButton').textContent='Guardar cambios';
  document.querySelector('#cancelButton').classList.remove('hidden');
  window.scrollTo({top:130,behavior:'smooth'});
};
window.deleteEquipment=id=>{
  const item=equipment.find(record=>record.id===id);
  if(item&&confirm(`¿Eliminar el equipo ${item.code}?`)){ equipment=equipment.filter(record=>record.id!==id); saveEquipment(); render(); notify('Equipo eliminado'); }
};
function resetForm(){
  form.reset(); fields.editingId.value=''; fields.status.value='Disponible';
  document.querySelector('#formTitle').textContent='Registrar equipo';
  document.querySelector('#saveButton').textContent='Guardar equipo';
  document.querySelector('#cancelButton').classList.add('hidden');
}
document.querySelector('#cancelButton').addEventListener('click',resetForm);
document.querySelector('#searchInput').addEventListener('input',render);
document.querySelector('#statusFilter').addEventListener('change',render);
document.querySelector('#clearButton').addEventListener('click',()=>{
  if(equipment.length&&confirm('¿Eliminar todos los registros?')){ equipment=[]; saveEquipment(); resetForm(); render(); notify('Todos los registros fueron eliminados'); }
});
render();