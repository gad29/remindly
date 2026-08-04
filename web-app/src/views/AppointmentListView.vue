<template>
  <div class="appointment-list-view">
    <!-- Header Section -->
    <div class="header-section">
      <div class="header-content">
        <v-icon class="mr-2 header-icon">mdi-calendar</v-icon>
        <h1 class="app-title">{{ appointmentList?.name || 'Appointment List' }}</h1>
        <p class="app-subtitle">{{ appointmentList?.description || 'This Week, Dr Lee\'s Office' }}</p>
      </div>
    </div>

    <!-- Main Content -->
    <v-container fluid class="pa-4">
      <v-row>
        <v-col cols="12">
          <v-card class="appointment-list-card" elevation="4">
            <v-card-text class="pa-6">
              <!-- Error Message -->
              <v-alert v-if="error && !loading" type="error" class="mb-4" dismissible @click:close="error = null">
                {{ error }}
              </v-alert>

              <!-- Loading State -->
              <div v-if="loading" class="text-center pa-8">
                <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
                <p class="mt-4">Loading appointments...</p>
              </div>

              <!-- Appointments List -->
              <div v-else-if="appointments.length > 0" class="appointments-list">
                <div
                  v-for="appointment in appointments"
                  :key="appointment.id"
                  class="appointment-item"
                  :class="{ 'completed': appointment.isCompleted }"
                >
                  <div class="appointment-left">
                    <v-checkbox-btn
                      v-model="appointment.isCompleted"
                      color="primary"
                      @click.stop="toggleAppointmentCompletion(appointment)"
                    />
                  </div>
                  
                  <div class="appointment-content">
                    <h3 class="appointment-title">{{ appointment.title }}</h3>
                    <p class="appointment-subtitle">{{ appointment.subtitle }}</p>
                  </div>
                  
                  <div class="appointment-actions">
                    <v-btn
                      icon
                      variant="text"
                      size="small"
                      @click.stop="editAppointment(appointment)"
                    >
                      <v-icon>mdi-pencil</v-icon>
                    </v-btn>
                    <v-btn
                      icon
                      variant="text"
                      size="small"
                      @click.stop="deleteAppointment(appointment)"
                    >
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                  </div>
                </div>
              </div>

              <!-- Empty State -->
              <div v-else class="empty-state">
                <v-icon size="80" color="grey" class="mb-4">mdi-calendar-clock</v-icon>
                <h3 class="empty-title">No appointments scheduled yet</h3>
                <p class="empty-description">Add your first appointment to this list</p>
              </div>

              <!-- Action Buttons Section -->
              <div class="add-item-section">
                <div class="action-buttons-row">
                  <v-btn
                    color="primary"
                    size="large"
                    @click="showAddAppointmentDialog = true"
                    class="add-item-button"
                  >
                    <v-icon start>mdi-plus</v-icon>
                    Add Appointment
                  </v-btn>
                  
                  <v-btn
                    color="secondary"
                    size="large"
                    @click="printOrSavePDF"
                    class="action-button"
                    :disabled="appointments.length === 0"
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
                        :disabled="appointments.length === 0"
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

    <!-- Add/Edit Appointment Dialog -->
    <v-dialog v-model="showAddAppointmentDialog" max-width="500">
      <v-card>
        <v-card-title class="text-h5">{{ isEditing ? 'Edit Appointment' : 'Add New Appointment' }}</v-card-title>
        <v-card-text>
          <v-form ref="appointmentForm" v-model="appointmentFormValid">
            <v-text-field
              v-model="currentAppointment.title"
              label="Title"
              :rules="[rules.required]"
              required
              class="mb-4"
            />
            <v-textarea
              v-model="currentAppointment.subtitle"
              label="Description / Details"
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
                  v-model="currentAppointment.date"
                  label="Date"
                  :rules="[rules.required]"
                  required
                  readonly
                  v-bind="props"
                  prepend-inner-icon="mdi-calendar"
                  class="mb-4"
                />
              </template>
              <v-date-picker
                v-model="currentAppointment.date"
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
                  v-model="currentAppointment.time"
                  label="Time"
                  :rules="[rules.required]"
                  required
                  readonly
                  v-bind="props"
                  prepend-inner-icon="mdi-clock-outline"
                  class="mb-4"
                />
              </template>
              <v-time-picker
                v-model="currentAppointment.time"
                format="24hr"
                @update:model-value="timeMenu = false"
              />
            </v-menu>
            <v-checkbox
              v-model="currentAppointment.isCompleted"
              label="Completed"
              class="mb-4"
            />
            <v-divider class="my-4"></v-divider>
            <v-checkbox
              v-model="currentAppointment.hasReminder"
              label="Enable Reminder"
              class="mb-4"
            />
            <v-select
              v-if="currentAppointment.hasReminder"
              v-model="currentAppointment.reminderBefore"
              :items="reminderOptions"
              label="Remind me"
              item-title="label"
              item-value="value"
              class="mb-4"
            />
            <v-select
              v-if="currentAppointment.hasReminder"
              v-model="currentAppointment.reminderType"
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
          <v-btn color="grey" variant="text" @click="cancelAppointmentDialog">Cancel</v-btn>
          <v-btn color="primary" @click="saveAppointment" :disabled="!appointmentFormValid">
            {{ isEditing ? 'Save Changes' : 'Add Appointment' }}
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

