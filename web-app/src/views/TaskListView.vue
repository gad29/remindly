<template>
  <div class="task-list-view">
    <!-- Header Section -->
    <div class="header-section">
      <div class="header-content">
        <v-icon class="mr-2 header-icon" :color="toDoList?.color || 'white'">{{ toDoList?.icon || 'mdi-checkbox-marked-circle-outline' }}</v-icon>
        <h1 class="app-title">{{ toDoList?.name || 'TO-DOs' }}</h1>
        <p class="app-subtitle">{{ toDoList?.description || 'Work & Personal, This Week' }}</p>
      </div>
    </div>

    <!-- Main Content -->
    <v-container fluid class="pa-4">
      <v-row>
        <v-col cols="12">
          <v-card class="task-list-card" elevation="4">
            <v-card-text class="pa-6">
              <!-- Error Message -->
              <v-alert v-if="error && !loading" type="error" class="mb-4" dismissible @click:close="error = null">
                {{ error }}
              </v-alert>

              <!-- Loading State -->
              <div v-if="loading" class="text-center pa-8">
                <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
                <p class="mt-4">Loading tasks...</p>
              </div>

              <!-- Tasks List -->
              <div v-else-if="tasks.length > 0" class="tasks-list">
                <div
                  v-for="task in tasks"
                  :key="task.id"
                  class="task-item"
                  :class="{ 'completed': task.completed }"
                >
                  <div class="task-left">
                    <v-checkbox-btn
                      v-model="task.completed"
                      color="primary"
                      @click.stop="toggleTaskCompletion(task)"
                    />
                  </div>

                  <div class="task-content">
                    <h3 class="task-title">{{ task.title }}</h3>
                    <p v-if="task.description" class="task-description">{{ task.description }}</p>
                  </div>

                  <div class="task-actions">
                    <v-btn
                      icon
                      variant="text"
                      size="small"
                      @click.stop="editTask(task)"
                    >
                      <v-icon>mdi-pencil</v-icon>
                    </v-btn>
                    <v-btn
                      icon
                      variant="text"
                      size="small"
                      @click.stop="deleteTask(task)"
                    >
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                  </div>
                </div>
              </div>

              <!-- Empty State -->
              <div v-else-if="!loading" class="empty-state">
                <v-icon size="80" color="grey" class="mb-4">mdi-checkbox-marked-circle-outline</v-icon>
                <h3 class="empty-title">No Tasks Yet</h3>
                <p class="empty-description">Add your first task to this list</p>
              </div>

              <!-- Action Buttons Section -->
              <div class="add-item-section">
                <div class="action-buttons-row">
                  <v-btn
                    color="primary"
                    size="large"
                    @click="showAddTaskDialog = true"
                    class="add-item-button"
                  >
                    <v-icon start>mdi-plus</v-icon>
                    Add Task
                  </v-btn>
                  
                  <v-btn
                    color="secondary"
                    size="large"
                    @click="printOrSavePDF"
                    class="action-button"
                    :disabled="tasks.length === 0"
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
                        :disabled="tasks.length === 0"
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

      <!-- Add/Edit Task Dialog -->
      <v-dialog v-model="showAddTaskDialog" max-width="500">
        <v-card>
          <v-card-title class="text-h5">{{ isEditing ? 'Edit Task' : 'Add New Task' }}</v-card-title>
          <v-card-text>
            <v-form ref="taskForm" v-model="taskFormValid">
              <v-text-field
                v-model="currentTask.title"
                label="Task Title"
                :rules="[rules.required]"
                required
                class="mb-4"
              />
              <v-textarea
                v-model="currentTask.description"
                label="Description (Optional)"
                rows="3"
                class="mb-4"
              />
              <v-checkbox
                v-model="currentTask.completed"
                label="Mark as Completed"
                class="mb-4"
              />
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="grey" variant="text" @click="cancelTaskDialog">Cancel</v-btn>
            <v-btn color="primary" @click="saveTask" :disabled="!taskFormValid">{{ isEditing ? 'Save Changes' : 'Add Task' }}</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useListStore } from '@/stores/listStore'
import { useTaskStore } from '@/stores/taskStore'

const route = useRoute()
const router = useRouter()

// Helper function to check if string is a valid UUID
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

const listId = computed(() => {
  const id = route.params.id as string
  if (!isValidUUID(id)) {
    return null
  }
  return id
})

const error = ref<string | null>(null)

const listStore = useListStore()
const taskStore = useTaskStore()

const showAddTaskDialog = ref(false)
const taskFormValid = ref(false)
const isEditing = ref(false)
const currentTask = ref({
  id: '',
  title: '',
  description: '',
  completed: false,
  listId: '',
})

const toDoList = computed(() => {
  if (!listId.value) return null
  return listStore.getListById(listId.value) || null
})

const tasks = computed(() => {
  if (!listId.value) return []
  try {
    return taskStore.getTasksByListId(listId.value) || []
  } catch (err) {
    console.error('Error getting tasks by list ID:', err)
    return []
  }
})

const loading = computed(() => taskStore.loading || listStore.loading)

const rules = {
  required: (value: any) => !!value || 'Required field'
}

const toggleTaskCompletion = async (task: any) => {
  try {
    await taskStore.toggleTaskCompletion(task.id)
    error.value = null
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to toggle task completion'
    console.error('Error toggling task:', err)
  }
}

const editTask = (task: any) => {
  if (!listId.value) {
    error.value = 'Invalid list ID. Cannot edit task.'
    return
  }
  isEditing.value = true
  currentTask.value = { ...task, listId: listId.value }
  showAddTaskDialog.value = true
  error.value = null
}

