<template>
  <div class="appointments-lists-view">
    <!-- Header Section -->
    <div class="header-section">
      <div class="header-content">
        <v-icon class="mr-2 header-icon">mdi-calendar</v-icon>
        <h1 class="app-title">APPOINTMENT LISTS</h1>
        <p class="app-subtitle">Organize Your Schedule</p>
      </div>
    </div>

    <!-- Main Content -->
    <v-container fluid class="pa-4">
      <v-row>
        <v-col cols="12">
          <v-card class="appointments-lists-card" elevation="4">
            <v-card-text class="pa-6">
              <!-- Add New List Button -->
              <div class="add-list-section mb-6">
                <v-btn
                  color="primary"
                  size="large"
                  @click="showCreateListDialog = true"
                  class="add-list-button"
                >
                  <v-icon start>mdi-plus</v-icon>
                  Create New Appointment List
                </v-btn>
              </div>

              <!-- Lists Grid -->
              <div v-if="appointmentLists.length > 0" class="lists-grid">
                <v-card
                  v-for="list in appointmentLists"
                  :key="list.id"
                  class="list-item"
                  elevation="2"
                >
                  <v-card-text class="pa-4">
                    <div class="list-header">
                      <v-icon :color="list.color" size="32" class="mr-3">{{ list.icon }}</v-icon>
                      <div class="list-info" @click="openAppointmentList(list)">
                        <h3 class="list-title">{{ list.name }}</h3>
                        <p class="list-description">{{ list.description || 'No description' }}</p>
                      </div>
                      <v-btn
                        icon
                        variant="text"
                        size="small"
                        color="error"
                        @click.stop="deleteAppointmentList(list)"
                        class="delete-button"
                      >
                        <v-icon>mdi-delete</v-icon>
                      </v-btn>
                    </div>
                    <div class="list-stats" @click="openAppointmentList(list)">
                      <span class="appointment-count">{{ list.taskCount || 0 }} appointments</span>
                      <span class="list-date">{{ formatDate(list.updatedAt) }}</span>
                    </div>
                  </v-card-text>
                </v-card>
              </div>

              <!-- Empty State -->
              <div v-else class="empty-state">
                <v-icon size="80" color="grey" class="mb-4">mdi-calendar-plus</v-icon>
                <h3 class="empty-title">No Appointment Lists Yet</h3>
                <p class="empty-description">Create your first appointment list to get started organizing your schedule</p>
                <v-btn
                  color="primary"
                  size="large"
                  @click="showCreateListDialog = true"
                  class="mt-4"
                >
                  <v-icon start>mdi-plus</v-icon>
                  Create Your First List
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <!-- Create List Dialog -->
    <v-dialog v-model="showCreateListDialog" max-width="500">
      <v-card>
        <v-card-title class="text-h5">Create New Appointment List</v-card-title>
        <v-card-text>
          <v-form ref="createListForm" v-model="createListFormValid">
            <v-text-field
              v-model="newAppointmentList.name"
              label="List Name"
              :rules="[rules.required]"
              required
              class="mb-4"
            />
            <v-textarea
              v-model="newAppointmentList.description"
              label="Description (Optional)"
              rows="3"
              class="mb-4"
            />
            <v-select
              v-model="newAppointmentList.icon"
              :items="availableIcons"
              label="Icon"
              :rules="[rules.required]"
              required
              class="mb-4"
            >
              <template v-slot:item="{ props, item }">
                <v-list-item v-bind="props" :title="item.title">
                  <template v-slot:prepend>
                    <v-icon :icon="item.value"></v-icon>
                  </template>
                </v-list-item>
              </template>
              <template v-slot:selection="{ item }">
                <v-icon :icon="item.value" class="mr-2"></v-icon>
                {{ item.title }}
              </template>
            </v-select>
            <v-color-picker
              v-model="newAppointmentList.color"
              hide-canvas
              hide-inputs
              show-swatches
              class="mx-auto"
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="showCreateListDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="saveNewAppointmentList" :disabled="!createListFormValid">Create</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useListStore } from '@/stores/listStore'

const router = useRouter()
const { t } = useI18n()
const listStore = useListStore()

const showCreateListDialog = ref(false)
const createListFormValid = ref(false)

const newAppointmentList = ref({
  name: '',
  description: '',
  icon: 'mdi-calendar',
  color: '#4CAF50', // Default green
})

const rules = {
  required: (value: any) => !!value || 'Required field',
}

const availableIcons = [
  { title: 'Calendar', value: 'mdi-calendar' },
  { title: 'Briefcase', value: 'mdi-briefcase' },
  { title: 'Hospital', value: 'mdi-hospital' },
  { title: 'Account', value: 'mdi-account' },
  { title: 'School', value: 'mdi-school' },
  { title: 'Heart', value: 'mdi-heart' },
  { title: 'Home', value: 'mdi-home' },
  { title: 'Sport', value: 'mdi-dumbbell' },
]