const appointmentListId = computed(() => {
  const id = route.params.id as string
  if (!isValidUUID(id)) {
    return null
  }
  return id
})

const loading = ref(false)
const error = ref<string | null>(null)

const showAddAppointmentDialog = ref(false)
const appointmentFormValid = ref(false)
const isEditing = ref(false)
const dateMenu = ref(false)
const timeMenu = ref(false)

const currentAppointment = ref({
  id: '',
  title: '',
  subtitle: '',
  date: '',
  time: '',
  isCompleted: false,
  hasReminder: false,
  reminderBefore: 15, // minutes before appointment
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

// Appointment list and tasks (appointments are stored as tasks)
const appointmentList = computed(() => {
  if (!appointmentListId.value) return null
  return listStore.getListById(appointmentListId.value) || null
})

const appointments = computed(() => {
  if (!appointmentListId.value) return []
  const tasks = taskStore.getTasksByListId(appointmentListId.value)
  // Convert tasks to appointments format
  return tasks.map(task => ({
    id: task.id,
    title: task.title,
    subtitle: task.description || `${task.dueDate || ''} ${task.dueTime || ''}`.trim(),
    date: task.dueDate || '',
    time: task.dueTime || '',
    isCompleted: task.completed || false,
  }))
})

const toggleAppointmentCompletion = async (appointment: any) => {
  if (!appointmentListId.value) {
    error.value = 'Invalid list ID. Cannot toggle appointment.'
    return
  }
  try {
    await taskStore.toggleTaskCompletion(appointment.id)
    error.value = null
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to toggle appointment'
    console.error('Error toggling appointment:', err)
  }
}

const addAppointment = () => {
  isEditing.value = false
  currentAppointment.value = {
    id: '',
    title: '',
    subtitle: '',
    date: '',
    time: '',
    isCompleted: false,
    hasReminder: false,
    reminderBefore: 15,
    reminderType: 'push',
  }
  showAddAppointmentDialog.value = true
}

const editAppointment = (appointment: any) => {
  isEditing.value = true
  currentAppointment.value = { ...appointment }
  showAddAppointmentDialog.value = true
}

const saveAppointment = async () => {
  if (!appointmentFormValid.value) {
    error.value = 'Please fill in all required fields'
    return
  }

  if (!appointmentListId.value) {
    error.value = 'Invalid list ID. Please create a new appointment list.'
    return
  }

  try {
    // Format date to YYYY-MM-DD if needed
    let formattedDate = currentAppointment.value.date
    if (formattedDate) {
      // Convert to string if it's a Date object
      if (formattedDate instanceof Date) {
        formattedDate = formattedDate.toISOString().split('T')[0]
      } else if (typeof formattedDate === 'string') {
        if (formattedDate.includes('T')) {
          formattedDate = formattedDate.split('T')[0]
        }
      } else {
        formattedDate = String(formattedDate)
      }
    } else {
      error.value = 'Date is required'
      return
    }
    
    // Format time to HH:MM if needed
    let formattedTime = currentAppointment.value.time
    if (formattedTime) {
      // Convert to string if it's a Date object or other type
      if (formattedTime instanceof Date) {
        const hours = String(formattedTime.getHours()).padStart(2, '0')
        const minutes = String(formattedTime.getMinutes()).padStart(2, '0')
        formattedTime = `${hours}:${minutes}`
      } else if (typeof formattedTime === 'string') {
        if (formattedTime.includes('T')) {
          formattedTime = formattedTime.split('T')[1]?.substring(0, 5) || formattedTime
        }
        // Ensure format is HH:MM
        if (formattedTime.length === 5 && formattedTime.includes(':')) {
          // Already in correct format
        } else if (formattedTime.length === 4) {
          // Format like "1430" to "14:30"
          formattedTime = `${formattedTime.substring(0, 2)}:${formattedTime.substring(2, 4)}`
        }
      } else {
        formattedTime = String(formattedTime)
      }
    } else {
      error.value = 'Time is required'
      return
    }
    
    let taskId: string
    
    if (isEditing.value) {
      await taskStore.updateTask(currentAppointment.value.id, {
        title: currentAppointment.value.title,
        description: currentAppointment.value.subtitle,
        dueDate: formattedDate,
        dueTime: formattedTime,
        completed: currentAppointment.value.isCompleted,
      })
      taskId = currentAppointment.value.id
    } else {
      const result = await taskStore.addTask({
        title: currentAppointment.value.title,
        description: currentAppointment.value.subtitle,
        listId: appointmentListId.value,
        dueDate: formattedDate,
        dueTime: formattedTime,
        completed: currentAppointment.value.isCompleted,
      })
      taskId = result.task?.id || ''
    }
    
    // Create reminder if enabled
    if (currentAppointment.value.hasReminder && taskId && formattedDate && formattedTime) {
      try {
        // Calculate reminder time (appointment time minus reminderBefore minutes)
        const appointmentDateTime = new Date(`${formattedDate}T${formattedTime}`)
        const reminderTime = new Date(appointmentDateTime.getTime() - (currentAppointment.value.reminderBefore * 60 * 1000))
        
        // Only create reminder if reminder time is in the future
        if (reminderTime > new Date()) {
          await apiService.reminders.create({
            taskId: taskId,
            reminderTime: reminderTime.toISOString(),
            reminderType: currentAppointment.value.reminderType || 'push',
            title: `Reminder: ${currentAppointment.value.title}`,
            message: `You have an appointment: ${currentAppointment.value.title} at ${formattedTime} on ${formattedDate}`,
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
    cancelAppointmentDialog()
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to save appointment'
    console.error('Error saving appointment:', err)
  }
}

const deleteAppointment = async (appointment: any) => {
  if (!confirm(`Are you sure you want to delete "${appointment.title}"?`)) return
  
  try {
    await taskStore.deleteTask(appointment.id)
    error.value = null
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to delete appointment'
    console.error('Error deleting appointment:', err)
  }
}

const cancelAppointmentDialog = () => {
  showAddAppointmentDialog.value = false
  isEditing.value = false
  dateMenu.value = false
  timeMenu.value = false
  currentAppointment.value = {
    id: '',
    title: '',
    subtitle: '',
    date: '',
    time: '',
    isCompleted: false,
    hasReminder: false,
    reminderBefore: 15,
    reminderType: 'push',
  }
  error.value = null
}

const loadAppointmentList = async () => {
  const id = route.params.id as string
  
  // Check if the ID is a valid UUID
  if (!isValidUUID(id)) {
    error.value = `Invalid list ID format. Please create a new appointment list from the appointment lists page.`
    // Redirect to appointment lists page after 3 seconds
    setTimeout(() => {
      router.push('/appointment-lists')
    }, 3000)
    return
  }

  loading.value = true
  error.value = null
  
  try {
    await listStore.loadLists()
    await taskStore.loadTasksByList(id)
  } catch (err: any) {
    console.error('Error loading appointment list:', err)
    error.value = err.response?.data?.error || 'Failed to load appointment list'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadAppointmentList()
})

// Watch for route changes to reload data if list ID changes
watch(
  () => route.params.id,
  (newId, oldId) => {
    if (newId && newId !== oldId) {
      loadAppointmentList()
    }
  }
)

// Share and Print functionality
const canUseWebShare = computed(() => {
  return typeof navigator !== 'undefined' && 'share' in navigator
})

const generateAppointmentListText = () => {
  const listName = appointmentList.value?.name || 'Appointment List'
  const description = appointmentList.value?.description || ''
  let text = `📅 ${listName}\n`
  if (description) {
    text += `${description}\n\n`
  }
  text += 'Appointments:\n'
  appointments.value.forEach((appointment) => {
    const checkbox = appointment.isCompleted ? '✅' : '☐'
    text += `${checkbox} ${appointment.title}`
    if (appointment.subtitle) {
      text += ` - ${appointment.subtitle}`
    }
    text += '\n'
  })
  return text
}

const printOrSavePDF = () => {
  const listName = appointmentList.value?.name || 'Appointment List'
  const description = appointmentList.value?.description || ''
  
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
        <h2 style="margin: 0; color: #1976d2; font-size: 1.5rem; font-weight: 600;">רשימת תורים / Appointment List</h2>
      </div>
      <h1>${listName}</h1>
      ${description ? `<p class="description">${description}</p>` : ''}
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Appointment</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          ${appointments.value.map(appointment => `
            <tr class="${appointment.isCompleted ? 'completed' : ''}">
              <td><span class="checkbox">${appointment.isCompleted ? '✅' : '☐'}</span></td>
              <td>${appointment.title || '-'}</td>
              <td>${appointment.subtitle || '-'}</td>
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
  const text = generateAppointmentListText()
  const encodedText = encodeURIComponent(text)
  const url = `https://wa.me/?text=${encodedText}`
  window.open(url, '_blank')
}

const shareViaSMS = () => {
  const text = generateAppointmentListText()
  const encodedText = encodeURIComponent(text)
  const url = `sms:?body=${encodedText}`
  window.location.href = url
}

const shareViaEmail = () => {
  const subject = encodeURIComponent(appointmentList.value?.name || 'Appointment List')
  const body = encodeURIComponent(generateAppointmentListText())
  const url = `mailto:?subject=${subject}&body=${body}`
  window.location.href = url
}

const copyShareLink = async () => {
  const listId = route.params.id
  const shareUrl = `${window.location.origin}/appointment-list/${listId}`
  
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
  
  const text = generateAppointmentListText()
  const listId = route.params.id
  const shareUrl = `${window.location.origin}/appointment-list/${listId}`
  
  try {
    await navigator.share({
      title: appointmentList.value?.name || 'Appointment List',
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
.appointment-list-view {
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

.appointment-list-card {
  border-radius: 16px;
  overflow: hidden;
}

.appointments-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.appointment-item {
  display: flex;
  align-items: center;
  padding: 16px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.appointment-item.completed {
  opacity: 0.7;
  background-color: #f0f0f0;
}

.appointment-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.appointment-left {
  margin-right: 16px;
}

.appointment-content {
  flex: 1;
}

.appointment-title {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 4px 0;
}

.appointment-item.completed .appointment-title {
  text-decoration: line-through;
  color: #999;
}

.appointment-subtitle {
  font-size: 14px;
  color: #666;
  margin: 0;
}

.appointment-actions {
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

  .appointment-item {
    padding: 12px;
  }

  .appointment-title {
    font-size: 14px;
  }

  .appointment-subtitle {
    font-size: 12px;
  }
}
</style>
