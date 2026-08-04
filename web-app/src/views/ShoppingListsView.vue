<template>
  <div class="shopping-lists-view">
    <!-- Header Section -->
    <div class="header-section">
      <div class="header-content">
        <v-icon class="mr-2 header-icon">mdi-cart</v-icon>
        <h1 class="app-title">SHOPPING LISTS</h1>
        <p class="app-subtitle">Grocery Store, This Week</p>
      </div>
    </div>

    <!-- Main Content -->
    <v-container fluid class="pa-4">
      <v-row>
        <v-col cols="12">
          <v-card class="shopping-lists-card" elevation="4">
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
                  Create New Shopping List
                </v-btn>
              </div>

              <!-- Loading State -->
              <div v-if="loading" class="text-center pa-8">
                <v-progress-circular indeterminate color="primary"></v-progress-circular>
                <p class="mt-4">Loading shopping lists...</p>
              </div>

              <!-- Error State -->
              <div v-else-if="error" class="text-center pa-8">
                <v-alert type="error" :text="error"></v-alert>
              </div>

              <!-- Shopping Lists Grid -->
              <div v-else-if="shoppingLists.length > 0" class="lists-grid">
                <v-card
                  v-for="list in shoppingLists"
                  :key="list.id"
                  class="shopping-list-item"
                  elevation="2"
                >
                  <v-card-text class="pa-4">
                    <div class="list-header">
                      <v-icon color="primary" size="32" class="mr-3">mdi-cart</v-icon>
                      <div class="list-info" @click="openShoppingList(list)">
                        <h3 class="list-title">{{ list.name }}</h3>
                        <p class="list-description">{{ list.description || 'Shopping list' }}</p>
                      </div>
                      <v-btn
                        icon
                        variant="text"
                        size="small"
                        color="error"
                        @click.stop="deleteShoppingList(list)"
                        class="delete-button"
                      >
                        <v-icon>mdi-delete</v-icon>
                      </v-btn>
                    </div>
                    <div class="list-stats" @click="openShoppingList(list)">
                      <span class="item-count">{{ list.taskCount || list.completedCount || 0 }} items</span>
                      <span class="list-date">{{ formatDate(list.updatedAt || list.created_at || list.createdAt) }}</span>
                    </div>
                  </v-card-text>
                </v-card>
              </div>

              <!-- Empty State -->
              <div v-else class="empty-state">
                <v-icon size="80" color="grey" class="mb-4">mdi-cart</v-icon>
                <h3 class="empty-title">No Shopping Lists Yet</h3>
                <p class="empty-description">Create your first shopping list to get started</p>
                <v-btn
                  color="primary"
                  size="large"
                  @click="showCreateListDialog = true"
                  class="mt-4"
                >
                  <v-icon start>mdi-plus</v-icon>
                  Create Your First Shopping List
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <!-- Create Shopping List Dialog -->
    <v-dialog v-model="showCreateListDialog" max-width="500">
      <v-card>
        <v-card-title>Create New Shopping List</v-card-title>
        <v-card-text>
          <!-- Error Message -->
          <v-alert v-if="error && showCreateListDialog" type="error" class="mb-4" dismissible @click:close="error = null">
            {{ error }}
          </v-alert>
          
          <v-form ref="createForm" v-model="formValid">
            <v-text-field
              v-model="newList.name"
              label="List Name"
              :rules="[rules.required]"
              required
            />
            <v-textarea
              v-model="newList.description"
              label="Description"
              rows="3"
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="grey" variant="text" @click="cancelCreateList">
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            @click="createShoppingList"
            :disabled="!formValid"
            :loading="creating"
          >
            {{ creating ? 'Creating...' : 'Create List' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useListStore } from '@/stores/listStore'
import { apiService } from '@/utils/api'

const router = useRouter()
const listStore = useListStore()

// Reactive data
const showCreateListDialog = ref(false)
const formValid = ref(false)
const creating = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)

const newList = reactive({
  name: '',
  description: ''
})

// Get shopping lists from store (filter by name containing "shopping" or use all lists)
const shoppingLists = computed(() => {
  return listStore.lists.filter(list => {
    // Filter by icon (mdi-cart indicates shopping list)
    if (list.icon === 'mdi-cart') return true
    
    // Filter by name keywords
    const name = list.name.toLowerCase()
    if (name.includes('shopping') || name.includes('קניות')) return true
    
    return false
  })
})

