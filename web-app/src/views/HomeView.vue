<template>
  <div class="today-page">
    <header class="today-hero">
      <div>
        <p class="eyebrow">{{ greeting }}</p>
        <h1>What deserves your attention?</h1>
        <p class="hero-copy">A calm view of what is due, what can wait, and what you have already moved forward.</p>
      </div>
      <div class="hero-actions">
        <v-btn color="primary" size="large" prepend-icon="mdi-waveform" @click="router.push('/assistant')">Speak a reminder</v-btn>
        <v-btn variant="outlined" size="large" prepend-icon="mdi-format-list-bulleted" @click="router.push('/lists/new')">New list</v-btn>
      </div>
    </header>

    <section class="dayline" aria-label="Today at a glance">
      <div class="dayline-track"><span class="dayline-progress" :style="{ width: `${dayProgress}%` }"></span><i :style="{ left: `${dayProgress}%` }"></i></div>
      <div class="dayline-labels"><span>Morning</span><strong>{{ currentTime }}</strong><span>Evening</span></div>
    </section>

    <section class="metric-grid" aria-label="Task overview">
      <article><span class="metric-icon metric-icon--today"><v-icon>mdi-white-balance-sunny</v-icon></span><div><strong>{{ taskStore.todayTasks.length }}</strong><small>Due today</small></div></article>
      <article><span class="metric-icon metric-icon--pending"><v-icon>mdi-timer-sand</v-icon></span><div><strong>{{ taskStore.pendingTasks.length }}</strong><small>Open tasks</small></div></article>
      <article><span class="metric-icon metric-icon--overdue"><v-icon>mdi-alert-circle-outline</v-icon></span><div><strong>{{ taskStore.overdueTasks.length }}</strong><small>Need attention</small></div></article>
      <article><span class="metric-icon metric-icon--done"><v-icon>mdi-check</v-icon></span><div><strong>{{ completionRate }}%</strong><small>Completed</small></div></article>
    </section>

    <div class="dashboard-grid">
      <section class="focus-panel">
        <div class="section-heading">
          <div><p class="eyebrow">Next up</p><h2>Your focus list</h2></div>
          <v-btn variant="text" color="primary" append-icon="mdi-arrow-right" @click="router.push('/tasks')">All tasks</v-btn>
        </div>

        <div v-if="taskStore.loading" class="task-skeleton" aria-label="Loading tasks"><span v-for="n in 4" :key="n"></span></div>
        <div v-else-if="focusTasks.length" class="focus-list">
          <article v-for="task in focusTasks" :key="task.id" class="focus-task">
            <button type="button" class="task-check" :aria-label="`Complete ${task.title}`" @click="taskStore.toggleTaskCompletion(task.id)"><v-icon>mdi-check</v-icon></button>
            <div class="task-copy"><strong>{{ task.title }}</strong><span><v-icon size="15">mdi-clock-outline</v-icon>{{ formatTaskTime(task) }}<em :class="`priority-${task.priority}`">{{ task.priority }}</em></span></div>
            <v-btn icon="mdi-chevron-right" variant="text" size="small" :aria-label="`Open ${task.title}`" @click="openTask(task)" />
          </article>
        </div>
        <div v-else class="empty-focus">
          <span><v-icon>mdi-weather-sunset</v-icon></span>
          <h3>Your focus list is clear</h3>
          <p>Capture the next thing before it has to stay in your head.</p>
          <v-btn color="primary" variant="tonal" prepend-icon="mdi-waveform" @click="router.push('/assistant')">Capture by voice</v-btn>
        </div>
      </section>

      <aside class="side-stack">
        <section class="progress-panel">
          <div class="progress-ring" :style="{ '--progress': `${completionRate * 3.6}deg` }"><span><strong>{{ taskStore.completedTasks.length }}</strong><small>done</small></span></div>
          <div><p class="eyebrow">Momentum</p><h2>Small wins count.</h2><p>{{ momentumMessage }}</p></div>
        </section>

        <section class="collections-panel">
          <div class="section-heading"><div><p class="eyebrow">Spaces</p><h2>Collections</h2></div><v-btn icon="mdi-plus" variant="tonal" size="small" aria-label="Create list" @click="router.push('/lists/new')" /></div>
          <div class="collection-grid">
            <button v-for="collection in collections" :key="collection.to" type="button" @click="router.push(collection.to)">
              <span :style="{ background: collection.tint, color: collection.color }"><v-icon>{{ collection.icon }}</v-icon></span>
              <strong>{{ collection.title }}</strong><small>{{ collection.caption }}</small>
            </button>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTaskStore } from '@/stores/taskStore'