// Get appointment lists from store (filter by name containing appointment-related keywords or calendar/hospital icons)
const appointmentLists = computed(() => {
  return listStore.lists.filter(list => {
    const name = list.name.toLowerCase()
    const icon = (list.icon || '').toLowerCase()
    
    // Check if name contains appointment-related keywords
    const hasAppointmentKeyword = 
      name.includes('appointment') || 
      name.includes('תור') ||
      name.includes('meeting') ||
      name.includes('רופא') ||
      name.includes('דוקטור') ||
      name.includes('ביקור') ||
      name.includes('פגישה')
    
    // Check if icon is appointment-related
    const hasAppointmentIcon = 
      icon.includes('calendar') ||
      icon.includes('hospital') ||
      icon.includes('briefcase') ||
      icon.includes('account')
    
    return hasAppointmentKeyword || hasAppointmentIcon
  })
})

const openAppointmentList = (list: any) => {
  router.push(`/appointment-list/${list.id}`)
}

const deleteAppointmentList = async (list: any) => {
  if (!confirm(`Are you sure you want to delete "${list.name}"? This will also delete all appointments in this list.`)) {
    return
  }
  
  const result = await listStore.deleteList(list.id)
  if (result.success) {
    // List is already removed from store by deleteList
  } else {
    alert(result.error || 'Failed to delete list')
  }
}

const saveNewAppointmentList = async () => {
  if (!createListFormValid.value) return
  
  // Extract hex color from color picker (it might be an object or string)
  let colorValue = newAppointmentList.value.color
  console.log('Original color value:', colorValue, 'Type:', typeof colorValue)
  
  if (typeof colorValue === 'object' && colorValue !== null) {
    colorValue = colorValue.hex || colorValue.hexa || colorValue.rgba || '#4CAF50'
    console.log('Extracted color from object:', colorValue)
  }
  
  if (!colorValue || typeof colorValue !== 'string') {
    colorValue = '#4CAF50'
    console.log('Using default color:', colorValue)
  }
  
  // Ensure it starts with #
  if (!colorValue.startsWith('#')) {
    colorValue = '#' + colorValue
  }
  
  // Ensure it's 6 hex digits (remove alpha if present)
  if (colorValue.length > 7) {
    colorValue = colorValue.substring(0, 7)
  }
  if (colorValue.length === 4) {
    // Convert #RGB to #RRGGBB
    colorValue = '#' + colorValue[1] + colorValue[1] + colorValue[2] + colorValue[2] + colorValue[3] + colorValue[3]
  }
  
  // Final validation - must be #RRGGBB format
  if (!/^#[0-9A-F]{6}$/i.test(colorValue)) {
    console.warn('Invalid color format, using default:', colorValue)
    colorValue = '#4CAF50'
  }
  
  console.log('Final color value:', colorValue)
  
  const listData = {
    name: newAppointmentList.value.name.trim(),
    description: (newAppointmentList.value.description || '').trim(),
    icon: newAppointmentList.value.icon || 'mdi-calendar',
    color: colorValue,
  }
  
  console.log('Sending list data:', listData)
  
  const result = await listStore.createList(listData)
  
  if (result.success) {
    showCreateListDialog.value = false
    newAppointmentList.value = { name: '', description: '', icon: 'mdi-calendar', color: '#4CAF50' }
    // Reload lists to show the new one
    await loadAppointmentLists()
    if (result.list) {
      router.push(`/appointment-list/${result.list.id}`)
    }
  } else {
    const errorMsg = result.error || 'Failed to create appointment list'
    
    // If list already exists, find it and offer to open it
    if (errorMsg.includes('already exists') || errorMsg.includes('קיים')) {
      // Reload lists to make sure we have the latest data
      await loadAppointmentLists()
      
      const existingList = listStore.lists.find(l => 
        l.name.toLowerCase().trim() === listData.name.toLowerCase().trim()
      )
      
      if (existingList) {
        const openExisting = confirm(
          `רשימה בשם "${listData.name}" כבר קיימת.\n\nהאם תרצה לפתוח את הרשימה הקיימת?`
        )
        if (openExisting) {
          router.push(`/appointment-list/${existingList.id}`)
        }
      } else {
        alert(errorMsg + '\n\nאנא נסה שם אחר או מחק את הרשימה הקיימת.')
      }
    } else {
      const details = result.details ? '\n\nDetails: ' + JSON.stringify(result.details, null, 2) : ''
      alert(errorMsg + details)
    }
    console.error('Failed to create appointment list:', result)
  }
}

const formatDate = (date: Date | string | undefined) => {
  if (!date) return 'N/A'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString()
}

const loadAppointmentLists = async () => {
  try {
    await listStore.loadLists()
  } catch (error) {
    console.error('Error loading appointment lists:', error)
  }
}

onMounted(() => {
  loadAppointmentLists()
})
</script>

<style scoped>
.appointments-lists-view {
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

.appointments-lists-card {
  border-radius: 16px;
  overflow: hidden;
}

.add-list-section {
  text-align: center;
}

.add-list-button {
  font-size: 1.1rem;
  font-weight: 600;
  padding: 12px 32px;
  text-transform: none;
  letter-spacing: 1px;
}

.lists-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.list-item {
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 12px;
}

.list-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.list-header {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  position: relative;
}

.list-info {
  flex: 1;
  cursor: pointer;
}

.delete-button {
  position: absolute;
  top: 0;
  right: 0;
}

.list-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 0.25rem 0;
}

.list-description {
  font-size: 0.9rem;
  color: #666;
  margin: 0;
}

.list-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  color: #999;
  cursor: pointer;
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

  .lists-grid {
    grid-template-columns: 1fr;
  }
}
</style>
