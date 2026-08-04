<template>
  <v-container class="steward-page" fluid>
    <header class="steward-header">
      <div><div class="kicker">SERVER STEWARD × REMINDLY</div><h1>Your maintenance runway</h1><p>One safe server task at a time. Every guide is editable and saved with your Remindly account.</p></div>
      <div class="readiness"><strong>{{ progress }}%</strong><span>ready</span></div>
    </header>

    <section class="server-strip">
      <article v-for="(server, index) in servers" :key="index">
        <v-icon>{{ server.role === 'Coolify' ? 'mdi-docker' : 'mdi-server-outline' }}</v-icon>
        <input v-model="server.name" @change="saveServers" aria-label="Server name">
        <select v-model="server.role" @change="saveServers"><option>CloudPanel</option><option>Coolify</option><option>Database / other</option></select>
        <input v-model="server.provider" @change="saveServers" aria-label="Server provider">
      </article>
    </section>

    <div v-if="loading" class="text-center pa-12"><v-progress-circular indeterminate color="primary" /></div>
    <v-alert v-else-if="error" type="error" variant="tonal">{{ error }}</v-alert>
    <template v-else>
      <section v-if="nextTask" class="next-card">
        <div><div class="kicker">NEXT SAFE STEP</div><h2>{{ nextTask.title }}</h2><p>{{ nextTask.description }}</p></div>
        <v-btn color="#CCE9D8" variant="flat" @click="openGuide(nextTask)">Open guide</v-btn>
      </section>

      <div class="filter-row">
        <v-chip v-for="filter in filters" :key="filter" :color="activeFilter === filter ? 'primary' : undefined" :variant="activeFilter === filter ? 'flat' : 'outlined'" @click="activeFilter = filter">{{ filter }}</v-chip>
      </div>

      <div class="routine-list">
        <article v-for="task in filteredTasks" :key="task.id" :class="['routine-row',{done:task.completed}]">
          <v-checkbox-btn :model-value="task.completed" color="success" @update:model-value="toggleTask(task)" />
          <div><strong>{{ task.title }}</strong><p>{{ task.metadata?.frequency }} · {{ dueLabel(task.dueDate) }}</p></div>
          <v-btn icon="mdi-chevron-right" variant="text" @click="openGuide(task)" />
        </article>
      </div>
    </template>

    <v-dialog v-model="guideOpen" max-width="760" scrollable>
      <v-card v-if="editingTask" class="guide-card">
        <v-card-title class="d-flex align-center"><span>Edit maintenance guide</span><v-spacer/><v-btn icon="mdi-close" variant="text" @click="guideOpen=false" /></v-card-title>
        <v-card-text>
          <v-alert type="warning" variant="tonal" density="compact" class="mb-5"><strong>Before you begin:</strong> {{ form.safety }}</v-alert>
          <v-text-field v-model="form.title" label="Task name" variant="outlined" />
          <v-textarea v-model="form.description" label="Frequency or description" variant="outlined" rows="2" />
          <label class="guide-label">Step-by-step instructions</label>
          <div v-for="(step,index) in form.steps" :key="index" class="step-edit"><span>{{ index+1 }}</span><v-textarea v-model="form.steps[index]" variant="outlined" rows="2" hide-details/><v-btn icon="mdi-delete-outline" variant="text" @click="form.steps.splice(index,1)" /></div>
          <v-btn variant="text" prepend-icon="mdi-plus" @click="form.steps.push('')">Add instruction</v-btn>
          <v-textarea v-model="form.notes" label="Your notes (never store secrets here)" variant="outlined" class="mt-4" />
          <v-text-field v-model="form.dueDate" type="date" label="Next due" variant="outlined" />
        </v-card-text>
        <v-card-actions><v-spacer/><v-btn variant="text" @click="guideOpen=false">Cancel</v-btn><v-btn color="primary" :loading="saving" @click="saveGuide">Save guide</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
    <v-snackbar v-model="snackbar">Saved</v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { apiService } from '@/utils/api'
import type { Task } from '@/types'

