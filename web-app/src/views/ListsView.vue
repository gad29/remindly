<template>
  <v-container class="routine-library" fluid>
    <header class="library-header">
      <div>
        <div class="kicker">REMINDLY LISTS</div>
        <h1>Your routine library</h1>
        <p>Turn any list into a calm, guided checklist. Open one to work through it step by step.</p>
      </div>
      <v-btn color="primary" size="large" prepend-icon="mdi-plus" @click="router.push('/lists/new')">New list</v-btn>
    </header>

    <section class="summary-strip" aria-label="List summary">
      <article><v-icon icon="mdi-format-list-checks"/><div><strong>{{ lists.length }}</strong><span>Lists</span></div></article>
      <article><v-icon icon="mdi-checkbox-blank-circle-outline"/><div><strong>{{ pendingTotal }}</strong><span>Still to do</span></div></article>
      <article><v-icon icon="mdi-check-circle-outline"/><div><strong>{{ completedTotal }}</strong><span>Completed</span></div></article>
    </section>

    <v-alert v-if="listStore.error" type="error" variant="tonal" class="mb-5">{{ listStore.error }}</v-alert>
    <div v-if="loading" class="loading-state"><v-progress-circular indeterminate color="primary"/><span>Loading your lists…</span></div>

    <div v-else-if="lists.length" class="list-grid">
      <article v-for="list in lists" :key="list.id" class="routine-card" @click="openList(list)" @keydown.enter="openList(list)" tabindex="0">
        <div class="card-top">
          <span class="list-icon" :style="{ background: `${list.color}18`, color: list.color }"><v-icon :icon="list.icon || 'mdi-format-list-checks'"/></span>
          <v-menu>
            <template #activator="{ props }"><v-btn v-bind="props" icon="mdi-dots-horizontal" variant="text" aria-label="List actions" @click.stop/></template>
            <v-list density="compact"><v-list-item prepend-icon="mdi-delete-outline" title="Delete list" @click="deleteList(list)"/></v-list>
          </v-menu>
        </div>
        <h2>{{ list.name }}</h2>
        <p>{{ list.description || 'A flexible routine ready for your next step.' }}</p>
        <div class="progress-copy"><span>{{ list.completedCount || 0 }} of {{ list.taskCount || 0 }} complete</span><strong>{{ progress(list) }}%</strong></div>
        <v-progress-linear :model-value="progress(list)" height="7" rounded color="primary" bg-color="#dce8e4"/>
        <div class="card-foot"><span>{{ nextLabel(list) }}</span><v-icon icon="mdi-arrow-right"/></div>
      </article>
    </div>

    <section v-else class="empty-state">
      <span class="empty-icon"><v-icon icon="mdi-format-list-checks" size="38"/></span>
      <h2>Build your first routine</h2>
      <p>Create a list for anything you want to finish carefully, one clear step at a time.</p>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="router.push('/lists/new')">Create a list</v-btn>
    </section>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useListStore } from '@/stores/listStore'
import type { List } from '@/types'

const router = useRouter()
const listStore = useListStore()
const lists = computed(() => listStore.lists)
const loading = computed(() => listStore.loading)
const completedTotal = computed(() => lists.value.reduce((sum, list) => sum + (list.completedCount || 0), 0))
const pendingTotal = computed(() => lists.value.reduce((sum, list) => sum + Math.max(0, (list.taskCount || 0) - (list.completedCount || 0)), 0))
const progress = (list: List) => list.taskCount ? Math.round(((list.completedCount || 0) / list.taskCount) * 100) : 0
const nextLabel = (list: List) => list.taskCount ? (progress(list) === 100 ? 'Routine complete' : 'Continue routine') : 'Add the first task'
const openList = (list: List) => router.push(`/lists/${list.id}`)
const deleteList = async (list: List) => {
  if (confirm(`Delete “${list.name}” and all of its tasks?`)) await listStore.deleteList(list.id)
}
onMounted(() => listStore.loadLists())
</script>

<style scoped>
.routine-library{max-width:1180px;padding:42px 28px 80px}.library-header{display:flex;justify-content:space-between;align-items:end;gap:28px;margin-bottom:30px}.library-header h1{font-size:clamp(2.4rem,5vw,4.5rem);line-height:.96;letter-spacing:-.055em;margin:0 0 14px;color:#173d3a}.library-header p{max-width:620px;color:#687572;margin:0}.kicker{font:700 11px ui-monospace,monospace;letter-spacing:.14em;color:#245b55;margin-bottom:10px}.summary-strip{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:28px}.summary-strip article{display:flex;align-items:center;gap:13px;padding:17px 18px;border:1px solid #dce3df;border-radius:16px;background:#fff}.summary-strip .v-icon{color:#245b55}.summary-strip div{display:flex;flex-direction:column}.summary-strip strong{font-size:1.35rem;color:#173d3a}.summary-strip span{font-size:.75rem;color:#687572}.list-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}.routine-card{background:#fff;border:1px solid #dce3df;border-radius:20px;padding:20px;cursor:pointer;transition:border-color .2s ease,box-shadow .2s ease;outline:none}.routine-card:hover,.routine-card:focus-visible{border-color:#7fa8a0;box-shadow:0 12px 30px rgba(23,61,58,.09)}.card-top,.progress-copy,.card-foot{display:flex;align-items:center;justify-content:space-between}.list-icon{width:46px;height:46px;border-radius:14px;display:grid;place-items:center}.routine-card h2{font-size:1.25rem;color:#173d3a;margin:20px 0 7px}.routine-card p{color:#687572;min-height:42px;font-size:.88rem}.progress-copy{font-size:.72rem;color:#687572;margin:20px 0 8px}.progress-copy strong{color:#245b55}.card-foot{border-top:1px solid #edf1ef;margin-top:18px;padding-top:15px;font-size:.78rem;font-weight:700;color:#245b55}.loading-state,.empty-state{min-height:320px;display:grid;place-content:center;justify-items:center;text-align:center;gap:14px}.empty-state p{max-width:420px;color:#687572}.empty-icon{width:70px;height:70px;border-radius:22px;background:#dceee6;color:#245b55;display:grid;place-items:center}@media(max-width:700px){.routine-library{padding:26px 14px 78px}.library-header{align-items:flex-start;flex-direction:column}.library-header .v-btn{width:100%}.summary-strip{grid-template-columns:1fr}.list-grid{grid-template-columns:1fr}}
</style>
