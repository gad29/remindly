<template>
  <v-container class="assistant-page" fluid>
    <header class="assistant-header">
      <div>
        <div class="kicker">REMINDLY ASSISTANT</div>
        <h1>Speak it. Review it. Then update.</h1>
        <p>Turn natural speech into task changes without giving AI permission to act on its own.</p>
      </div>
      <v-chip :color="online ? 'success' : 'grey'" variant="tonal" size="small">
        <v-icon start size="14">{{ online ? 'mdi-cloud-check' : 'mdi-cloud-off-outline' }}</v-icon>
        {{ online ? 'Online' : 'Offline' }}
      </v-chip>
    </header>

    <v-alert v-if="statusLoaded && !configured" type="info" variant="tonal" class="mb-5">
      Add <code>OPENROUTER_API_KEY</code> to the backend environment to enable the assistant. The key stays on the server.
    </v-alert>

    <div class="assistant-grid">
      <v-card class="capture-card" elevation="0">
        <div class="pulse-wrap" :class="{ listening }">
          <button class="voice-pulse" :disabled="!canUseAssistant" @click="toggleListening" :aria-label="listening ? 'Stop listening' : 'Start listening'">
            <v-icon size="38">{{ listening ? 'mdi-stop' : 'mdi-microphone' }}</v-icon>
          </button>
          <span class="pulse-ring"></span>
        </div>
        <h2>{{ listening ? 'Listening…' : 'Tell Remindly what changed' }}</h2>
        <p class="hint">Try “Remind me to update Coolify Friday” or “Mark the server backup task done.”</p>

        <v-textarea v-model="command" label="What should Remindly understand?" variant="outlined" rows="5" auto-grow :disabled="loading" class="mt-5" />
        <div class="capture-actions">
          <span class="privacy"><v-icon size="15">mdi-shield-lock-outline</v-icon> Your command and recent task context are sent to OpenRouter only when you request a proposal</span>
          <v-btn color="primary" :loading="loading" :disabled="!canPreview" @click="previewCommand">
            Review proposed changes
          </v-btn>
        </div>
      </v-card>

      <v-card class="proposal-card" elevation="0">
        <div class="proposal-head">
          <div><div class="kicker">CONFIRMATION REQUIRED</div><h2>Proposal ledger</h2></div>
          <v-chip v-if="preview" size="x-small" variant="outlined">{{ preview.model }}</v-chip>
        </div>

        <div v-if="!preview" class="empty-proposal">
          <v-icon size="42">mdi-text-box-search-outline</v-icon>
          <strong>No proposal yet</strong>
          <span>Your tasks stay unchanged until a proposal appears here and you approve it.</span>
        </div>

        <template v-else>
          <v-alert v-if="preview.reply" color="blue-grey" variant="tonal" density="compact" class="mb-4">{{ preview.reply }}</v-alert>
          <div v-if="preview.actions.length" class="action-list">
            <article v-for="(action, index) in preview.actions" :key="index" class="action-row">
              <v-icon :color="actionColor(action.type)">{{ actionIcon(action.type) }}</v-icon>
              <div><strong>{{ actionTitle(action) }}</strong><p>{{ action.explanation }}</p><small v-if="action.dueDate">{{ action.dueDate }} {{ action.dueTime || '' }}</small></div>
            </article>
          </div>
          <div v-else class="empty-proposal compact"><strong>No task changes proposed</strong><span>{{ preview.summary }}</span></div>
          <div class="proposal-actions">
            <v-btn variant="text" @click="discardPreview">Discard</v-btn>
            <v-btn color="success" :loading="applying" :disabled="!preview.actions.length" @click="applyChanges">
              Confirm {{ preview.actions.length }} change{{ preview.actions.length === 1 ? '' : 's' }}
            </v-btn>
          </div>
        </template>
      </v-card>
    </div>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color">{{ snackbar.text }}</v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { apiService } from '@/utils/api'
import { useTaskStore } from '@/stores/taskStore'
import { useUserStore } from '@/stores/userStore'
import type { AssistantAction, AssistantPreview } from '@/types'

const taskStore = useTaskStore()
const userStore = useUserStore()
const online = ref(navigator.onLine)
const configured = ref(false)
const statusLoaded = ref(false)
const command = ref('')
const preview = ref<AssistantPreview | null>(null)
const loading = ref(false)
const applying = ref(false)
const listening = ref(false)
const snackbar = ref({ show: false, text: '', color: 'success' })
let recognition: any = null

const speechSupported = computed(() => Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition))
const canUseAssistant = computed(() => online.value && configured.value && !loading.value)
const canPreview = computed(() => canUseAssistant.value && command.value.trim().length > 0)

const notify = (text: string, color = 'success') => { snackbar.value = { show: true, text, color } }
const setOnline = () => { online.value = navigator.onLine }

const loadStatus = async () => {
  try { const response = await apiService.assistant.status(); configured.value = Boolean(response.data.data?.configured) }
  catch { configured.value = false }
  finally { statusLoaded.value = true }
}