const deleteTask = async (task: any) => {
  if (confirm(`Are you sure you want to delete "${task.title}"?`)) {
    try {
      await taskStore.deleteTask(task.id)
      error.value = null
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to delete task'
      console.error('Error deleting task:', err)
    }
  }
}

const saveTask = async () => {
  if (!taskFormValid.value) {
    error.value = 'Please fill in all required fields'
    return
  }

  if (!listId.value) {
    error.value = 'Invalid list ID. Please create a new task list.'
    return
  }

  try {
    if (isEditing.value) {
      await taskStore.updateTask(currentTask.value.id, {
        title: currentTask.value.title,
        description: currentTask.value.description,
        completed: currentTask.value.completed,
      })
    } else {
      await taskStore.addTask({
        title: currentTask.value.title,
        description: currentTask.value.description,
        listId: listId.value!,
        completed: currentTask.value.completed,
      })
    }
    error.value = null
    cancelTaskDialog()
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to save task'
    console.error('Error saving task:', err)
  }
}

const cancelTaskDialog = () => {
  showAddTaskDialog.value = false
  isEditing.value = false
  currentTask.value = {
    id: '',
    title: '',
    description: '',
    completed: false,
    listId: '',
  }
  error.value = null
}

const loadTaskList = async () => {
  const id = route.params.id as string
  
  // Check if the ID is a valid UUID
  if (!isValidUUID(id)) {
    error.value = `Invalid list ID format. Please create a new task list from the task lists page.`
    // Redirect to task lists page after 3 seconds
    setTimeout(() => {
      router.push('/tasks-lists')
    }, 3000)
    return
  }

  error.value = null
  
  try {
    await listStore.loadLists()
    await taskStore.loadTasksByList(id)
  } catch (err: any) {
    console.error('Error loading task list:', err)
    error.value = err.response?.data?.error || 'Failed to load task list'
  }
}

onMounted(() => {
  loadTaskList()
})

// Watch for route changes to reload data if list ID changes
watch(
  () => route.params.id,
  (newId, oldId) => {
    if (newId && newId !== oldId) {
      loadTaskList()
    }
  }
)

// Share and Print functionality
const canUseWebShare = computed(() => {
  return typeof navigator !== 'undefined' && 'share' in navigator
})

const generateTaskListText = () => {
  const listName = toDoList.value?.name || 'Task List'
  const description = toDoList.value?.description || ''
  let text = `📋 ${listName}\n`
  if (description) {
    text += `${description}\n\n`
  }
  text += 'Tasks:\n'
  tasks.value.forEach((task) => {
    const checkbox = task.completed ? '✅' : '☐'
    text += `${checkbox} ${task.title}`
    if (task.description) {
      text += ` - ${task.description}`
    }
    if (task.dueDate) {
      text += ` (Due: ${new Date(task.dueDate).toLocaleDateString()})`
    }
    text += '\n'
  })
  return text
}

const printOrSavePDF = () => {
  const listName = toDoList.value?.name || 'Task List'
  const description = toDoList.value?.description || ''
  
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
        <h2 style="margin: 0; color: #1976d2; font-size: 1.5rem; font-weight: 600;">רשימת משימות / Task List</h2>
      </div>
      <h1>${listName}</h1>
      ${description ? `<p class="description">${description}</p>` : ''}
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Task</th>
            <th>Description</th>
            <th>Due Date</th>
          </tr>
        </thead>
        <tbody>
          ${tasks.value.map(task => `
            <tr class="${task.completed ? 'completed' : ''}">
              <td><span class="checkbox">${task.completed ? '✅' : '☐'}</span></td>
              <td>${task.title || '-'}</td>
              <td>${task.description || '-'}</td>
              <td>${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}</td>
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
  const text = generateTaskListText()
  const encodedText = encodeURIComponent(text)
  const url = `https://wa.me/?text=${encodedText}`
  window.open(url, '_blank')
}

const shareViaSMS = () => {
  const text = generateTaskListText()
  const encodedText = encodeURIComponent(text)
  const url = `sms:?body=${encodedText}`
  window.location.href = url
}

const shareViaEmail = () => {
  const subject = encodeURIComponent(toDoList.value?.name || 'Task List')
  const body = encodeURIComponent(generateTaskListText())
  const url = `mailto:?subject=${subject}&body=${body}`
  window.location.href = url
}

const copyShareLink = async () => {
  const listId = route.params.id
  const shareUrl = `${window.location.origin}/task-list/${listId}`
  
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
  
  const text = generateTaskListText()
  const listId = route.params.id
  const shareUrl = `${window.location.origin}/task-list/${listId}`
  
  try {
    await navigator.share({
      title: toDoList.value?.name || 'Task List',
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
.task-list-view {
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
  font-size: 2.5rem;
  font-weight: 900;
  color: #2c3e50;
  margin: 0.5rem 0;
  letter-spacing: 2px;
}

.app-subtitle {
  font-size: 1rem;
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
  letter-spacing: 1px;
}

.task-list-card {
  border-radius: 16px;
  overflow: hidden;
}

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-item {
  display: flex;
  align-items: center;
  padding: 16px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.task-item.completed {
  background: #f0f0f0;
  opacity: 0.7;
  text-decoration: line-through;
}

.task-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.task-left {
  margin-right: 16px;
}

.task-content {
  flex: 1;
}

.task-title {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 4px 0;
}

.task-item.completed .task-title {
  color: #666;
}

.task-description {
  font-size: 14px;
  color: #666;
  margin: 0;
}

.task-actions {
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
    font-size: 0.9rem;
  }

  .task-item {
    padding: 12px;
  }

  .task-title {
    font-size: 14px;
  }

  .task-description {
    font-size: 12px;
  }
}
</style>
