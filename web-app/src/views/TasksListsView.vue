<template>
  <div class="tasks-lists-view">
    <!-- Header Section -->
    <div class="header-section">
      <div class="header-content">
        <v-icon class="mr-2 header-icon">mdi-checkbox-marked-circle-outline</v-icon>
        <h1 class="app-title">TO-DO LISTS</h1>
        <p class="app-subtitle">Organize Your Tasks & Projects</p>
      </div>
    </div>

    <!-- Main Content -->
    <v-container fluid class="pa-4">
      <v-row>
        <v-col cols="12">
          <v-card class="tasks-lists-card" elevation="4">
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
                  Create New TO-DO List
                </v-btn>
              </div>

              <!-- Loading State -->
              <div v-if="loading" class="text-center pa-8">
                <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
                <p class="mt-4">Loading lists...</p>
              </div>

              <!-- Lists Grid -->
              <div v-else-if="toDoLists.length > 0" class="lists-grid">
                <v-card
                  v-for="list in toDoLists"
                  :key="list.id"
                  class="list-item"
                  elevation="2"
                >
                  <v-card-text class="pa-4">
                    <div class="list-header">
                      <v-icon :color="list.color" size="32" class="mr-3">{{ list.icon }}</v-icon>
                      <div class="list-info" @click="openToDoList(list)">
                        <h3 class="list-title">{{ list.name }}</h3>
                        <p class="list-description">{{ list.description || 'No description' }}</p>
                      </div>
                      <v-btn
                        icon
                        variant="text"
                        size="small"
                        color="error"
                        @click.stop="deleteToDoList(list)"
                        class="delete-button"
                      >
                        <v-icon>mdi-delete</v-icon>
                      </v-btn>
                    </div>
                    <div class="list-stats" @click="openToDoList(list)">
                      <span class="task-count">{{ list.taskCount || 0 }} tasks</span>
                      <span class="list-date">{{ formatDate(list.updatedAt) }}</span>
                    </div>
                  </v-card-text>
                </v-card>
              </div>

              <!-- Empty State -->
              <div v-else-if="!loading" class="empty-state">
                <v-icon size="80" color="grey" class="mb-4">mdi-checkbox-marked-circle-outline</v-icon>
                <h3 class="empty-title">No TO-DO Lists Yet</h3>
                <p class="empty-description">Create your first TO-DO list to get started organizing your tasks</p>
                <v-btn
                  color="primary"
                  size="large"
                  @click="showCreateListDialog = true"
                  class="mt-4"
                >
                  <v-icon start>mdi-plus</v-icon>
                  Create Your First TO-DO List
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Create New List Dialog -->
      <v-dialog v-model="showCreateListDialog" max-width="500">
        <v-card>
          <v-card-title class="text-h5">Create New TO-DO List</v-card-title>
          <v-card-text>
            <v-form ref="createListForm" v-model="createListFormValid">
              <v-text-field
                v-model="newToDoList.name"
                label="List Name"
                :rules="[rules.required]"
                required
                class="mb-4"
              />
              <v-textarea
                v-model="newToDoList.description"
                label="Description (Optional)"
                rows="3"
                class="mb-4"
              />
              <v-select
                v-model="newToDoList.icon"
                :items="availableIcons"
                label="Icon"
                item-title="name"
                item-value="icon"
                :rules="[rules.required]"
                required
                class="mb-4"
              >
                <template v-slot:selection="{ item }">
                  <v-icon :color="item.raw.color" class="mr-2">{{ item.raw.icon }}</v-icon>
                  {{ item.raw.name }}
                </template>
                <template v-slot:item="{ item, props }">
                  <v-list-item v-bind="props">
                    <template v-slot:prepend>
                      <v-icon :color="item.raw.color">{{ item.raw.icon }}</v-icon>
                    </template>
                  </v-list-item>
                </template>
              </v-select>
              <v-color-picker
                v-model="newToDoList.color"
                hide-canvas
                hide-inputs
                hide-sliders
                show-swatches
                class="mx-auto"
              />
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="grey" variant="text" @click="showCreateListDialog = false">Cancel</v-btn>
            <v-btn color="primary" @click="saveNewToDoList" :disabled="!createListFormValid">Create</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useListStore } from '@/stores/listStore'

