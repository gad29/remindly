<template>
  <div class="ideas-list-view">
    <!-- Header Section -->
    <div class="header-section">
      <div class="header-content">
        <v-icon class="mr-2 header-icon">mdi-lightbulb-outline</v-icon>
        <h1 class="app-title">IDEAS</h1>
        <p class="app-subtitle">{{ ideasList?.description || 'New App Features & Travel Plans' }}</p>
      </div>
    </div>

    <!-- Main Content -->
    <v-container fluid class="pa-4">
      <v-row>
        <v-col cols="12">
          <v-card class="ideas-list-card" elevation="4">
            <v-card-text class="pa-6">
              <!-- Error Message -->
              <v-alert v-if="error && !loading" type="error" class="mb-4" dismissible @click:close="error = null">
                {{ error }}
              </v-alert>

              <!-- Loading State -->
              <div v-if="loading" class="text-center pa-8">
                <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
                <p class="mt-4">Loading ideas...</p>
              </div>

              <!-- Ideas List -->
              <div v-else-if="ideas.length > 0" class="ideas-list">
                <div
                  v-for="idea in ideas"
                  :key="idea.id"
                  class="idea-item"
                  :class="{ 'completed': idea.completed }"
                >
                  <div class="idea-left">
                    <v-checkbox-btn
                      v-model="idea.completed"
                      color="primary"
                      @click.stop="toggleIdeaCompletion(idea)"
                    />
                  </div>
                  
                  <div class="idea-content">
                    <h3 class="idea-title">{{ idea.title }}</h3>
                    <p v-if="idea.description" class="idea-description">{{ idea.description }}</p>
                    <div v-if="idea.date || idea.time" class="idea-date-time">
                      <v-icon size="16" class="mr-1">mdi-calendar-clock</v-icon>
                      <span v-if="idea.date">{{ formatDate(idea.date) }}</span>
                      <span v-if="idea.date && idea.time" class="mx-1">•</span>
                      <span v-if="idea.time">{{ idea.time }}</span>
                    </div>
                  </div>
                  
                  <div class="idea-actions">
                    <v-btn
                      icon
                      variant="text"
                      size="small"
                      @click.stop="editIdea(idea)"
                    >
                      <v-icon>mdi-pencil</v-icon>
                    </v-btn>
                    <v-btn
                      icon
                      variant="text"
                      size="small"
                      @click.stop="deleteIdea(idea)"
                    >
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                  </div>
                </div>
              </div>

              <!-- Empty State -->
              <div v-else class="empty-state">
                <v-icon size="80" color="grey" class="mb-4">mdi-lightbulb-outline</v-icon>
                <h3 class="empty-title">No Ideas Yet</h3>
                <p class="empty-description">Add your first idea to this list</p>
              </div>

              <!-- Action Buttons Section -->
              <div class="add-item-section">
                <div class="action-buttons-row">
                  <v-btn
                    color="primary"
                    size="large"
                    @click="showAddIdeaDialog = true"
                    class="add-item-button"
                  >
                    <v-icon start>mdi-plus</v-icon>
                    Add Idea
                  </v-btn>
                  
                  <v-btn
                    color="secondary"
                    size="large"
                    @click="printOrSavePDF"
                    class="action-button"
                    :disabled="ideas.length === 0"
                  >
                    <v-icon start>mdi-printer</v-icon>
                    Save/Print PDF
                  </v-btn>
                  
                  <v-menu>
                    <template v-slot:activator="{ props }">
                      <v-btn
                        color="success"
                        size="large"
                        v-bind="props"
                        class="action-button"
                        :disabled="ideas.length === 0"
                      >
                        <v-icon start>mdi-share-variant</v-icon>
                        Share
                      </v-btn>
                    </template>
                    <v-list>
                      <v-list-item @click="shareViaWhatsApp">
                        <v-list-item-title>
                          <v-icon class="mr-2">mdi-whatsapp</v-icon>
                          WhatsApp
                        </v-list-item-title>
                      </v-list-item>
                      <v-list-item @click="shareViaSMS">
                        <v-list-item-title>
                          <v-icon class="mr-2">mdi-message-text</v-icon>
                          SMS
                        </v-list-item-title>
                      </v-list-item>
                      <v-list-item @click="shareViaEmail">
                        <v-list-item-title>
                          <v-icon class="mr-2">mdi-email</v-icon>
                          Email
                        </v-list-item-title>
                      </v-list-item>
                      <v-list-item @click="copyShareLink">
                        <v-list-item-title>
                          <v-icon class="mr-2">mdi-link</v-icon>
                          Copy Link
                        </v-list-item-title>
                      </v-list-item>
                      <v-list-item v-if="canUseWebShare" @click="shareViaWebAPI">
                        <v-list-item-title>
                          <v-icon class="mr-2">mdi-share</v-icon>
                          More Options
                        </v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <!-- Add/Edit Idea Dialog -->
    <v-dialog v-model="showAddIdeaDialog" max-width="500">
      <v-card>
        <v-card-title class="text-h5">{{ isEditing ? 'Edit Idea' : 'Add New Idea' }}</v-card-title>
        <v-card-text>
          <v-form ref="ideaForm" v-model="ideaFormValid">
            <v-text-field
              v-model="currentIdea.title"
              label="Idea Title"
              :rules="[rules.required]"
              required
              class="mb-4"
            />
            <v-textarea
              v-model="currentIdea.description"
              label="Description (Optional)"
              rows="3"
              class="mb-4"
            />
            <v-menu
              v-model="dateMenu"
              :close-on-content-click="false"
              transition="scale-transition"
              offset-y
              min-width="auto"
            >
              <template v-slot:activator="{ props }">
                <v-text-field
                  v-model="currentIdea.date"
                  label="Date (Optional)"
                  readonly
                  v-bind="props"
                  prepend-inner-icon="mdi-calendar"
                  class="mb-4"
                />
              </template>
              <v-date-picker
                v-model="currentIdea.date"
                @update:model-value="dateMenu = false"
              />
            </v-menu>
            <v-menu
              v-model="timeMenu"
              :close-on-content-click="false"
              transition="scale-transition"
              offset-y
              min-width="auto"
            >
              <template v-slot:activator="{ props }">
                <v-text-field
                  v-model="currentIdea.time"
                  label="Time (Optional)"
                  readonly
                  v-bind="props"
                  prepend-inner-icon="mdi-clock-outline"
                  class="mb-4"
                />
              </template>
              <v-time-picker
                v-model="currentIdea.time"
                format="24hr"
                @update:model-value="timeMenu = false"
              />
            </v-menu>
            <v-checkbox
              v-model="currentIdea.completed"
              label="Completed"
              class="mb-4"
            />
            <v-divider class="my-4"></v-divider>
            <v-checkbox
              v-model="currentIdea.hasReminder"
              label="Enable Reminder"
              class="mb-4"
            />
            <v-select
              v-if="currentIdea.hasReminder"
              v-model="currentIdea.reminderBefore"
              :items="reminderOptions"
              label="Remind me"
              item-title="label"
              item-value="value"
              class="mb-4"
            />
            <v-select
              v-if="currentIdea.hasReminder"
              v-model="currentIdea.reminderType"
              :items="reminderTypes"
              label="Reminder Type"
              item-title="label"
              item-value="value"
              class="mb-4"
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="cancelIdeaDialog">Cancel</v-btn>
          <v-btn color="primary" @click="saveIdea" :disabled="!ideaFormValid">
            {{ isEditing ? 'Save Changes' : 'Add Idea' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useListStore } from '@/stores/listStore'
import { useTaskStore } from '@/stores/taskStore'
import { apiService } from '@/utils/api'

const route = useRoute()
const router = useRouter()
const listStore = useListStore()
const taskStore = useTaskStore()

// Helper function to check if string is a valid UUID
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

const ideasListId = computed(() => {
  const id = route.params.id as string
  if (!isValidUUID(id)) {
    return null
  }
  return id
})

const loading = ref(false)
const error = ref<string | null>(null)

const showAddIdeaDialog = ref(false)
const ideaFormValid = ref(false)
const isEditing = ref(false)
const dateMenu = ref(false)
const timeMenu = ref(false)

const currentIdea = ref({
  id: '',
  title: '',
  description: '',
  date: '',
  time: '',
  completed: false,
  hasReminder: false,
  reminderBefore: 15, // minutes before
  reminderType: 'push', // push, sms, email, call
})

const rules = {
  required: (value: any) => !!value || 'Required field',
}

const reminderOptions = [
  { label: '5 minutes before', value: 5 },
  { label: '15 minutes before', value: 15 },
  { label: '30 minutes before', value: 30 },
  { label: '1 hour before', value: 60 },
  { label: '2 hours before', value: 120 },
  { label: '1 day before', value: 1440 },
  { label: '2 days before', value: 2880 },
]

const reminderTypes = [
  { label: 'Push Notification', value: 'push' },
  { label: 'SMS', value: 'sms' },
  { label: 'Email', value: 'email' },
  { label: 'Phone Call', value: 'call' },
]

// Ideas list and tasks (ideas are stored as tasks)
const ideasList = computed(() => {
  if (!ideasListId.value) return null
  return listStore.getListById(ideasListId.value) || null
})

const ideas = computed(() => {
  if (!ideasListId.value) return []
  const tasks = taskStore.getTasksByListId(ideasListId.value)
  // Convert tasks to ideas format
  return tasks.map(task => ({
    id: task.id,
    title: task.title,
    description: task.description || '',
    date: task.dueDate || '',
    time: task.dueTime || '',
    completed: task.completed || false,
  }))
})

const toggleIdeaCompletion = async (idea: any) => {
  if (!ideasListId.value) {
    error.value = 'Invalid list ID. Cannot toggle idea.'
    return
  }
  try {
    await taskStore.toggleTaskCompletion(idea.id)
    error.value = null
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to toggle idea'
    console.error('Error toggling idea:', err)
  }
}

const addIdea = () => {
  isEditing.value = false
  currentIdea.value = {
    id: '',
    title: '',
    description: '',
    date: '',
    time: '',
    completed: false,
    hasReminder: false,
    reminderBefore: 15,
    reminderType: 'push',
  }
  showAddIdeaDialog.value = true
}

const editIdea = (idea: any) => {
  isEditing.value = true
  currentIdea.value = {
    id: idea.id,
    title: idea.title,
    description: idea.description || '',
    date: idea.date || '',
    time: idea.time || '',
    completed: idea.completed || false,
    hasReminder: false, // Reset reminder when editing
    reminderBefore: 15,
    reminderType: 'push',
  }
  showAddIdeaDialog.value = true
}

const saveIdea = async () => {
  if (!ideaFormValid.value) {
    error.value = 'Please fill in all required fields'
    return
  }

  if (!ideasListId.value) {
    error.value = 'Invalid list ID. Please create a new ideas list.'
    return
  }

  try {
    // Format date and time
    let formattedDate = currentIdea.value.date
    if (formattedDate) {
      if (formattedDate instanceof Date) {
        formattedDate = formattedDate.toISOString().split('T')[0]
      } else if (typeof formattedDate === 'string') {
        if (formattedDate.includes('T')) {
          formattedDate = formattedDate.split('T')[0]
        }
      }
    }
    
    let formattedTime = currentIdea.value.time
    if (formattedTime) {
      if (formattedTime instanceof Date) {
        const hours = String(formattedTime.getHours()).padStart(2, '0')
        const minutes = String(formattedTime.getMinutes()).padStart(2, '0')
        formattedTime = `${hours}:${minutes}`
      } else if (typeof formattedTime === 'string') {
        if (formattedTime.includes('T')) {
          formattedTime = formattedTime.split('T')[1]?.substring(0, 5) || formattedTime
        }
        if (formattedTime.length === 4) {
          formattedTime = `${formattedTime.substring(0, 2)}:${formattedTime.substring(2, 4)}`
        }
      }
    }
    
    let taskId: string
    
    if (isEditing.value) {
      await taskStore.updateTask(currentIdea.value.id, {
        title: currentIdea.value.title,
        description: currentIdea.value.description,
        dueDate: formattedDate || undefined,
        dueTime: formattedTime || undefined,
        completed: currentIdea.value.completed,
      })
      taskId = currentIdea.value.id
    } else {
      const result = await taskStore.addTask({
        title: currentIdea.value.title,
        description: currentIdea.value.description,
        listId: ideasListId.value,
        dueDate: formattedDate || undefined,
        dueTime: formattedTime || undefined,
        completed: currentIdea.value.completed,
      })
      taskId = result.task?.id || ''
    }
    
    // Create reminder if enabled (optional - can work with or without date/time)
    if (currentIdea.value.hasReminder && taskId) {
      try {
        let reminderTime: Date
        
        if (formattedDate && formattedTime) {
          // If date and time are provided, calculate reminder time based on them
          const ideaDateTime = new Date(`${formattedDate}T${formattedTime}`)
          reminderTime = new Date(ideaDateTime.getTime() - (currentIdea.value.reminderBefore * 60 * 1000))
        } else {
          // If no date/time, create reminder for the reminderBefore minutes from now
          reminderTime = new Date(new Date().getTime() + (currentIdea.value.reminderBefore * 60 * 1000))
        }
        
        // Only create reminder if reminder time is in the future
        if (reminderTime > new Date()) {
          let message = `Reminder for your idea: ${currentIdea.value.title}`
          if (currentIdea.value.description) {
            message += ` - ${currentIdea.value.description}`
          }
          if (formattedDate && formattedTime) {
            message += ` at ${formattedTime} on ${formattedDate}`
          }
          
          await apiService.reminders.create({
            taskId: taskId,
            reminderTime: reminderTime.toISOString(),
            reminderType: currentIdea.value.reminderType || 'push',
            title: `Reminder: ${currentIdea.value.title}`,
            message: message,
          })
        }
      } catch (reminderErr: any) {
        console.warn('Failed to create reminder:', reminderErr)
        // Don't fail the whole operation if reminder creation fails
      }
    }
    
    error.value = null
    dateMenu.value = false
    timeMenu.value = false
    cancelIdeaDialog()
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to save idea'
    console.error('Error saving idea:', err)
  }
}

const deleteIdea = async (idea: any) => {
  if (!confirm(`Are you sure you want to delete "${idea.title}"?`)) return
  
  try {
    await taskStore.deleteTask(idea.id)
    error.value = null
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to delete idea'
    console.error('Error deleting idea:', err)
  }
}

const cancelIdeaDialog = () => {
  showAddIdeaDialog.value = false
  isEditing.value = false
  dateMenu.value = false
  timeMenu.value = false
  currentIdea.value = {
    id: '',
    title: '',
    description: '',
    date: '',
    time: '',
    completed: false,
    hasReminder: false,
    reminderBefore: 15,
    reminderType: 'push',
  }
  error.value = null
}

const formatDate = (date: Date | string | undefined) => {
  if (!date) return ''
  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) {
      // If it's already a formatted date string, return it
      return date.toString()
    }
    return d.toLocaleDateString()
  } catch {
    return date.toString()
  }
}

