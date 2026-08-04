<template>
  <v-container class="routine-page" fluid>
    <v-btn variant="text" prepend-icon="mdi-arrow-left" class="back-link" @click="router.push('/lists')">All lists</v-btn>

    <header class="routine-header">
      <div>
        <div class="kicker">REMINDLY ROUTINE</div>
        <h1>{{ currentList?.name || 'Your list' }}</h1>
        <p>{{ currentList?.description || 'Move through the work at your own pace. Every guide is editable.' }}</p>
      </div>
      <div class="readiness" :style="{ '--progress': `${completion}%` }"><strong>{{ completion }}%</strong><span>complete</span></div>
    </header>

    <v-alert v-if="error" type="error" variant="tonal" closable class="my-5" @click:close="error=''">{{ error }}</v-alert>

    <section v-if="nextTask" class="next-card">
      <div><div class="kicker">NEXT CLEAR ACTION</div><h2>{{ nextTask.title }}</h2><p>{{ nextTask.description || 'Open the guide and take it one step at a time.' }}</p></div>
      <v-btn color="#cce9d8" variant="flat" prepend-icon="mdi-book-open-page-variant-outline" @click="openGuide(nextTask)">Open guide</v-btn>
    </section>

    <div class="toolbar">
      <div class="filter-row" role="group" aria-label="Filter tasks">
        <v-chip v-for="filter in filters" :key="filter" :color="activeFilter===filter ? 'primary' : undefined" :variant="activeFilter===filter ? 'flat' : 'outlined'" @click="activeFilter=filter">{{ filter }}</v-chip>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openNewTask">Add task</v-btn>
    </div>

    <div v-if="loading" class="loading-state"><v-progress-circular indeterminate color="primary"/><span>Loading routine…</span></div>
    <section v-else-if="filteredTasks.length" class="routine-list">
      <article v-for="task in filteredTasks" :key="task.id" :class="['routine-row',{done:task.completed}]">
        <v-checkbox-btn :model-value="task.completed" color="primary" :aria-label="`Mark ${task.title} complete`" @click="toggleTask(task)"/>
        <button class="task-copy" type="button" @click="openGuide(task)">
          <strong>{{ task.title }}</strong>
          <span>{{ task.description || 'No description yet' }}</span>
          <small><v-icon icon="mdi-repeat" size="13"/>{{ frequencyLabel(task) }}<template v-if="task.dueDate"> · Due {{ formatDate(task.dueDate) }}</template></small>
        </button>
        <v-menu>
          <template #activator="{ props }"><v-btn v-bind="props" icon="mdi-dots-horizontal" variant="text" aria-label="Task actions"/></template>
          <v-list density="compact">
            <v-list-item prepend-icon="mdi-pencil-outline" title="Edit guide" @click="openGuide(task)"/>
            <v-list-item prepend-icon="mdi-delete-outline" title="Delete task" @click="deleteTask(task)"/>
          </v-list>
        </v-menu>
      </article>
    </section>
    <section v-else class="empty-state"><v-icon icon="mdi-format-list-checks" size="42"/><h2>No tasks here yet</h2><p>Add the first task and include a guide if it needs several steps.</p><v-btn color="primary" prepend-icon="mdi-plus" @click="openNewTask">Add first task</v-btn></section>

    <v-dialog v-model="guideOpen" max-width="760" scrollable>
      <v-card class="guide-card">
        <v-card-title><span>{{ editingId ? 'Edit task guide' : 'Create guided task' }}</span><v-spacer/><v-btn icon="mdi-close" variant="text" @click="guideOpen=false"/></v-card-title>
        <v-card-text>
          <v-text-field v-model="form.title" label="Task name" variant="outlined" :rules="[required]" autofocus/>
          <v-textarea v-model="form.description" label="What is the outcome?" variant="outlined" rows="2"/>
          <div class="form-grid">
            <v-select v-model="form.frequency" :items="frequencies" label="Routine" variant="outlined"/>
            <v-text-field v-model="form.dueDate" type="date" label="Due date" variant="outlined"/>
            <v-select v-model="form.priority" :items="priorities" label="Priority" variant="outlined"/>
          </div>
          <div class="guide-heading"><div><strong>Step-by-step guide</strong><p>Write each action in the order you want to follow it.</p></div><v-btn variant="tonal" prepend-icon="mdi-plus" @click="form.steps.push('')">Add step</v-btn></div>
          <div v-for="(_,index) in form.steps" :key="index" class="step-edit"><span>{{ index+1 }}</span><v-text-field v-model="form.steps[index]" :label="`Step ${index+1}`" variant="outlined" density="compact" hide-details/><v-btn icon="mdi-close" variant="text" :aria-label="`Remove step ${index+1}`" @click="form.steps.splice(index,1)"/></div>
          <v-textarea v-model="form.safety" label="Safety note or important warning" variant="outlined" rows="2" class="mt-5"/>
          <v-textarea v-model="form.notes" label="Your notes" variant="outlined" rows="3"/>
        </v-card-text>
        <v-card-actions><v-btn v-if="editingId" color="error" variant="text" @click="deleteCurrent">Delete</v-btn><v-spacer/><v-btn variant="text" @click="guideOpen=false">Cancel</v-btn><v-btn color="primary" :loading="saving" :disabled="!form.title.trim()" @click="saveTask">Save task</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="saved" color="success" timeout="2200">Task guide saved</v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useListStore } from '@/stores/listStore'