// Validation rules
const rules = {
  required: (value: any) => !!value || 'Required field'
}

// Methods
const openShoppingList = (list: any) => {
  router.push(`/shopping-list/${list.id}`)
}

const deleteShoppingList = async (list: any) => {
  if (!confirm(`Are you sure you want to delete "${list.name}"? This will also delete all items in this list.`)) {
    return
  }
  
  const result = await listStore.deleteList(list.id)
  if (result.success) {
    // List is already removed from store by deleteList
  } else {
    alert(result.error || 'Failed to delete list')
  }
}

const createShoppingList = async () => {
  if (!formValid.value) return
  
  creating.value = true
  error.value = null
  try {
    const result = await listStore.createList({
      name: newList.name,
      description: newList.description || '',
      icon: 'mdi-cart',
      color: '#4CAF50'
    })
    
    if (result.success) {
      showCreateListDialog.value = false
      
      // Reset form
      newList.name = ''
      newList.description = ''
      
      // Reload lists to ensure the new list appears
      await loadShoppingLists()
      
      // Navigate to the new list
      if (result.list) {
        router.push(`/shopping-list/${result.list.id}`)
      }
    } else {
      // Check if error is "List with this name already exists"
      if (result.error && result.error.includes('already exists')) {
        // Try to find the existing list
        await loadShoppingLists()
        const existingList = shoppingLists.value.find(
          list => list.name.toLowerCase() === newList.name.toLowerCase()
        )
        
        if (existingList) {
          // Offer to open the existing list
          if (confirm(`A shopping list named "${newList.name}" already exists. Would you like to open it?`)) {
            showCreateListDialog.value = false
            newList.name = ''
            newList.description = ''
            router.push(`/shopping-list/${existingList.id}`)
          } else {
            error.value = `A list named "${newList.name}" already exists. Please choose a different name.`
          }
        } else {
          error.value = result.error || 'Failed to create shopping list'
        }
      } else {
        error.value = result.error || 'Failed to create shopping list'
      }
    }
  } catch (err: any) {
    console.error('Error creating shopping list:', err)
    const errorMessage = err.response?.data?.error || 'Failed to create shopping list'
    
    // Check if error is "List with this name already exists"
    if (errorMessage.includes('already exists')) {
      // Try to find the existing list
      await loadShoppingLists()
      const existingList = shoppingLists.value.find(
        list => list.name.toLowerCase() === newList.name.toLowerCase()
      )
      
      if (existingList) {
        // Offer to open the existing list
        if (confirm(`A shopping list named "${newList.name}" already exists. Would you like to open it?`)) {
          showCreateListDialog.value = false
          newList.name = ''
          newList.description = ''
          router.push(`/shopping-list/${existingList.id}`)
        } else {
          error.value = `A list named "${newList.name}" already exists. Please choose a different name.`
        }
      } else {
        error.value = errorMessage
      }
    } else {
      error.value = errorMessage
    }
  } finally {
    creating.value = false
  }
}

const loadShoppingLists = async () => {
  loading.value = true
  error.value = null
  try {
    await listStore.loadLists()
  } catch (err: any) {
    console.error('Error loading shopping lists:', err)
    error.value = err.response?.data?.error || 'Failed to load shopping lists'
  } finally {
    loading.value = false
  }
}

const getItemCount = async (listId: string) => {
  try {
    const response = await apiService.shoppingItems.getAll({ listId })
    const data = response.data
    return data.items?.length || data.length || 0
  } catch (err) {
    console.error('Error getting item count:', err)
    return 0
  }
}

const cancelCreateList = () => {
  showCreateListDialog.value = false
  newList.name = ''
  newList.description = ''
}

const formatDate = (date: Date | string | undefined) => {
  if (!date) return 'N/A'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString()
}

onMounted(() => {
  loadShoppingLists()
})
</script>

<style scoped>
.shopping-lists-view {
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

.shopping-lists-card {
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

.shopping-list-item {
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 12px;
}

.shopping-list-item:hover {
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
