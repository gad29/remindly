<template>
  <v-container class="tasks-page" fluid>
    <header class="tasks-header">
      <div><div class="kicker">EVERYTHING IN MOTION</div><h1>All your tasks,<br><em>one calm view.</em></h1><p>Capture something quickly, then open its list when you need the full guide.</p></div>
      <v-btn color="primary" size="large" prepend-icon="mdi-plus" @click="openCreate">Create task</v-btn>
    </header>

    <section class="task-stats">
      <article><span class="stat-icon open"><v-icon icon="mdi-circle-outline"/></span><div><strong>{{ pending.length }}</strong><small>Open</small></div></article>
      <article><span class="stat-icon today"><v-icon icon="mdi-calendar-today-outline"/></span><div><strong>{{ dueToday }}</strong><small>Due today</small></div></article>
      <article><span class="stat-icon done"><v-icon icon="mdi-check"/></span><div><strong>{{ completed.length }}</strong><small>Completed</small></div></article>
    </section>

    <div class="task-workspace">
      <aside class="task-filters">
        <button v-for="item in filters" :key="item.value" :class="{active:filter===item.value}" @click="filter=item.value"><v-icon :icon="item.icon"/><span>{{ item.label }}</span><small>{{ item.count }}</small></button>
        <div class="aside-rule"/>
        <button :class="{active:filter==='high'}" @click="filter='high'"><v-icon icon="mdi-flag-outline"/><span>High priority</span><small>{{ highPriority }}</small></button>
      </aside>

      <main class="task-board">
        <div class="board-heading"><div><p class="eyebrow">{{ activeFilterLabel }}</p><h2>{{ filteredTasks.length ? `${filteredTasks.length} things to move` : 'A clear runway' }}</h2></div><v-btn variant="tonal" prepend-icon="mdi-format-list-bulleted" @click="router.push('/lists')">Browse lists</v-btn></div>
        <v-alert v-if="error" type="error" variant="tonal" closable class="mb-4" @click:close="error=''">{{ error }}</v-alert>
        <div v-if="loading" class="state-panel"><v-progress-circular indeterminate color="primary"/><p>Gathering your tasks…</p></div>
        <div v-else-if="filteredTasks.length" class="task-stack">
          <article v-for="task in filteredTasks" :key="task.id" :class="['task-card',{completed:task.completed}]">
            <button class="check-button" :aria-label="`Toggle ${task.title}`" @click="toggleTask(task)"><v-icon :icon="task.completed?'mdi-check-circle':'mdi-checkbox-blank-circle-outline'"/></button>
            <button class="task-main" @click="openTask(task)"><strong>{{ task.title }}</strong><span>{{ task.description || 'Open the list to add a guide and notes.' }}</span><small><i :class="`priority-dot ${task.priority}`"/>{{ listName(task.listId) }}<template v-if="task.dueDate"> · {{ friendlyDate(task.dueDate) }}</template></small></button>
            <v-btn icon="mdi-arrow-right" variant="text" aria-label="Open task guide" @click="openTask(task)"/>
          </article>
        </div>
        <section v-else class="state-panel empty"><span><v-icon icon="mdi-check-all" size="36"/></span><h3>{{ filter==='completed' ? 'Nothing completed yet' : 'Nothing is asking for your attention' }}</h3><p>Create a task here or start by making a list for a project or routine.</p><div><v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">Create task</v-btn><v-btn variant="text" @click="router.push('/lists/new')">Create a list</v-btn></div></section>
      </main>
    </div>

    <v-dialog v-model="createOpen" max-width="620">
      <v-card class="capture-card">
        <v-card-title><div><span class="kicker">QUICK CAPTURE</span><h2>What needs to happen?</h2></div><v-spacer/><v-btn icon="mdi-close" variant="text" @click="createOpen=false"/></v-card-title>
        <v-card-text>
          <v-alert v-if="!lists.length" type="info" variant="tonal" class="mb-4">Create a list first so this task has a home.</v-alert>
          <v-form ref="taskForm">
            <v-text-field v-model="draft.title" label="Task name" placeholder="Call the hosting provider…" variant="outlined" :rules="[required]" autofocus/>
            <v-textarea v-model="draft.description" label="Context or desired outcome" variant="outlined" rows="2"/>
            <div class="capture-grid"><v-select v-model="draft.listId" :items="lists" item-title="name" item-value="id" label="List" variant="outlined" :rules="[required]"/><v-select v-model="draft.priority" :items="priorities" label="Priority" variant="outlined"/><v-text-field v-model="draft.dueDate" type="date" label="Due date" variant="outlined"/></div>
          </v-form>
        </v-card-text>
        <v-card-actions><v-spacer/><v-btn variant="text" @click="createOpen=false">Cancel</v-btn><v-btn color="primary" :loading="saving" :disabled="!lists.length" @click="saveTask">Create task</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
    <v-snackbar v-model="saved" color="success">Task created and ready</v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useTaskStore } from '@/stores/taskStore'