import { useTaskStore } from '@/stores/taskStore'
import type { Task } from '@/types'

const route=useRoute(),router=useRouter(),listStore=useListStore(),taskStore=useTaskStore()
const listId=computed(()=>String(route.params.id||'')),currentList=computed(()=>listStore.getListById(listId.value))
const tasks=computed(()=>taskStore.getTasksByListId(listId.value)),loading=computed(()=>taskStore.loading||listStore.loading)
const error=ref(''),activeFilter=ref('All'),guideOpen=ref(false),editingId=ref(''),saving=ref(false),saved=ref(false)
const filters=['All','Open','Completed','Once','Daily','Weekly','Monthly'],frequencies=['Once','Daily','Weekly','Monthly','Quarterly','Yearly'],priorities=['low','medium','high','urgent']
const blank=()=>({title:'',description:'',frequency:'Once',dueDate:'',priority:'medium' as const,steps:[] as string[],safety:'',notes:''})
const form=reactive(blank())
const completion=computed(()=>tasks.value.length?Math.round(tasks.value.filter(t=>t.completed).length/tasks.value.length*100):0)
const nextTask=computed(()=>tasks.value.find(t=>!t.completed))
const frequencyLabel=(task:Task)=>task.metadata?.frequency||'Once'
const filteredTasks=computed(()=>tasks.value.filter(task=>activeFilter.value==='All'||(activeFilter.value==='Open'&&!task.completed)||(activeFilter.value==='Completed'&&task.completed)||frequencyLabel(task)===activeFilter.value))
const required=(value:string)=>!!value?.trim()||'Task name is required'
const formatDate=(value:string)=>new Date(`${value}T00:00:00`).toLocaleDateString()
const resetForm=()=>Object.assign(form,blank())
const openNewTask=()=>{editingId.value='';resetForm();guideOpen.value=true}
const openGuide=(task:Task)=>{editingId.value=task.id;Object.assign(form,{title:task.title,description:task.description||'',frequency:frequencyLabel(task),dueDate:task.dueDate||'',priority:task.priority||'medium',steps:[...(task.metadata?.steps||[])],safety:task.metadata?.safety||'',notes:task.metadata?.notes||''});guideOpen.value=true}
const metadata=()=>({frequency:form.frequency,steps:form.steps.map(s=>s.trim()).filter(Boolean),safety:form.safety.trim(),notes:form.notes.trim()})
const saveTask=async()=>{if(!form.title.trim())return;saving.value=true;const data={title:form.title.trim(),description:form.description.trim(),listId:listId.value,priority:form.priority,dueDate:form.dueDate||undefined,metadata:metadata()};const result=editingId.value?await taskStore.updateTask(editingId.value,data):await taskStore.addTask(data);saving.value=false;if(result?.success){guideOpen.value=false;saved.value=true}else error.value=result?.error||'Could not save this task'}
const toggleTask=async(task:Task)=>{const result=await taskStore.toggleTaskCompletion(task.id);if(!result?.success)error.value=result?.error||'Could not update this task'}
const deleteTask=async(task:Task)=>{if(confirm(`Delete “${task.title}”?`)){const result=await taskStore.deleteTask(task.id);if(!result.success)error.value=result.error||'Could not delete task'}}
const deleteCurrent=async()=>{const task=tasks.value.find(t=>t.id===editingId.value);if(task){guideOpen.value=false;await deleteTask(task)}}
const load=async()=>{if(!/^[0-9a-f-]{36}$/i.test(listId.value)){router.push('/lists');return}await Promise.all([listStore.loadLists(),taskStore.loadTasksByList(listId.value)])}
onMounted(load);watch(()=>route.params.id,load)
</script>

