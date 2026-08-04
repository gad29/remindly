<template>
  <v-container class="collection-library" fluid>
    <header class="library-header">
      <div>
        <div class="kicker">{{ kicker }}</div>
        <h1>{{ title }}</h1>
        <p>{{ description }}</p>
      </div>
      <v-btn color="primary" size="large" prepend-icon="mdi-plus" @click="openCreate">{{ actionLabel }}</v-btn>
    </header>

    <section class="summary-strip" :aria-label="`${title} summary`">
      <article><v-icon :icon="icon"/><div><strong>{{ collections.length }}</strong><span>Collections</span></div></article>
      <article><v-icon icon="mdi-checkbox-blank-circle-outline"/><div><strong>{{ pendingTotal }}</strong><span>Open items</span></div></article>
      <article><v-icon icon="mdi-check-circle-outline"/><div><strong>{{ completedTotal }}</strong><span>Completed</span></div></article>
    </section>

    <v-alert v-if="error" type="error" variant="tonal" closable class="mb-5" @click:close="error = null">{{ error }}</v-alert>
    <div v-if="loading" class="loading-state"><v-progress-circular indeterminate color="primary"/><span>Loading {{ nounPlural.toLowerCase() }}…</span></div>

    <div v-else-if="collections.length" class="collection-grid">
      <article v-for="item in collections" :key="item.id" class="collection-card" tabindex="0" @click="open(item)" @keydown.enter="open(item)">
        <div class="card-top">
          <span class="collection-icon" :style="{ background: `${item.color || accent}18`, color: item.color || accent }"><v-icon :icon="item.icon || icon"/></span>
          <v-menu>
            <template #activator="{ props }"><v-btn v-bind="props" icon="mdi-dots-horizontal" variant="text" aria-label="Collection actions" @click.stop/></template>
            <v-list density="compact"><v-list-item prepend-icon="mdi-delete-outline" title="Delete collection" @click="remove(item)"/></v-list>
          </v-menu>
        </div>
        <h2>{{ item.name }}</h2>
        <p>{{ item.description || fallback }}</p>
        <div class="progress-copy"><span>{{ item.completedCount || 0 }} of {{ item.taskCount || 0 }} complete</span><strong>{{ progress(item) }}%</strong></div>
        <v-progress-linear :model-value="progress(item)" height="7" rounded color="primary" bg-color="#dce8e4"/>
        <div class="card-foot"><span>{{ item.taskCount ? 'Open collection' : firstItemLabel }}</span><v-icon icon="mdi-arrow-right"/></div>
      </article>
    </div>

    <section v-else class="empty-state">
      <span class="empty-icon"><v-icon :icon="icon" size="38"/></span>
      <h2>{{ emptyTitle }}</h2>
      <p>{{ emptyCopy }}</p>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">{{ actionLabel }}</v-btn>
    </section>

    <v-dialog v-model="dialog" max-width="560">
      <v-card class="create-dialog" rounded="xl">
        <v-card-text>
          <div class="dialog-icon"><v-icon :icon="icon"/></div>
          <div class="kicker">NEW COLLECTION</div>
          <h2>{{ actionLabel }}</h2>
          <p class="dialog-copy">Give it a useful name. You can start adding items as soon as it is created.</p>
          <v-form v-model="valid" @submit.prevent="create">
            <v-text-field v-model="draft.name" label="Name" variant="outlined" :rules="[required]" autofocus/>
            <v-textarea v-model="draft.description" label="Description (optional)" variant="outlined" rows="3"/>
            <div class="dialog-actions"><v-btn variant="text" @click="closeCreate">Cancel</v-btn><v-btn type="submit" color="primary" :disabled="!valid" :loading="creating">Create and open</v-btn></div>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useListStore } from '@/stores/listStore'
import type { List } from '@/types'

