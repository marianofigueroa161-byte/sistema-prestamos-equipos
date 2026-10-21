"use strict";
const EQUIPMENT_KEY="equipmentLoanSystem.equipment.v2";
const HISTORY_KEY="equipmentLoanSystem.history.v2";
const $=selector=>document.querySelector(selector);
const form=$("#equipmentForm");
const fields={code:$("#code"),type:$("#type"),brand:$("#brand"),model:$("#model"),responsible:$("#responsible"),area:$("#area"),loanDate:$("#loanDate"),dueDate:$("#dueDate"),status:$("#status"),notes:$("#notes")};
let equipment=read(EQUIPMENT_KEY);
let history=read(HISTORY_KEY);
let editingId=null;
function read(key){
try{
const value=JSON.parse(localStorage.getItem(key));
return Array.isArray(value)?value:[];
}catch{
return[];
}
}
function write(){
localStorage.setItem(EQUIPMENT_KEY,JSON.stringify(equipment));
localStorage.setItem(HISTORY_KEY,JSON.stringify(history));
}
function normalize(value){
return String(value??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
}
function today(){
const date=new Date();
date.setMinutes(date.getMinutes()-date.getTimezoneOffset());
return date.toISOString().slice(0,10);
}
function generateId(){
return Date.now().toString(36)+Math.random().toString(36).slice(2);
}
function overdue(item){
return item.status==="Prestado"&&item.dueDate&&item.dueDate<today();
}
function validate(data){
if(!data.code||!data.type||!data.brand||!data.model)return"Complete los datos obligatorios del equipo.";
if(data.status==="Prestado"&&(!data.responsible||!data.area||!data.loanDate||!data.dueDate))return"Un préstamo requiere responsable, área y ambas fechas.";
if(data.loanDate&&data.dueDate&&data.dueDate<data.loanDate)return"La devolución prevista no puede ser anterior al préstamo.";
if(equipment.some(item=>normalize(item.code)===normalize(data.code)&&item.id!==editingId))return"El código ya está registrado.";
return"";
}
function formData(){
return Object.fromEntries(Object.entries(fields).map(([key,input])=>[key,input.value.trim()]));
}
function resetForm(){
form.reset();
fields.status.value="Disponible";
editingId=null;
$("#formTitle").textContent="Nuevo equipo";
$("#submitButton").textContent="Guardar equipo";
$("#cancelButton").classList.add("hidden");
$("#formMessage").textContent="";
}
function updateStats(){
$("#totalCount").textContent=equipment.length;
$("#availableCount").textContent=equipment.filter(item=>item.status==="Disponible").length;
$("#loanedCount").textContent=equipment.filter(item=>item.status==="Prestado").length;
$("#overdueCount").textContent=equipment.filter(overdue).length;
$("#maintenanceCount").textContent=equipment.filter(item=>item.status==="Mantenimiento").length;
}
function escapeText(value){
const node=document.createElement("span");
node.textContent=value??"";
return node.innerHTML;
}
function equipmentCard(item){
const isOverdue=overdue(item);
const card=document.createElement("article");
card.className=`record-card${isOverdue?" overdue":""}`;
const statusClasses={Disponible:"available",Prestado:"loaned",Mantenimiento:"maintenance"};
const statusClass=isOverdue?"overdue":statusClasses[item.status];
card.innerHTML=`<div class="record-top"><div><h3 class="record-title">${escapeText(item.code)} · ${escapeText(item.type)} ${escapeText(item.brand)} ${escapeText(item.model)}</h3><div class="badges"><span class="badge ${statusClass}">${isOverdue?"Vencido":escapeText(item.status)}</span></div></div></div><div class="record-meta"><span><strong>Responsable:</strong> ${escapeText(item.responsible||"No asignado")}</span><span><strong>Área:</strong> ${escapeText(item.area||"No asignada")}</span><span><strong>Préstamo:</strong> ${escapeText(item.loanDate||"-")}</span><span><strong>Devolución prevista:</strong> ${escapeText(item.dueDate||"-")}</span><span><strong>Observaciones:</strong> ${escapeText(item.notes||"Sin observaciones")}</span></div><div class="record-actions"><button class="secondary" data-action="edit" data-id="${item.id}">Editar</button>${item.status==="Prestado"?`<button class="success" data-action="return" data-id="${item.id}">Registrar devolución</button>`:""}<button class="danger" data-action="delete" data-id="${item.id}">Eliminar</button></div>`;
return card;
}
function renderEquipment(){
updateStats();
const query=normalize($("#equipmentSearch").value);
const filter=$("#statusFilter").value;
const items=equipment.filter(item=>{
const text=normalize([item.code,item.type,item.brand,item.model,item.responsible,item.area].join(" "));
const statusMatch=filter==="Todos"||(filter==="Vencido"?overdue(item):item.status===filter);
return text.includes(query)&&statusMatch;
});
const list=$("#equipmentList");
list.textContent="";
items.forEach(item=>list.appendChild(equipmentCard(item)));
}
function historyCard(item){
const card=document.createElement("article");
card.className="record-card history";
card.innerHTML=`<div class="record-top"><h3 class="record-title">${escapeText(item.code)} · ${escapeText(item.type)} ${escapeText(item.brand)} ${escapeText(item.model)}</h3><span class="badge ${item.result==="Devuelto con retraso"?"overdue":"available"}">${escapeText(item.result)}</span></div><div class="record-meta"><span><strong>Responsable:</strong> ${escapeText(item.responsible)}</span><span><strong>Área:</strong> ${escapeText(item.area)}</span><span><strong>Préstamo:</strong> ${escapeText(item.loanDate)}</span><span><strong>Fecha prevista:</strong> ${escapeText(item.dueDate)}</span><span><strong>Devolución real:</strong> ${escapeText(item.returnDate)}</span><span><strong>Observaciones:</strong> ${escapeText(item.notes||"Sin observaciones")}</span></div>`;
return card;
}
function renderHistory(){
const query=normalize($("#historySearch").value);
const filter=$("#historyFilter").value;
const items=history.filter(item=>{
const text=normalize([item.code,item.type,item.brand,item.model,item.responsible,item.area].join(" "));
return text.includes(query)&&(filter==="Todos"||item.result===filter);
});
const list=$("#historyList");
list.textContent="";
items.forEach(item=>list.appendChild(historyCard(item)));
}
function editItem(id){
const item=equipment.find(entry=>entry.id===id);
if(!item)return;
Object.entries(fields).forEach(([key,input])=>{
input.value=item[key]??"";
});
editingId=id;
$("#formTitle").textContent="Editar equipo";
$("#submitButton").textContent="Guardar cambios";
$("#cancelButton").classList.remove("hidden");
form.scrollIntoView({behavior:"smooth"});
}
function returnItem(id){
const item=equipment.find(entry=>entry.id===id);
if(!item||item.status!=="Prestado")return;
const returnDate=prompt("Ingrese la fecha real de devolución:",today());
if(returnDate===null)return;
if(!/^\d{4}-\d{2}-\d{2}$/.test(returnDate)||returnDate<item.loanDate){
alert("Ingrese una fecha válida que no sea anterior al préstamo.");
return;
}
history.unshift({...item,historyId:generateId(),returnDate,result:returnDate>item.dueDate?"Devuelto con retraso":"Devuelto a tiempo"});
Object.assign(item,{status:"Disponible",responsible:"",area:"",loanDate:"",dueDate:""});
write();
renderAll();
}
function deleteItem(id){
const item=equipment.find(entry=>entry.id===id);
if(item&&confirm(`¿Eliminar el equipo ${item.code}?`)){
equipment=equipment.filter(entry=>entry.id!==id);
write();
renderAll();
}
}
function renderAll(){
renderEquipment();
renderHistory();
}
form.addEventListener("submit",event=>{
event.preventDefault();
const data=formData();
const error=validate(data);
$("#formMessage").textContent=error;
if(error)return;
if(editingId){
const item=equipment.find(entry=>entry.id===editingId);
if(item)Object.assign(item,data);
}else{
equipment.unshift({...data,id:generateId(),createdAt:new Date().toISOString()});
}
write();
resetForm();
renderAll();
});
$("#status").addEventListener("change",()=>{
if(fields.status.value!=="Prestado"){
fields.responsible.value="";
fields.area.value="";
fields.loanDate.value="";
fields.dueDate.value="";
}
});
$("#cancelButton").addEventListener("click",resetForm);
$("#equipmentList").addEventListener("click",event=>{
const button=event.target.closest("button[data-action]");
if(!button)return;
const actions={edit:editItem,return:returnItem,delete:deleteItem};
const action=actions[button.dataset.action];
if(action)action(button.dataset.id);
});
$("#equipmentSearch").addEventListener("input",renderEquipment);
$("#statusFilter").addEventListener("change",renderEquipment);
$("#historySearch").addEventListener("input",renderHistory);
$("#historyFilter").addEventListener("change",renderHistory);
$("#clearHistoryButton").addEventListener("click",()=>{
if(history.length&&confirm("¿Eliminar todo el historial de devoluciones?")){
history=[];
write();
renderHistory();
}
});
renderAll();