const loadIdeasList = async () => {
  const id = route.params.id as string
  
  // Check if the ID is a valid UUID
  if (!isValidUUID(id)) {
    error.value = `Invalid list ID format. Please create a new ideas list from the ideas lists page.`
    // Redirect to ideas lists page after 3 seconds
    setTimeout(() => {
      router.push('/ideas-lists')
    }, 3000)
    return
  }

  loading.value = true
  error.value = null
  
  try {
    await listStore.loadLists()
    await taskStore.loadTasksByList(id)
  } catch (err: any) {
    console.error('Error loading ideas list:', err)
    error.value = err.response?.data?.error || 'Failed to load ideas list'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadIdeasList()
})

// Watch for route changes to reload data if list ID changes
watch(
  () => route.params.id,
  (newId, oldId) => {
    if (newId && newId !== oldId) {
      loadIdeasList()
    }
  }
)

// Share and Print functionality
const canUseWebShare = computed(() => {
  return typeof navigator !== 'undefined' && 'share' in navigator
})

const generateIdeasListText = () => {
  const listName = ideasList.value?.name || 'Ideas List'
  const description = ideasList.value?.description || ''
  let text = `💡 ${listName}\n`
  if (description) {
    text += `${description}\n\n`
  }
  text += 'Ideas:\n'
  ideas.value.forEach((idea) => {
    const checkbox = idea.completed ? '✅' : '☐'
    text += `${checkbox} ${idea.title}`
    if (idea.description) {
      text += ` - ${idea.description}`
    }
    text += '\n'
  })
  return text
}