import { useListStore } from '@/stores/listStore'
import { useUserStore } from '@/stores/userStore'
import type { Task } from '@/types'

const router = useRouter()
const taskStore = useTaskStore()
const listStore = useListStore()
const userStore = useUserStore()
const hour = new Date().getHours()
const greeting = computed(() => `${hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'}, ${userStore.user?.name?.split(' ')[0] || 'there'}`)
const currentTime = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date())
const dayProgress = Math.min(100, Math.max(0, ((hour - 6) / 16) * 100))
const completionRate = computed(() => taskStore.tasks.length ? Math.round(taskStore.completedTasks.length / taskStore.tasks.length * 100) : 0)
const focusTasks = computed(() => [...taskStore.pendingTasks].sort((a, b) => `${a.dueDate || '9999'}${a.dueTime || ''}`.localeCompare(`${b.dueDate || '9999'}${b.dueTime || ''}`)).slice(0, 5))
const momentumMessage = computed(() => completionRate.value ? `You have completed ${completionRate.value}% of everything currently on your plate.` : 'Finish one small task to start today’s rhythm.')
const collections = [
  { title: 'Tasks', caption: 'Plan and finish', icon: 'mdi-check-circle-outline', to: '/tasks-lists', color: '#176b78', tint: '#dceff0' },
  { title: 'Shopping', caption: 'Buy without forgetting', icon: 'mdi-cart-outline', to: '/shopping-lists', color: '#9a5a12', tint: '#fff0dc' },
  { title: 'Appointments', caption: 'Keep every date', icon: 'mdi-calendar-blank-outline', to: '/appointment-lists', color: '#7252a3', tint: '#eee7fa' },
  { title: 'Server care', caption: 'Maintain your VPS', icon: 'mdi-server-security', to: '/server-steward', color: '#42637a', tint: '#e3edf3' }
]

const formatTaskTime = (task: Task) => {
  if (!task.dueDate) return 'No date yet'
  const date = new Date(`${task.dueDate}T${task.dueTime || '12:00'}`)
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', ...(task.dueTime ? { hour: 'numeric', minute: '2-digit' } : {}) }).format(date)
}
const openTask = (task: Task) => router.push(task.listId ? `/task-list/${task.listId}` : '/tasks')
onMounted(async () => {
  await Promise.all([
    listStore.lists.length ? Promise.resolve() : listStore.loadLists(),
    taskStore.tasks.length ? Promise.resolve() : taskStore.loadTasks()
  ])
})
</script>