const props = defineProps<{ kind: 'shopping'|'appointments'|'ideas'; kicker: string; title: string; description: string; nounPlural: string; icon: string; accent: string; actionLabel: string; fallback: string; emptyTitle: string; emptyCopy: string; firstItemLabel: string; routePrefix: string }>()
const router = useRouter(); const store = useListStore(); const dialog = ref(false); const valid = ref(false); const creating = ref(false); const error = ref<string|null>(null)
const draft = reactive({ name: '', description: '' })
const kindIcons: Record<string,string[]> = { shopping:['mdi-cart','mdi-cart-outline','mdi-basket'], appointments:['mdi-calendar','mdi-calendar-clock','mdi-calendar-check'], ideas:['mdi-lightbulb','mdi-lightbulb-outline','mdi-head-lightbulb'] }
const keywords: Record<string,string[]> = { shopping:['shopping','grocery','קניות'], appointments:['appointment','calendar','תור'], ideas:['idea','brainstorm','רעיון'] }
const collections = computed(() => store.lists.filter(item => kindIcons[props.kind].includes(item.icon || '') || keywords[props.kind].some(word => item.name.toLowerCase().includes(word))))
const loading = computed(() => store.loading)
const completedTotal = computed(() => collections.value.reduce((sum,item) => sum + (item.completedCount || 0), 0))
const pendingTotal = computed(() => collections.value.reduce((sum,item) => sum + Math.max(0,(item.taskCount || 0) - (item.completedCount || 0)), 0))
const progress = (item: List) => item.taskCount ? Math.round(((item.completedCount || 0) / item.taskCount) * 100) : 0
const required = (value:string) => Boolean(value?.trim()) || 'Add a name'
const open = (item:List) => router.push(`${props.routePrefix}/${item.id}`)
const openCreate = () => { error.value = null; dialog.value = true }
const closeCreate = () => { dialog.value = false; draft.name=''; draft.description='' }
const create = async () => { if(!valid.value) return; creating.value=true; error.value=null; const result=await store.createList({name:draft.name.trim(),description:draft.description.trim(),icon:props.icon,color:props.accent}); creating.value=false; if(result.success && result.list){closeCreate();open(result.list)} else error.value=result.error || 'Could not create this collection' }
const remove = async (item:List) => { if(confirm(`Delete “${item.name}” and everything inside it?`)){const result=await store.deleteList(item.id);if(!result.success) error.value=result.error || 'Could not delete this collection'} }
onMounted(() => store.loadLists())
</script>

<style scoped>
.collection-library{max-width:1180px;padding:42px 28px 80px}.library-header{display:flex;justify-content:space-between;align-items:end;gap:28px;margin-bottom:30px}.library-header h1{font-size:clamp(2.4rem,5vw,4.5rem);line-height:.96;letter-spacing:-.055em;margin:0 0 14px;color:#173d3a}.library-header p{max-width:650px;color:#687572;margin:0}.kicker{font:700 11px ui-monospace,monospace;letter-spacing:.14em;color:#245b55;margin-bottom:10px}.summary-strip{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:28px}.summary-strip article{display:flex;align-items:center;gap:13px;padding:17px 18px;border:1px solid #dce3df;border-radius:16px;background:#fff}.summary-strip .v-icon{color:#245b55}.summary-strip div{display:flex;flex-direction:column}.summary-strip strong{font-size:1.35rem;color:#173d3a}.summary-strip span{font-size:.75rem;color:#687572}.collection-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}.collection-card{background:#fff;border:1px solid #dce3df;border-radius:20px;padding:20px;cursor:pointer;transition:border-color .2s,box-shadow .2s;outline:none}.collection-card:hover,.collection-card:focus-visible{border-color:#7fa8a0;box-shadow:0 12px 30px rgba(23,61,58,.09)}.card-top,.progress-copy,.card-foot{display:flex;align-items:center;justify-content:space-between}.collection-icon,.dialog-icon,.empty-icon{display:grid;place-items:center;background:#dceee6;color:#245b55}.collection-icon{width:46px;height:46px;border-radius:14px}.collection-card h2{font-size:1.25rem;color:#173d3a;margin:20px 0 7px}.collection-card p{color:#687572;min-height:42px;font-size:.88rem}.progress-copy{font-size:.72rem;color:#687572;margin:20px 0 8px}.progress-copy strong{color:#245b55}.card-foot{border-top:1px solid #edf1ef;margin-top:18px;padding-top:15px;font-size:.78rem;font-weight:700;color:#245b55}.loading-state,.empty-state{min-height:320px;display:grid;place-content:center;justify-items:center;text-align:center;gap:14px}.empty-state p{max-width:430px;color:#687572}.empty-icon{width:72px;height:72px;border-radius:22px}.create-dialog .v-card-text{padding:30px}.create-dialog h2{font-size:2rem;color:#173d3a;margin:4px 0 8px}.dialog-icon{width:52px;height:52px;border-radius:16px;margin-bottom:20px}.dialog-copy{color:#687572;margin-bottom:22px}.dialog-actions{display:flex;justify-content:flex-end;gap:8px}@media(max-width:700px){.collection-library{padding:26px 14px 78px}.library-header{align-items:flex-start;flex-direction:column}.library-header .v-btn{width:100%}.summary-strip{grid-template-columns:1fr}.collection-grid{grid-template-columns:1fr}.dialog-actions{flex-direction:column-reverse}.dialog-actions .v-btn{width:100%}}
</style>
