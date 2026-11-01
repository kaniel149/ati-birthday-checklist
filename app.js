(()=>{
  const API='https://ati-birthday-checklist.kaniel713282.chatgpt.site/api/shared-tasks';
  const tokenName='ati-edit-key-v1';
  let key=new URLSearchParams(location.hash.slice(1)).get('edit')||'';
  try{if(key)localStorage.setItem(tokenName,key);else key=localStorage.getItem(tokenName)||'';}catch{}
  const node=document;
  const inputs=[...node.querySelectorAll('input[type="checkbox"]')];
  const byId=new Map(inputs.map(el=>[el.dataset.task,el]));
  const versions=new Map();
  const pending=new Set();
  const status=node.querySelector('#cloudStatus');
  const counter=node.querySelector('#count');
  const retry=node.querySelector('#retrySync');
  let disposed=false,initialized=false,loading=false,failed=false;
  let controller;
  function message(text,kind='saved'){status.textContent=text;status.className='cloud-status '+kind;retry.hidden=kind!=='error';}
  function count(){counter.textContent='סומנו '+inputs.filter(el=>el.checked).length+' מתוך '+inputs.length+' משימות';}
  function merge(records){for(const r of records){const input=byId.get(r.taskId);if(!input||pending.has(r.taskId))continue;const version=versions.get(r.taskId)??0;if(r.version>=version){input.checked=r.checked;versions.set(r.taskId,r.version);}}count();}
  async function sync(){
   if(loading||disposed||document.hidden)return;loading=true;
   controller=new AbortController();const timeout=setTimeout(()=>controller?.abort(),12000);
   try{
    const res=await fetch(API,{cache:'no-store',credentials:'omit',headers:{Authorization:'Bearer '+key},signal:controller.signal});
    if(!res.ok)throw new Error(String(res.status));const data=await res.json();
    if(!Array.isArray(data.tasks))throw new Error("invalid_response");
    if(disposed)return;merge(data.tasks);initialized=true;failed=false;
    inputs.forEach(el=>{if(!pending.has(el.dataset.task))el.disabled=false;});
    if(!pending.size)message('כל הסימונים נשמרו בענן');
   }catch{if(!disposed){failed=true;message(navigator.onLine?'לא ניתן לסנכרן כרגע. נסו שוב.':'אין חיבור לאינטרנט. הסימונים השמורים ייטענו בחיבור מחדש.','error');}}
   finally{clearTimeout(timeout);loading=false;}
  }
  async function change(event){
   const input=event.target;const taskId=input.dataset.task;
   if(!initialized||pending.has(taskId))return;
   const checked=input.checked;input.disabled=true;pending.add(taskId);count();message('שומר את הסימון...','saving');
   const saveController=new AbortController();const timeout=setTimeout(()=>saveController.abort(),12000);
   try{
    const res=await fetch(API,{method:'PATCH',credentials:'omit',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},body:JSON.stringify({taskId,checked}),signal:saveController.signal});
    if(!res.ok)throw new Error(String(res.status));const data=await res.json();
    if(disposed)return;versions.set(taskId,data.task.version);input.checked=data.task.checked;failed=false;
   }catch{if(!disposed){input.checked=!checked;failed=true;message('הסימון לא נשמר. הסימון הקודם הוחזר; אפשר לנסות שוב.','error');}}
   finally{clearTimeout(timeout);pending.delete(taskId);if(!disposed){input.disabled=false;count();if(!pending.size&&!failed)message('כל הסימונים נשמרו בענן');}}
  }
  if(!/^[A-Za-z0-9_-]{43}$/.test(key)){message('לסימון משימות, פתחו את קישור העריכה המלא שנשלח אליכם.','error');retry.hidden=true;return;}
  inputs.forEach(el=>el.addEventListener('change',change));retry.addEventListener('click',sync);
  const refresh=()=>{if(!document.hidden)void sync();};
  window.addEventListener('focus',refresh);window.addEventListener('online',refresh);document.addEventListener('visibilitychange',refresh);
  const interval=setInterval(()=>{void sync();},4000);count();void sync();

})();