const setupRecognition = () => {
  if (!speechSupported.value) return
  const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  recognition = new Recognition()
  recognition.continuous = false
  recognition.interimResults = true
  recognition.lang = userStore.userLanguage === 'he' ? 'he-IL' : 'en-US'
  recognition.onresult = (event: any) => {
    command.value = Array.from(event.results).map((result: any) => result[0].transcript).join(' ')
  }
  recognition.onend = () => { listening.value = false }
  recognition.onerror = () => { listening.value = false; notify('Voice recognition stopped. You can type the command instead.', 'warning') }
}

const toggleListening = () => {
  if (!speechSupported.value) return notify('Voice recognition is not supported in this browser. Type the command instead.', 'warning')
  if (listening.value) { recognition?.stop(); return }
  command.value = ''
  listening.value = true
  recognition.start()
}

const previewCommand = async () => {
  loading.value = true; preview.value = null
  try {
    const response = await apiService.assistant.preview(command.value.trim(), userStore.userLanguage as 'he' | 'en')
    preview.value = response.data.data as AssistantPreview
  } catch (error: any) { notify(error.response?.data?.error || 'The assistant could not prepare a proposal.', 'error') }
  finally { loading.value = false }
}

const applyChanges = async () => {
  if (!preview.value) return
  applying.value = true
  try {
    const response = await apiService.assistant.apply(preview.value.actions)
    await taskStore.loadTasks()
    notify(response.data.message || 'Remindly was updated')
    preview.value = null; command.value = ''
  } catch (error: any) { notify(error.response?.data?.error || 'The changes could not be applied.', 'error') }
  finally { applying.value = false }
}

const discardPreview = () => { preview.value = null }
const actionIcon = (type: string) => ({ create_task: 'mdi-plus-circle-outline', update_task: 'mdi-pencil-outline', complete_task: 'mdi-check-circle-outline', reopen_task: 'mdi-restore' }[type] || 'mdi-circle-outline')
const actionColor = (type: string) => type === 'complete_task' ? 'success' : type === 'reopen_task' ? 'warning' : 'primary'
const actionTitle = (action: AssistantAction) => ({ create_task: `Create: ${action.title}`, update_task: `Update: ${action.title || 'existing task'}`, complete_task: `Complete: ${action.title || 'existing task'}`, reopen_task: `Reopen: ${action.title || 'existing task'}` }[action.type])

onMounted(() => { loadStatus(); setupRecognition(); window.addEventListener('online', setOnline); window.addEventListener('offline', setOnline) })
onBeforeUnmount(() => { recognition?.stop(); window.removeEventListener('online', setOnline); window.removeEventListener('offline', setOnline) })
</script>

<style scoped>
.assistant-page{max-width:1280px;padding:40px 28px 80px}.assistant-header{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;margin-bottom:28px}.assistant-header h1{font-size:clamp(2rem,5vw,4.5rem);line-height:.95;letter-spacing:-.055em;max-width:760px}.assistant-header p{color:#687572;max-width:620px;margin-top:16px}.kicker{font:700 11px/1.2 monospace;letter-spacing:.14em;color:#245b55;margin-bottom:9px}.assistant-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.capture-card,.proposal-card{border:1px solid #dce3df!important;border-radius:24px!important;padding:30px}.capture-card{text-align:center;background:#f7faf8}.pulse-wrap{position:relative;width:116px;height:116px;margin:4px auto 20px;display:grid;place-items:center}.voice-pulse{position:relative;z-index:2;width:92px;height:92px;border:0;border-radius:50%;background:#173d3a;color:white;cursor:pointer}.voice-pulse:disabled{opacity:.4;cursor:not-allowed}.pulse-ring{position:absolute;inset:0;border:1px solid #8ab4a0;border-radius:50%}.listening .pulse-ring{animation:pulse 1.4s infinite}.capture-card h2,.proposal-card h2{font-size:1.45rem}.hint{color:#74817d;font-size:.85rem}.capture-actions{display:flex;align-items:center;justify-content:space-between;gap:15px}.privacy{font-size:.72rem;color:#66736f;display:flex;align-items:center;gap:5px;text-align:left}.proposal-head{display:flex;justify-content:space-between;gap:15px}.empty-proposal{min-height:280px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:9px;color:#81908b}.empty-proposal span{max-width:330px;font-size:.82rem}.empty-proposal.compact{min-height:190px}.action-list{display:grid;gap:10px;margin:22px 0}.action-row{display:grid;grid-template-columns:30px 1fr;gap:12px;padding:14px;border:1px solid #e1e7e3;border-radius:14px}.action-row p{margin:3px 0;color:#697571;font-size:.78rem}.action-row small{font-family:monospace;color:#245b55}.proposal-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:20px}@keyframes pulse{70%{transform:scale(1.22);opacity:0}100%{opacity:0}}@media(max-width:800px){.assistant-grid{grid-template-columns:1fr}.assistant-header h1{font-size:2.6rem}.capture-actions{align-items:stretch;flex-direction:column}.assistant-page{padding:24px 14px 70px}}
</style>
