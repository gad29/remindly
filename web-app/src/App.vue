<template>
  <v-app :class="['remindly-app', { 'is-authenticated': userStore.isAuthenticated }]">
    <template v-if="userStore.isAuthenticated">
      <v-navigation-drawer v-model="drawer" :permanent="mdAndUp" :temporary="!mdAndUp" width="260" class="app-sidebar">
        <div class="sidebar-brand" @click="router.push('/')">
          <span class="brand-symbol"><v-icon>mdi-bell-check-outline</v-icon></span>
          <div><strong>remindly</strong><small>Make space to think</small></div>
        </div>

        <v-list nav class="sidebar-nav" aria-label="Primary navigation">
          <v-list-item v-for="item in primaryNav" :key="item.to" :to="item.to" :prepend-icon="item.icon"
            :title="item.title" rounded="lg" />
        </v-list>

        <p class="nav-section-label">Collections</p>
        <v-list nav class="sidebar-nav sidebar-nav--secondary">
          <v-list-item v-for="item in collectionNav" :key="item.to" :to="item.to" :prepend-icon="item.icon"
            :title="item.title" rounded="lg" />
        </v-list>

        <template #append>
          <div class="sidebar-footer">
            <v-btn variant="tonal" color="primary" block prepend-icon="mdi-plus" @click="showAddTaskDialog = true">Quick add</v-btn>
            <button class="account-row" type="button" @click="router.push('/profile')">
              <span class="account-avatar">{{ initials }}</span>
              <span><strong>{{ userStore.user?.name }}</strong><small>{{ userStore.user?.email }}</small></span>
              <v-icon size="18">mdi-chevron-right</v-icon>
            </button>
          </div>
        </template>
      </v-navigation-drawer>

      <v-app-bar flat class="app-topbar" height="72">
        <v-btn v-if="!mdAndUp" icon="mdi-menu" variant="text" aria-label="Open navigation" @click="drawer = true" />
        <div class="page-context">
          <small>{{ formattedDate }}</small><strong>{{ routeTitle }}</strong>
        </div>
        <v-spacer />
        <form class="top-search" role="search" @submit.prevent="submitSearch">
          <v-icon size="20">mdi-magnify</v-icon>
          <input v-model="searchQuery" type="search" aria-label="Search Remindly" placeholder="Search tasks and lists" />
          <kbd>/</kbd>
        </form>
        <v-btn icon="mdi-bell-outline" variant="text" aria-label="Notifications" @click="router.push('/notifications')" />
        <v-btn icon="mdi-cog-outline" variant="text" aria-label="Settings" @click="router.push('/settings')" />
      </v-app-bar>

      <v-main class="app-main"><router-view /></v-main>

      <nav v-if="!mdAndUp" class="mobile-nav" aria-label="Mobile navigation">
        <RouterLink v-for="item in mobileNav" :key="item.to" :to="item.to">
          <v-icon>{{ item.icon }}</v-icon><span>{{ item.title }}</span>
        </RouterLink>
        <button type="button" class="mobile-capture" aria-label="Open voice assistant" @click="router.push('/assistant')">
          <v-icon>mdi-waveform</v-icon><span>Capture</span>
        </button>
      </nav>

      <v-dialog v-model="showAddTaskDialog" max-width="560">
        <v-card class="quick-add-card">
          <v-card-title>Capture a task</v-card-title>
          <v-card-subtitle>Write it now. Organize the details without losing the thought.</v-card-subtitle>
          <v-card-text>
            <v-form ref="taskForm" v-model="taskFormValid">
              <v-text-field v-model.trim="newTask.title" label="What needs doing?" variant="outlined"
                :rules="[required]" autofocus />
              <v-select v-model="newTask.listId" :items="listStore.lists" item-title="name" item-value="id"
                label="List" variant="outlined" :rules="[required]" />
              <div class="quick-add-grid">
                <v-text-field v-model="newTask.dueDate" type="date" label="Date" variant="outlined" />
                <v-text-field v-model="newTask.dueTime" type="time" label="Time" variant="outlined" />
              </div>
            </v-form>
          </v-card-text>
          <v-card-actions><v-btn variant="text" @click="showAddTaskDialog = false">Cancel</v-btn><v-spacer />
            <v-btn color="primary" :loading="taskStore.loading" :disabled="!taskFormValid" @click="addTask">Add task</v-btn></v-card-actions>
        </v-card>
      </v-dialog>
    </template>

    <v-main v-else class="public-main"><router-view /></v-main>
  </v-app>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
import { useUserStore } from '@/stores/userStore'
import { useTaskStore } from '@/stores/taskStore'
import { useListStore } from '@/stores/listStore'

const router = useRouter()
const route = useRoute()
const { mdAndUp } = useDisplay()
const userStore = useUserStore()
const taskStore = useTaskStore()
const listStore = useListStore()
const drawer = ref(false)
const searchQuery = ref('')
const showAddTaskDialog = ref(false)
const taskFormValid = ref(false)
const taskForm = ref()
const newTask = ref({ title: '', description: '', listId: '', dueDate: '', dueTime: '', priority: 'medium' as const })
const required = (value: string) => Boolean(value) || 'Required'