<style scoped>
.today-page{width:min(100%,1440px);margin:0 auto;padding:clamp(24px,4vw,54px)}.today-hero{display:flex;align-items:end;justify-content:space-between;gap:36px;margin-bottom:34px}.eyebrow{margin:0 0 9px;color:var(--primary);font:700 .7rem var(--font-utility);letter-spacing:.15em;text-transform:uppercase}.today-hero h1{max-width:780px;margin:0;color:var(--ink);font:650 clamp(2.5rem,5vw,5.2rem)/.96 var(--font-display);letter-spacing:-.06em}.hero-copy{max-width:650px;margin:18px 0 0;color:var(--ink-muted);font-size:1.04rem}.hero-actions{display:flex;flex:0 0 auto;gap:10px}.hero-actions .v-btn{height:48px;border-radius:13px}
.dayline{margin-bottom:22px;padding:20px 24px;border:1px solid var(--line);border-radius:18px;background:var(--surface)}.dayline-track{position:relative;height:4px;border-radius:9px;background:#e7edef}.dayline-progress{position:absolute;height:100%;border-radius:inherit;background:var(--primary)}.dayline-track i{position:absolute;top:50%;width:14px;height:14px;border:3px solid var(--surface);border-radius:50%;background:var(--accent);box-shadow:0 0 0 1px var(--primary);transform:translate(-50%,-50%)}.dayline-labels{display:flex;justify-content:space-between;margin-top:11px;color:var(--ink-soft);font:600 .68rem var(--font-utility)}.dayline-labels strong{color:var(--ink)}
.metric-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:22px}.metric-grid article{display:flex;align-items:center;gap:13px;padding:17px;border:1px solid var(--line);border-radius:17px;background:var(--surface)}.metric-icon{display:grid;place-items:center;width:42px;height:42px;border-radius:13px}.metric-icon--today{color:#9a5a12;background:#fff0dc}.metric-icon--pending{color:#42637a;background:#e3edf3}.metric-icon--overdue{color:#b24045;background:#fde8e8}.metric-icon--done{color:#25755c;background:#dff2ea}.metric-grid strong,.metric-grid small{display:block}.metric-grid strong{color:var(--ink);font:700 1.45rem var(--font-display)}.metric-grid small{color:var(--ink-soft);font-size:.72rem}
.dashboard-grid{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(310px,.8fr);gap:22px}.focus-panel,.progress-panel,.collections-panel{border:1px solid var(--line);border-radius:22px;background:var(--surface)}.focus-panel{padding:25px}.section-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:18px}.section-heading h2,.progress-panel h2{margin:0;color:var(--ink);font:650 1.35rem var(--font-display);letter-spacing:-.025em}.focus-list{display:grid}.focus-task{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:14px;min-height:72px;border-top:1px solid var(--line)}.task-check{display:grid;place-items:center;width:28px;height:28px;border:2px solid #a9b7bc;border-radius:50%;color:transparent;background:transparent;cursor:pointer}.task-check:hover{border-color:var(--success);color:#fff;background:var(--success)}.task-copy{min-width:0}.task-copy strong{display:block;overflow:hidden;color:var(--ink);font-size:.94rem;text-overflow:ellipsis;white-space:nowrap}.task-copy span{display:flex;align-items:center;gap:5px;margin-top:5px;color:var(--ink-soft);font-size:.72rem}.task-copy em{margin-left:6px;padding:2px 7px;border-radius:20px;font-style:normal;text-transform:capitalize}.priority-urgent,.priority-high{color:#a13b40;background:#fde8e8}.priority-medium{color:#8a5c12;background:#fff0dc}.priority-low{color:#25755c;background:#dff2ea}
.empty-focus{display:grid;place-items:center;padding:50px 20px;text-align:center}.empty-focus>span{display:grid;place-items:center;width:62px;height:62px;border-radius:50%;color:var(--primary);background:var(--primary-soft)}.empty-focus h3{margin:15px 0 4px}.empty-focus p{margin:0 0 18px;color:var(--ink-muted)}.task-skeleton{display:grid;gap:12px}.task-skeleton span{height:58px;border-radius:12px;background:linear-gradient(90deg,#eef3f3 25%,#f8fafa 50%,#eef3f3 75%);background-size:200% 100%;animation:shimmer 1.3s infinite}@keyframes shimmer{to{background-position:-200% 0}}
.side-stack{display:grid;align-content:start;gap:22px}.progress-panel{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:18px;padding:24px;background:#132a3a;color:#d3e0e5}.progress-panel .eyebrow{color:var(--accent)}.progress-panel h2{color:#fff}.progress-panel p:last-child{margin:8px 0 0;color:#aebfc7;font-size:.8rem;line-height:1.5}.progress-ring{display:grid;place-items:center;width:92px;height:92px;border-radius:50%;background:conic-gradient(var(--accent) var(--progress),rgba(255,255,255,.12) 0)}.progress-ring::before{content:"";grid-area:1/1;width:72px;height:72px;border-radius:50%;background:#132a3a}.progress-ring span{z-index:1;grid-area:1/1;text-align:center}.progress-ring strong,.progress-ring small{display:block}.progress-ring strong{color:#fff;font-size:1.35rem}.progress-ring small{color:#aebfc7;font-size:.65rem}
.collections-panel{padding:24px}.collection-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.collection-grid button{display:grid;grid-template-columns:auto 1fr;gap:10px;padding:12px;border:1px solid transparent;border-radius:14px;background:var(--surface-soft);text-align:left;cursor:pointer}.collection-grid button:hover{border-color:var(--line);background:#fff}.collection-grid button>span{grid-row:span 2;display:grid;place-items:center;width:36px;height:36px;border-radius:11px}.collection-grid strong,.collection-grid small{display:block;min-width:0}.collection-grid strong{align-self:end;color:var(--ink);font-size:.78rem}.collection-grid small{color:var(--ink-soft);font-size:.64rem}
@media(max-width:1100px){.dashboard-grid{grid-template-columns:1fr}.side-stack{grid-template-columns:1fr 1fr}.metric-grid{grid-template-columns:1fr 1fr}.today-hero{align-items:start;flex-direction:column}.hero-actions{width:100%}}
@media(max-width:700px){.today-page{padding:24px 16px}.today-hero h1{font-size:2.8rem}.hero-actions{display:grid;grid-template-columns:1fr 1fr}.metric-grid{gap:8px}.metric-grid article{padding:12px}.metric-icon{width:36px;height:36px}.dashboard-grid{gap:14px}.focus-panel{padding:18px}.side-stack{grid-template-columns:1fr}.collection-grid{grid-template-columns:1fr 1fr}.dayline{padding:18px}.metric-grid small{font-size:.66rem}}
</style>