import { useListStore } from '@/stores/listStore'
import type { Task } from '@/types'

const router=useRouter(),taskStore=useTaskStore(),listStore=useListStore(),filter=ref('all'),createOpen=ref(false),taskForm=ref(),saving=ref(false),saved=ref(false),error=ref('')
const tasks=computed(()=>taskStore.tasks),lists=computed(()=>listStore.lists),loading=computed(()=>taskStore.loading||listStore.loading),pending=computed(()=>tasks.value.filter(t=>!t.completed)),completed=computed(()=>tasks.value.filter(t=>t.completed))
const today=new Date().toISOString().slice(0,10),dueToday=computed(()=>tasks.value.filter(t=>!t.completed&&t.dueDate===today).length),highPriority=computed(()=>tasks.value.filter(t=>!t.completed&&['high','urgent'].includes(t.priority)).length)
const filters=computed(()=>[{value:'all',label:'All tasks',icon:'mdi-inbox-outline',count:tasks.value.length},{value:'open',label:'Open',icon:'mdi-circle-outline',count:pending.value.length},{value:'today',label:'Today',icon:'mdi-calendar-today-outline',count:dueToday.value},{value:'completed',label:'Completed',icon:'mdi-check-circle-outline',count:completed.value.length}])
const activeFilterLabel=computed(()=>filters.value.find(item=>item.value===filter.value)?.label||'High priority')
const filteredTasks=computed(()=>tasks.value.filter(task=>filter.value==='all'||(filter.value==='open'&&!task.completed)||(filter.value==='today'&&!task.completed&&task.dueDate===today)||(filter.value==='completed'&&task.completed)||(filter.value==='high'&&!task.completed&&['high','urgent'].includes(task.priority))))
const priorities=['low','medium','high','urgent'],blank=()=>({title:'',description:'',listId:lists.value[0]?.id||'',priority:'medium' as const,dueDate:''}),draft=reactive(blank())
const required=(value:string)=>Boolean(value?.trim())||'Required'
const listName=(id:string)=>lists.value.find(list=>list.id===id)?.name||'List'
const friendlyDate=(date:string)=>new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric'}).format(new Date(`${date}T00:00:00`))
const openTask=(task:Task)=>router.push(`/lists/${task.listId}`)
const openCreate=()=>{Object.assign(draft,blank());createOpen.value=true}
const saveTask=async()=>{const validation=await taskForm.value?.validate();if(!validation?.valid)return;saving.value=true;const result=await taskStore.addTask({...draft,dueDate:draft.dueDate||undefined});saving.value=false;if(result.success){createOpen.value=false;saved.value=true}else error.value=result.error||'Could not create this task'}
const toggleTask=async(task:Task)=>{const result=await taskStore.toggleTaskCompletion(task.id);if(!result?.success)error.value=result?.error||'Could not update this task'}
onMounted(()=>Promise.all([listStore.loadLists(),taskStore.loadTasks()]))
</script>