const printOrSavePDF = () => {
  const listName = ideasList.value?.name || 'Ideas List'
  const description = ideasList.value?.description || ''
  
  // Create a hidden iframe for printing
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)
  
  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
  
  if (!iframeDoc) {
    error.value = 'Failed to create print window. Please try again.'
    document.body.removeChild(iframe)
    return
  }
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${listName}</title>
      <meta charset="UTF-8">
      <style>
        @media print {
          @page {
            margin: 1cm;
          }
        }
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
          max-width: 800px;
          margin: 0 auto;
        }
        h1 {
          color: #2c3e50;
          border-bottom: 3px solid #1976d2;
          padding-bottom: 10px;
        }
        .description {
          color: #666;
          margin-bottom: 20px;
          font-style: italic;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th {
          background-color: #1976d2;
          color: white;
          padding: 12px;
          text-align: left;
        }
        td {
          padding: 10px;
          border-bottom: 1px solid #ddd;
        }
        tr:nth-child(even) {
          background-color: #f5f5f5;
        }
        .completed {
          text-decoration: line-through;
          color: #999;
        }
        .checkbox {
          font-size: 18px;
          margin-right: 10px;
        }
      </style>
    </head>
    <body>
      <div style="text-align: center; margin-bottom: 20px; padding: 10px; background-color: #f5f5f5; border-radius: 8px;">
        <h2 style="margin: 0; color: #1976d2; font-size: 1.5rem; font-weight: 600;">רשימת רעיונות / Ideas List</h2>
      </div>
      <h1>${listName}</h1>
      ${description ? `<p class="description">${description}</p>` : ''}
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Idea</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          ${ideas.value.map(idea => `
            <tr class="${idea.completed ? 'completed' : ''}">
              <td><span class="checkbox">${idea.completed ? '✅' : '☐'}</span></td>
              <td>${idea.title || '-'}</td>
              <td>${idea.description || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <p style="margin-top: 30px; color: #666; font-size: 12px;">
        Generated from Remindly on ${new Date().toLocaleString()}
      </p>
    </body>
    </html>
  `
  
  iframeDoc.open()
  iframeDoc.write(htmlContent)
  iframeDoc.close()
  
  // Wait for content to load, then print
  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      setTimeout(() => {
        document.body.removeChild(iframe)
      }, 1000)
    }, 250)
  }
  
  // Fallback if onload doesn't fire
  setTimeout(() => {
    if (iframe.contentWindow) {
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe)
        }
      }, 1000)
    }
  }, 500)
}