const tasks=ref<Task[]>([]);const loading=ref(true);const error=ref('');const activeFilter=ref('All');const filters=['All','Set up once','Daily','Weekly','Monthly','Quarterly','Yearly'];const guideOpen=ref(false);const editingTask=ref<Task|null>(null);const saving=ref(false);const snackbar=ref(false)
const defaultServers=[{name:'CloudPanel server',role:'CloudPanel',provider:'Hostinger'},{name:'Coolify server',role:'Coolify',provider:'Hostinger'},{name:'Third server',role:'Database / other',provider:'VPSserver'}]
const servers=ref(JSON.parse(localStorage.getItem('remindly-server-profiles')||JSON.stringify(defaultServers)))
const form=reactive({title:'',description:'',steps:[] as string[],safety:'',notes:'',dueDate:''})
const saveServers=()=>localStorage.setItem('remindly-server-profiles',JSON.stringify(servers.value))
const progress=computed(()=>tasks.value.length?Math.round(tasks.value.filter(t=>t.completed).length/tasks.value.length*100):0)
const filteredTasks=computed(()=>activeFilter.value==='All'?tasks.value:tasks.value.filter(t=>t.metadata?.frequency===activeFilter.value))
const nextTask=computed(()=>tasks.value.filter(t=>!t.completed).sort((a,b)=>(a.dueDate||'').localeCompare(b.dueDate||''))[0])
const dueLabel=(date?:string)=>{if(!date)return'No date';const days=Math.ceil((new Date(date+'T12:00:00').getTime()-new Date(new Date().toISOString().slice(0,10)+'T12:00:00').getTime())/86400000);return days<0?`${Math.abs(days)}d overdue`:days===0?'Due today':days===1?'Tomorrow':`In ${days} days`}
const load=async()=>{loading.value=true;try{const response=await apiService.steward.getDashboard();tasks.value=response.data.data?.tasks||[]}catch(e:any){error.value=e.response?.data?.error||'Could not load the server routine'}finally{loading.value=false}}
const toggleTask=async(task:Task)=>{try{const response=await apiService.steward.setCompleted(task.id,!task.completed);Object.assign(task,response.data.data)}catch{error.value='Could not update this task'} }
const openGuide=(task:Task)=>{editingTask.value=task;Object.assign(form,{title:task.title,description:task.description||'',steps:[...(task.metadata?.steps||[])],safety:task.metadata?.safety||'',notes:task.metadata?.notes||'',dueDate:task.dueDate||''});guideOpen.value=true}
const saveGuide=async()=>{if(!editingTask.value)return;saving.value=true;try{const response=await apiService.steward.updateTask(editingTask.value.id,form);const i=tasks.value.findIndex(t=>t.id===editingTask.value!.id);if(i>=0)tasks.value[i]=response.data.data;guideOpen.value=false;snackbar.value=true}catch{}finally{saving.value=false}}
onMounted(load)
</script>

<style scoped>
.steward-page{max-width:1200px;padding:40px 28px 80px}.steward-header{display:flex;justify-content:space-between;align-items:end;gap:24px}.steward-header h1{font-size:clamp(2.2rem,5vw,4.8rem);line-height:.95;letter-spacing:-.055em}.steward-header p{color:#687572;max-width:620px}.kicker{font:700 11px monospace;letter-spacing:.14em;color:#245b55;margin-bottom:9px}.readiness{width:100px;height:100px;border-radius:50%;border:9px solid #cce9d8;display:grid;place-content:center;text-align:center}.readiness strong{font-size:1.5rem}.readiness span{font-size:.7rem;color:#687572}.server-strip{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:32px 0}.server-strip article{display:grid;grid-template-columns:32px 1fr;gap:6px 10px;padding:16px;border:1px solid #dce3df;border-radius:16px;background:white}.server-strip input,.server-strip select{min-width:0;border:0;background:transparent}.server-strip input:first-of-type{font-weight:700}.server-strip select,.server-strip input:last-child{grid-column:2;color:#687572;font-size:.75rem}.next-card{background:#173d3a;color:white;border-radius:24px;padding:30px;display:flex;justify-content:space-between;align-items:center;gap:20px}.next-card h2{font-size:2.2rem;line-height:1.05}.next-card p{color:#b8c9c3}.next-card .kicker{color:#a9d7c3}.filter-row{display:flex;gap:8px;overflow:auto;margin:28px 0 14px}.routine-list{display:grid;gap:9px}.routine-row{display:grid;grid-template-columns:42px 1fr 42px;align-items:center;background:white;border:1px solid #dce3df;border-radius:14px;padding:10px 14px}.routine-row p{margin:3px 0 0;color:#687572;font-size:.75rem}.routine-row.done{opacity:.58}.routine-row.done strong{text-decoration:line-through}.guide-card{border-radius:20px!important}.guide-label{display:block;font-size:.8rem;font-weight:700;margin:6px 0 10px}.step-edit{display:grid;grid-template-columns:30px 1fr 42px;gap:9px;margin-bottom:8px}.step-edit>span{width:28px;height:28px;border-radius:8px;background:#173d3a;color:white;display:grid;place-items:center;font:700 .7rem monospace}@media(max-width:760px){.steward-page{padding:24px 14px 70px}.steward-header{align-items:flex-start}.readiness{width:78px;height:78px}.server-strip{grid-template-columns:1fr}.next-card{align-items:flex-start;flex-direction:column}}
</style>
