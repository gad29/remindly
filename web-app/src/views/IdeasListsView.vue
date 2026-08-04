<template>
  <div class="ideas-lists-view">
    <!-- Header Section -->
    <div class="header-section">
      <div class="header-content">
        <v-icon class="mr-2 header-icon">mdi-lightbulb-outline</v-icon>
        <h1 class="app-title">IDEAS LISTS</h1>
        <p class="app-subtitle">Capture & Organize Your Ideas</p>
      </div>
    </div>

    <!-- Main Content -->
    <v-container fluid class="pa-4">
      <v-row>
        <v-col cols="12">
          <v-card class="ideas-lists-card" elevation="4">
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
                  Create New Ideas List
                </v-btn>
              </div>

              <!-- Lists Grid -->
              <div v-if="ideasLists.length > 0" class="lists-grid">
                <v-card
                  v-for="list in ideasLists"
                  :key="list.id"
                  class="list-item"
                  elevation="2"
                >
                  <v-card-text class="pa-4">
                    <div class="list-header">
                      <v-icon :color="list.color" size="32" class="mr-3">{{ list.icon }}</v-icon>
                      <div class="list-info" @click="openIdeasList(list)">
                        <h3 class="list-title">{{ list.name }}</h3>
                        <p class="list-description">{{ list.description || 'No description' }}</p>
                      </div>
                      <v-btn
                        icon
                        variant="text"
                        size="small"
                        color="error"
                        @click.stop="deleteIdeasList(list)"
                        class="delete-button"
                      >
                        <v-icon>mdi-delete</v-icon>
                      </v-btn>
                    </div>
                    <div class="list-stats" @click="openIdeasList(list)">
                      <span class="idea-count">{{ list.taskCount || 0 }} ideas</span>
                      <span class="list-date">{{ formatDate(list.updatedAt) }}</span>
                    </div>
                  </v-card-text>
                </v-card>
              </div>

              <!-- Empty State -->
              <div v-else class="empty-state">
                <v-icon size="80" color="grey" class="mb-4">mdi-lightbulb-outline</v-icon>
                <h3 class="empty-title">No Ideas Lists Yet</h3>
                <p class="empty-description">Create your first ideas list to start capturing your thoughts</p>
                <v-btn
                  color="primary"
                  size="large"
                  @click="showCreateListDialog = true"
                  class="mt-4"
                >
                  <v-icon start>mdi-plus</v-icon>
                  Create Your First Ideas List
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
        <v-card-title class="text-h5">Create New Ideas List</v-card-title>
        <v-card-text>
          <v-form ref="createListForm" v-model="createListFormValid">
            <v-text-field
              v-model="newIdeasList.name"
              label="List Name"
              :rules="[rules.required]"
              required
              class="mb-4"
            />
            <v-textarea
              v-model="newIdeasList.description"
              label="Description (Optional)"
              rows="3"
              class="mb-4"
            />
            <v-select
              v-model="newIdeasList.icon"
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
              v-model="newIdeasList.color"
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
          <v-btn color="primary" @click="saveNewIdeasList" :disabled="!createListFormValid">Create</v-btn>
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

const newIdeasList = ref({
  name: '',
  description: '',
  icon: 'mdi-lightbulb-outline',
  color: '#FFC107', // Default yellow
})

const rules = {
  required: (value: any) => !!value || 'Required field',
}

const availableIcons = [
  { title: 'Lightbulb', value: 'mdi-lightbulb-outline' },
  { title: 'Rocket', value: 'mdi-rocket' },
  { title: 'Star', value: 'mdi-star' },
  { title: 'Heart', value: 'mdi-heart' },
  { title: 'Puzzle', value: 'mdi-puzzle' },
  { title: 'Palette', value: 'mdi-palette' },
  { title: 'Code', value: 'mdi-code-braces' },
  { title: 'Book', value: 'mdi-book-open' },
]

// Get ideas lists from store (filter by icon or name containing "idea")
const ideasLists = computed(() => {
  return listStore.lists.filter(list => 
    list.icon === 'mdi-lightbulb-outline' ||
    list.name.toLowerCase().includes('idea') || 
    list.name.toLowerCase().includes('רעיון')
  )
})

const openIdeasList = (list: any) => {
  router.push(`/ideas-list/${list.id}`)
}

const deleteIdeasList = async (list: any) => {
  if (!confirm(`Are you sure you want to delete "${list.name}"? This will also delete all ideas in this list.`)) {
    return
  }
  
  const result = await listStore.deleteList(list.id)
  if (result.success) {
    // List is already removed from store by deleteList
  } else {
    alert(result.error || 'Failed to delete list')
  }
}

const saveNewIdeasList = async () => {
  if (!createListFormValid.value) return
  
  // Extract hex color from color picker (it might be an object or string)
  let colorValue = newIdeasList.value.color
  if (typeof colorValue === 'object' && colorValue !== null) {
    colorValue = colorValue.hex || colorValue.hexa || '#FFC107'
  }
  if (!colorValue || typeof colorValue !== 'string') {
    colorValue = '#FFC107'
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
  
  try {
    const result = await listStore.createList({
      name: newIdeasList.value.name,
      description: newIdeasList.value.description,
      icon: newIdeasList.value.icon,
      color: colorValue,
    })
    
    if (result.success) {
      // Reload lists to ensure we have the latest data
      await loadIdeasLists()
      
      showCreateListDialog.value = false
      newIdeasList.value = { name: '', description: '', icon: 'mdi-lightbulb-outline', color: '#FFC107' }
      
      if (result.list) {
        router.push(`/ideas-list/${result.list.id}`)
      }
    } else {
      // Handle "List already exists" error
      if (result.error && result.error.includes('already exists')) {
        // Reload lists to find the existing one
        await loadIdeasLists()
        const existingList = ideasLists.value.find(
          list => list.name.toLowerCase() === newIdeasList.value.name.toLowerCase()
        )
        
        if (existingList) {
          const openExisting = confirm(
            `A list with the name "${newIdeasList.value.name}" already exists. Would you like to open it?`
          )
          if (openExisting) {
            showCreateListDialog.value = false
            newIdeasList.value = { name: '', description: '', icon: 'mdi-lightbulb-outline', color: '#FFC107' }
            router.push(`/ideas-list/${existingList.id}`)
          }
        } else {
          alert(result.error || 'Failed to create ideas list')
        }
      } else {
        alert(result.error || 'Failed to create ideas list')
      }
    }
  } catch (error) {
    console.error('Error creating ideas list:', error)
    alert('An unexpected error occurred. Please try again.')
  }
}

const formatDate = (date: Date | string | undefined) => {
  if (!date) return 'N/A'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString()
}

const loadIdeasLists = async () => {
  try {
    await listStore.loadLists()
  } catch (error) {
    console.error('Error loading ideas lists:', error)
  }
}

onMounted(() => {
  loadIdeasLists()
})
</script>

<style scoped>
.ideas-lists-view {
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

.ideas-lists-card {
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