<style scoped>
.tasks-page{max-width:1220px;padding:42px 28px 80px}.tasks-header{display:flex;justify-content:space-between;align-items:end;gap:28px}.tasks-header h1{font-size:clamp(2.5rem,5vw,4.8rem);line-height:.94;letter-spacing:-.06em;color:#173d3a;margin:0 0 16px}.tasks-header h1 em{font-family:Georgia,serif;font-weight:400;color:#4f897e}.tasks-header p{color:#687572;max-width:590px}.kicker,.eyebrow{font:700 11px ui-monospace,monospace;letter-spacing:.14em;color:#245b55;margin:0 0 10px}.task-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:30px 0}.task-stats article{background:#fff;border:1px solid #dce3df;border-radius:16px;padding:16px;display:flex;align-items:center;gap:12px}.stat-icon{width:38px;height:38px;border-radius:12px;display:grid;place-items:center}.stat-icon.open{background:#e3edf3;color:#42637a}.stat-icon.today{background:#f4e9d3;color:#765b2b}.stat-icon.done{background:#dceee6;color:#245b55}.task-stats div{display:flex;flex-direction:column}.task-stats strong{font-size:1.35rem;color:#173d3a}.task-stats small{color:#687572}.task-workspace{display:grid;grid-template-columns:210px 1fr;gap:22px}.task-filters{display:flex;flex-direction:column;gap:5px}.task-filters button{border:0;background:transparent;border-radius:12px;padding:11px 12px;display:grid;grid-template-columns:24px 1fr 24px;gap:7px;text-align:left;align-items:center;cursor:pointer;color:#52635f}.task-filters button.active,.task-filters button:hover{background:#e8f2ee;color:#173d3a}.task-filters small{text-align:right}.aside-rule{height:1px;background:#dce3df;margin:8px}.task-board{background:#fff;border:1px solid #dce3df;border-radius:22px;padding:22px}.board-heading{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}.board-heading h2{font-size:1.45rem;color:#173d3a}.task-stack{display:grid;gap:8px}.task-card{display:grid;grid-template-columns:42px 1fr 42px;align-items:center;border:1px solid #e3e9e6;border-radius:14px;padding:8px 10px}.task-card.completed{opacity:.58}.task-card.completed strong{text-decoration:line-through}.check-button,.task-main{appearance:none;border:0;background:transparent;cursor:pointer;color:#245b55}.check-button{width:42px;height:42px}.task-main{text-align:left;display:flex;flex-direction:column;min-width:0;padding:5px}.task-main strong{color:#173d3a}.task-main span{color:#687572;font-size:.78rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.task-main small{margin-top:5px;color:#82918e}.priority-dot{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:6px;background:#6f8b84}.priority-dot.high{background:#d08a45}.priority-dot.urgent{background:#c45c62}.state-panel{min-height:300px;display:grid;place-content:center;justify-items:center;text-align:center;gap:12px}.state-panel.empty>span{width:68px;height:68px;border-radius:22px;background:#dceee6;color:#245b55;display:grid;place-items:center}.state-panel p{max-width:420px;color:#687572}.capture-card{border-radius:22px!important}.capture-card .v-card-title{display:flex;align-items:start;padding:22px}.capture-card h2{font-size:1.55rem}.capture-grid{display:grid;grid-template-columns:1.25fr .8fr 1fr;gap:10px}@media(max-width:780px){.tasks-page{padding:26px 14px 78px}.tasks-header{align-items:flex-start;flex-direction:column}.tasks-header>.v-btn{width:100%}.task-stats{grid-template-columns:1fr}.task-workspace{grid-template-columns:1fr}.task-filters{flex-direction:row;overflow:auto}.task-filters button{min-width:max-content;grid-template-columns:22px 1fr 22px}.aside-rule{display:none}.board-heading{align-items:flex-start;gap:10px}.capture-grid{grid-template-columns:1fr}}
</style>