const shareViaWhatsApp = () => {
  const text = generateIdeasListText()
  const encodedText = encodeURIComponent(text)
  const url = `https://wa.me/?text=${encodedText}`
  window.open(url, '_blank')
}

const shareViaSMS = () => {
  const text = generateIdeasListText()
  const encodedText = encodeURIComponent(text)
  const url = `sms:?body=${encodedText}`
  window.location.href = url
}

const shareViaEmail = () => {
  const subject = encodeURIComponent(ideasList.value?.name || 'Ideas List')
  const body = encodeURIComponent(generateIdeasListText())
  const url = `mailto:?subject=${subject}&body=${body}`
  window.location.href = url
}

const copyShareLink = async () => {
  const listId = route.params.id
  const shareUrl = `${window.location.origin}/ideas-list/${listId}`
  
  try {
    await navigator.clipboard.writeText(shareUrl)
    alert('Link copied to clipboard!')
  } catch (err) {
    console.error('Failed to copy link:', err)
    error.value = 'Failed to copy link. Please copy manually: ' + shareUrl
  }
}

const shareViaWebAPI = async () => {
  if (!canUseWebShare.value) return
  
  const text = generateIdeasListText()
  const listId = route.params.id
  const shareUrl = `${window.location.origin}/ideas-list/${listId}`
  
  try {
    await navigator.share({
      title: ideasList.value?.name || 'Ideas List',
      text: text,
      url: shareUrl
    })
  } catch (err: any) {
    if (err.name !== 'AbortError') {
      console.error('Error sharing:', err)
      error.value = 'Failed to share. Please try another method.'
    }
  }
}
</script>