const router = useRouter()
const { t } = useI18n()
const listStore = useListStore()

const showCreateListDialog = ref(false)
const createListFormValid = ref(false)
const newToDoList = ref({
  name: '',
  description: '',
  icon: 'mdi-checkbox-marked-circle-outline',
  color: '#E91E63',
})

const availableIcons = [
  { name: 'Tasks', icon: 'mdi-checkbox-marked-circle-outline', color: '#E91E63' },
  { name: 'Work', icon: 'mdi-briefcase', color: '#2196F3' },
  { name: 'Personal', icon: 'mdi-account', color: '#4CAF50' },
  { name: 'Home', icon: 'mdi-home', color: '#FFC107' },
  { name: 'Study', icon: 'mdi-book-open-variant', color: '#9C27B0' },
  { name: 'Health', icon: 'mdi-heart-pulse', color: '#F44336' },
]

const toDoLists = computed(() => {
  // Filter out shopping lists (mdi-cart icon) and other non-task lists
  // Only show lists that are meant for tasks (not shopping, appointments, ideas, etc.)
  return listStore.lists.filter(list => {
    // Exclude shopping lists
    if (list.icon === 'mdi-cart') return false
    
    // Exclude appointment lists (common icons/names)
    const appointmentKeywords = ['appointment', 'תור', 'meeting', 'רופא', 'דוקטור', 'ביקור', 'פגישה']
    const appointmentIcons = ['mdi-calendar', 'mdi-hospital', 'mdi-briefcase', 'mdi-account']
    if (appointmentIcons.includes(list.icon) || 
        appointmentKeywords.some(keyword => 
          list.name?.toLowerCase().includes(keyword.toLowerCase())
        )) {
      return false
    }
    
    // Exclude ideas lists (common icons/names)
    const ideasKeywords = ['idea', 'רעיון', 'thought', 'note', 'הערה']
    const ideasIcons = ['mdi-lightbulb', 'mdi-lightbulb-outline', 'mdi-note', 'mdi-note-text']
    if (ideasIcons.includes(list.icon) || 
        ideasKeywords.some(keyword => 
          list.name?.toLowerCase().includes(keyword.toLowerCase())
        )) {
      return false
    }
    
    // Include all other lists as task lists
    return true
  })
})
const loading = computed(() => listStore.loading)

const rules = {
  required: (value: any) => !!value || 'Required field'
}

const openToDoList = (list: any) => {
  router.push(`/task-list/${list.id}`)
}

const deleteToDoList = async (list: any) => {
  if (!confirm(`Are you sure you want to delete "${list.name}"? This will also delete all tasks in this list.`)) {
    return
  }
  
  const result = await listStore.deleteList(list.id)
  if (result.success) {
    // List is already removed from store by deleteList
  } else {
    alert(result.error || 'Failed to delete list')
  }
}

const saveNewToDoList = async () => {
  if (createListFormValid.value) {
    // Extract hex color from color picker (it might be an object or string)
    let colorValue = newToDoList.value.color
    if (typeof colorValue === 'object' && colorValue !== null) {
      colorValue = colorValue.hex || colorValue.hexa || '#E91E63'
    }
    if (!colorValue || typeof colorValue !== 'string') {
      colorValue = '#E91E63'
    }
    // Ensure it starts with #
    if (!colorValue.startsWith('#')) {
      colorValue = '#' + colorValue
    }
    // Ensure it's 6 hex digits
    if (colorValue.length === 4) {
      // Convert #RGB to #RRGGBB
      colorValue = '#' + colorValue[1] + colorValue[1] + colorValue[2] + colorValue[2] + colorValue[3] + colorValue[3]
    }
    
    const result = await listStore.createList({
      name: newToDoList.value.name,
      description: newToDoList.value.description,
      icon: newToDoList.value.icon,
      color: colorValue,
    })
    
    if (result.success) {
      showCreateListDialog.value = false
      newToDoList.value = {
        name: '',
        description: '',
        icon: 'mdi-checkbox-marked-circle-outline',
        color: '#E91E63',
      }
      router.push(`/task-list/${result.list.id}`)
    }
  }
}

const formatDate = (date: string | Date) => {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString()
}

onMounted(async () => {
  await listStore.loadLists()
})
</script>

<style scoped>
.tasks-lists-view {
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

.tasks-lists-card {
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