<style scoped>
.routine-page{max-width:1160px;padding:26px 28px 80px}.back-link{margin-left:-12px;margin-bottom:18px}.routine-header{display:flex;justify-content:space-between;align-items:end;gap:24px}.routine-header h1{font-size:clamp(2.4rem,5vw,4.7rem);line-height:.95;letter-spacing:-.055em;margin:0 0 12px;color:#173d3a}.routine-header p{color:#687572;max-width:620px}.kicker{font:700 11px ui-monospace,monospace;letter-spacing:.14em;color:#245b55;margin-bottom:9px}.readiness{--progress:0%;width:104px;height:104px;flex:0 0 auto;border-radius:50%;background:conic-gradient(#4f897e var(--progress),#dce9e5 0);display:grid;place-content:center;text-align:center;position:relative}.readiness:after{content:'';position:absolute;inset:9px;border-radius:50%;background:#f8faf9}.readiness strong,.readiness span{z-index:1}.readiness strong{font-size:1.45rem;color:#173d3a}.readiness span{font-size:.68rem;color:#687572}.next-card{margin:30px 0 22px;background:#173d3a;color:#fff;border-radius:24px;padding:28px 30px;display:flex;justify-content:space-between;align-items:center;gap:22px}.next-card h2{font-size:2rem;line-height:1.05;margin:0 0 8px}.next-card p{color:#b8c9c3;margin:0}.next-card .kicker{color:#a9d7c3}.toolbar{display:flex;align-items:center;justify-content:space-between;gap:18px;margin:22px 0 14px}.filter-row{display:flex;gap:8px;overflow:auto;padding:2px}.routine-list{display:grid;gap:9px}.routine-row{display:grid;grid-template-columns:44px 1fr 44px;align-items:center;background:#fff;border:1px solid #dce3df;border-radius:15px;padding:10px 12px}.routine-row.done{opacity:.58}.routine-row.done strong{text-decoration:line-through}.task-copy{appearance:none;border:0;background:transparent;text-align:left;display:flex;flex-direction:column;min-width:0;padding:5px 8px;cursor:pointer;color:#173d3a}.task-copy strong{font-size:.95rem}.task-copy span{font-size:.78rem;color:#687572;white-space:nowrap;text-overflow:ellipsis;overflow:hidden}.task-copy small{font-size:.68rem;color:#78908a;margin-top:5px}.loading-state,.empty-state{min-height:280px;display:grid;place-content:center;justify-items:center;text-align:center;gap:12px}.empty-state p{color:#687572}.guide-card{border-radius:20px!important}.guide-card .v-card-title{display:flex;align-items:center;padding:20px 22px}.form-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}.guide-heading{display:flex;justify-content:space-between;align-items:center;gap:18px;margin:4px 0 14px}.guide-heading p{font-size:.75rem;color:#687572;margin:3px 0 0}.step-edit{display:grid;grid-template-columns:30px 1fr 42px;gap:9px;align-items:center;margin-bottom:9px}.step-edit>span{width:28px;height:28px;border-radius:8px;background:#173d3a;color:#fff;display:grid;place-items:center;font:700 .7rem ui-monospace,monospace}@media(max-width:720px){.routine-page{padding:20px 14px 78px}.routine-header{align-items:flex-start}.readiness{width:82px;height:82px}.next-card{align-items:flex-start;flex-direction:column}.next-card .v-btn,.toolbar>.v-btn{width:100%}.toolbar{align-items:stretch;flex-direction:column}.form-grid{grid-template-columns:1fr}.routine-row{grid-template-columns:40px 1fr 40px}}
</style>