<style scoped>
.ideas-list-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #87CEEB 0%, #98FB98 50%, #DDA0DD 100%);
  padding: 0;
}

.header-section {
  background: linear-gradient(135deg, #87CEEB 0%, #98FB98 50%, #DDA0DD 100%);
  padding: 2rem 1rem;
  text-align: center;
}

.header-content {
  max-width: 100%;
  margin: 0 auto;
  padding: 0 2rem;
}

.header-icon {
  color: white;
  font-size: 2rem;
}

.app-title {
  font-size: 3rem;
  font-weight: 900;
  color: #2c3e50;
  margin: 0;
  letter-spacing: 3px;
  text-align: center;
}

.app-subtitle {
  font-size: 1.2rem;
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
  letter-spacing: 2px;
  text-align: center;
}

.ideas-list-card {
  border-radius: 16px;
  overflow: hidden;
}

.ideas-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.idea-item {
  display: flex;
  align-items: center;
  padding: 16px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.idea-item.completed {
  opacity: 0.7;
  background-color: #f0f0f0;
}

.idea-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.idea-left {
  margin-right: 16px;
}

.idea-content {
  flex: 1;
}

.idea-title {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 4px 0;
}

.idea-item.completed .idea-title {
  text-decoration: line-through;
  color: #999;
}

.idea-description {
  font-size: 14px;
  color: #666;
  margin: 0;
}

.idea-date-time {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.idea-actions {
  margin-left: 16px;
  display: flex;
  gap: 4px;
}

.add-item-section {
  text-align: center;
  padding-top: 1rem;
  border-top: 1px solid #e0e0e0;
  margin-top: 1rem;
}

.action-buttons-row {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
  align-items: center;
}

.add-item-button,
.action-button {
  font-size: 1.1rem;
  font-weight: 600;
  padding: 12px 32px;
  text-transform: none;
  letter-spacing: 1px;
  min-width: 160px;
}

@media (max-width: 600px) {
  .action-buttons-row {
    flex-direction: column;
    width: 100%;
  }
  
  .add-item-button,
  .action-button {
    width: 100%;
    max-width: 300px;
  }
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
}

.empty-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 0.5rem 0;
}

.empty-description {
  font-size: 1rem;
  color: #666;
  margin: 0 0 2rem 0;
}

/* Responsive Design */
@media (max-width: 600px) {
  .app-title {
    font-size: 2rem;
  }

  .app-subtitle {
    font-size: 1rem;
  }

  .idea-item {
    padding: 12px;
  }

  .idea-title {
    font-size: 14px;
  }

  .idea-description {
    font-size: 12px;
  }
}
</style>