const primaryNav = [
  { title: 'Today', icon: 'mdi-weather-sunny', to: '/' },
  { title: 'All tasks', icon: 'mdi-check-circle-outline', to: '/tasks' },
  { title: 'Voice assistant', icon: 'mdi-waveform', to: '/assistant' },
  { title: 'Server steward', icon: 'mdi-server-security', to: '/server-steward' }
]
const collectionNav = [
  { title: 'Lists', icon: 'mdi-format-list-bulleted', to: '/lists' },
  { title: 'Shopping', icon: 'mdi-cart-outline', to: '/shopping-lists' },
  { title: 'Appointments', icon: 'mdi-calendar-blank-outline', to: '/appointment-lists' },
  { title: 'Ideas', icon: 'mdi-lightbulb-outline', to: '/ideas-lists' },
  { title: 'Voice notes', icon: 'mdi-microphone-outline', to: '/voice' },
  { title: 'Media', icon: 'mdi-image-outline', to: '/media-gallery' }
]
const mobileNav = [primaryNav[0], primaryNav[1], collectionNav[0], primaryNav[3]]
const routeTitle = computed(() => [...primaryNav, ...collectionNav].find(item => item.to === route.path)?.title || 'Remindly')
const initials = computed(() => userStore.user?.name?.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'R')
const formattedDate = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date())

const submitSearch = () => {
  const query = searchQuery.value.trim()
  if (query) router.push({ path: '/search', query: { q: query } })
}

const addTask = async () => {
  const validation = await taskForm.value?.validate()
  if (!validation?.valid) return
  const result = await taskStore.addTask(newTask.value)
  if (result?.success) {
    newTask.value = { title: '', description: '', listId: '', dueDate: '', dueTime: '', priority: 'medium' }
    showAddTaskDialog.value = false
  }
}

watch(mdAndUp, value => { drawer.value = value }, { immediate: true })
onMounted(async () => {
  if (!localStorage.getItem('token')) return
  await userStore.loadUser()
  if (userStore.isAuthenticated) await Promise.all([listStore.loadLists(), taskStore.loadTasks()])
})
</script>

<style scoped>
.app-sidebar{border-right:1px solid var(--line)!important;background:var(--surface)!important}.sidebar-brand{display:flex;align-items:center;gap:12px;margin:18px 18px 22px;padding:8px;cursor:pointer}.brand-symbol{display:grid;place-items:center;width:38px;height:38px;border-radius:12px;color:#132a3a;background:var(--accent)}.sidebar-brand strong,.sidebar-brand small{display:block}.sidebar-brand strong{font:700 1.18rem var(--font-display);color:var(--ink)}.sidebar-brand small{color:var(--ink-soft);font-size:.7rem}
.sidebar-nav{padding:0 12px}.sidebar-nav :deep(.v-list-item){min-height:46px;margin:3px 0;color:var(--ink-muted)}.sidebar-nav :deep(.v-list-item--active){color:var(--primary);background:var(--primary-soft)}.nav-section-label{margin:24px 22px 8px;color:var(--ink-soft);font:700 .7rem var(--font-utility);letter-spacing:.12em;text-transform:uppercase}.sidebar-nav--secondary :deep(.v-list-item){min-height:42px}
.sidebar-footer{padding:14px;border-top:1px solid var(--line)}.account-row{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px;width:100%;margin-top:12px;padding:8px;border:0;border-radius:12px;background:transparent;text-align:left;cursor:pointer}.account-row:hover{background:var(--surface-soft)}.account-row span:nth-child(2){min-width:0}.account-row strong,.account-row small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.account-row strong{color:var(--ink);font-size:.82rem}.account-row small{color:var(--ink-soft);font-size:.68rem}.account-avatar{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;color:#fff;background:var(--primary);font-size:.72rem;font-weight:750}
.app-topbar{border-bottom:1px solid var(--line)!important;background:rgba(248,250,251,.92)!important;backdrop-filter:blur(14px)}.page-context{display:flex;flex-direction:column;margin-left:18px}.page-context small{color:var(--ink-soft);font-size:.7rem}.page-context strong{color:var(--ink);font-size:1rem}.top-search{display:flex;align-items:center;gap:10px;width:min(34vw,360px);height:42px;margin-right:12px;padding:0 12px;border:1px solid var(--line);border-radius:12px;background:var(--surface)}.top-search input{min-width:0;flex:1;border:0;outline:0;color:var(--ink);background:transparent}.top-search kbd{padding:2px 7px;border:1px solid var(--line);border-radius:5px;color:var(--ink-soft);background:var(--surface-soft);font-size:.7rem}
.app-main{min-height:100dvh;background:var(--surface-soft)}.public-main{padding:0!important}.quick-add-card{padding:12px;border-radius:24px!important}.quick-add-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.mobile-nav{position:fixed;z-index:1100;left:10px;right:10px;bottom:max(10px,env(safe-area-inset-bottom));display:grid;grid-template-columns:repeat(5,1fr);align-items:end;padding:8px;border:1px solid var(--line);border-radius:20px;background:rgba(255,255,255,.94);box-shadow:var(--shadow-lg);backdrop-filter:blur(18px)}.mobile-nav a,.mobile-nav button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-width:48px;min-height:48px;border:0;color:var(--ink-soft);background:none;font-size:.62rem;text-decoration:none}.mobile-nav a.router-link-active{color:var(--primary)}.mobile-capture{color:#fff!important;border-radius:14px!important;background:var(--primary)!important}.mobile-capture .v-icon{font-size:22px}
@media(max-width:959px){.app-main{padding-bottom:88px}.top-search{display:none}.page-context{margin-left:6px}.quick-add-grid{grid-template-columns:1fr}}
</style>
