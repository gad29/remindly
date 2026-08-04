<template>
  <div class="shopping-list-view">
    <!-- Header Section -->
    <div class="header-section">
      <div class="header-content">
        <v-icon class="mr-2 header-icon">mdi-cart</v-icon>
        <h1 class="app-title">Shopping List</h1>
        <p class="app-subtitle">{{ shoppingList?.description || 'Grocery Store, This Week' }}</p>
      </div>
    </div>

    <!-- Main Content -->
    <v-container fluid class="pa-4">
      <v-row>
        <v-col cols="12">
          <v-card class="shopping-list-card" elevation="4">
            <v-card-text class="pa-6">
              <!-- Error Message -->
              <v-alert v-if="error && !loading && !showAddItemDialog" type="error" class="mb-4" dismissible @click:close="error = null">
                {{ error }}
              </v-alert>

              <section class="smart-add" aria-labelledby="smart-add-title">
                <div class="smart-copy">
                  <span class="smart-icon"><v-icon icon="mdi-barcode-scan"/></span>
                  <div><div class="section-kicker">SMART PRODUCT SEARCH</div><h2 id="smart-add-title">Find the exact product</h2><p>Search in Hebrew or English. Choose a real product to attach its barcode, picture, nutrition, and available Israeli pricing.</p></div>
                </div>
                <v-text-field v-model="productQuery" label="Try חלב תנובה, coffee, or a barcode" variant="outlined" prepend-inner-icon="mdi-magnify" clearable hide-details :loading="searchingProducts" autocomplete="off"/>
                <div v-if="productSuggestions.length" class="product-results">
                  <button v-for="product in productSuggestions" :key="product.barcode" type="button" @click="selectProduct(product)">
                    <span class="product-thumb"><img v-if="product.imageUrl" :src="product.imageUrl" :alt="product.name"/><v-icon v-else icon="mdi-package-variant-closed"/></span>
                    <span class="product-result-copy"><strong>{{ product.name }}</strong><small>{{ [product.brand, product.quantity].filter(Boolean).join(' · ') || `Barcode ${product.barcode}` }}</small></span>
                    <span v-if="product.pricing?.summary?.cheapest" class="result-price">From ₪{{ product.pricing.summary.cheapest.toFixed(2) }}</span>
                    <v-icon icon="mdi-chevron-right"/>
                  </button>
                </div>
                <article v-if="selectedProduct" class="selected-product">
                  <span class="selected-image"><img v-if="selectedProduct.imageUrl" :src="selectedProduct.imageUrl" :alt="selectedProduct.name"/><v-icon v-else icon="mdi-package-variant" size="38"/></span>
                  <div class="selected-copy"><div class="section-kicker">SELECTED PRODUCT</div><h3>{{ selectedProduct.name }}</h3><p>{{ [selectedProduct.brand, selectedProduct.quantity].filter(Boolean).join(' · ') }}</p><div class="product-badges"><span v-if="selectedProduct.nutritionGrade">Nutri-score {{ String(selectedProduct.nutritionGrade).toUpperCase() }}</span><span>{{ selectedProduct.barcode }}</span><span v-if="priceSummary">From ₪{{ priceSummary.cheapest || priceSummary.minPrice }}</span></div></div>
                  <div class="selected-actions"><v-text-field v-model.number="smartQuantity" type="number" min="1" label="Qty" variant="outlined" hide-details/><v-btn color="primary" :loading="addingSmartProduct" @click="addSmartProduct">Add to list</v-btn></div>
                </article>
                <div v-if="productQuery.length >= 3 && !searchingProducts && !productSuggestions.length && !selectedProduct" class="no-product"><span>No catalogue match. You can still add it manually.</span><v-btn variant="text" size="small" @click="openManualAdd">Add manually</v-btn></div>
              </section>
              
              <!-- Shopping Items List -->
              <div v-if="items.length > 0" class="items-list">
                <div
                  v-for="item in items"
                  :key="item.id"
                  class="shopping-item"
                  :class="{ 'completed': item.completed }"
                >
                  <div class="item-left">
                    <v-checkbox
                      :model-value="item.completed"
                      @update:model-value="toggleItem(item)"
                      color="primary"
                      hide-details
                    />
                  </div>
                  <span v-if="item.imageUrl" class="item-product-image"><img :src="item.imageUrl" :alt="item.productName || item.name"/></span>
                  
                  <div class="item-content">
                    <h3 class="item-name">{{ item.name }}</h3>
                    <p class="item-quantity">{{ item.quantity || 1 }} × {{ item.unit || 'item' }}<span v-if="item.metadata?.brand"> · {{ item.metadata.brand }}</span></p>
                    <div v-if="item.estimatedPrice || item.metadata?.nutritionGrade" class="item-insights"><span v-if="item.estimatedPrice">Estimated ₪{{ item.estimatedPrice }}</span><span v-if="item.metadata?.nutritionGrade">Nutri-score {{ String(item.metadata.nutritionGrade).toUpperCase() }}</span></div>
                  </div>
                  
                  <div class="item-actions">
                    <v-btn
                      icon
                      variant="text"
                      size="small"
                      @click="editItem(item)"
                    >
                      <v-icon>mdi-pencil</v-icon>
                    </v-btn>
                    <v-btn
                      icon
                      variant="text"
                      size="small"
                      @click="deleteItem(item)"
                    >
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                  </div>
                </div>
              </div>

              <!-- Empty State -->
              <div v-else class="empty-state">
                <v-icon size="80" color="grey" class="mb-4">mdi-cart-outline</v-icon>
                <h3 class="empty-title">No Items Yet</h3>
                <p class="empty-description">Add your first item to get started</p>
              </div>

              <!-- Action Buttons Section -->
              <div class="add-item-section">
                <div class="action-buttons-row">
                  <v-btn
                    color="primary"
                    size="large"
                    @click="showAddItemDialog = true"
                    class="add-item-button"
                  >
                    <v-icon start>mdi-plus</v-icon>
                    Add Item
                  </v-btn>
                  
                  <v-btn
                    color="secondary"
                    size="large"
                    @click="printOrSavePDF"
                    class="action-button"
                    :disabled="items.length === 0"
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
                        :disabled="items.length === 0"
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

    <!-- Add Items Dialog -->
    <v-dialog v-model="showAddItemDialog" max-width="900" scrollable>
      <v-card>
        <v-card-title>
          Add Multiple Items
        </v-card-title>
        <v-card-text>
          <!-- Error Message -->
          <v-alert v-if="error && showAddItemDialog" type="error" class="mb-4" dismissible @click:close="error = null">
            {{ error }}
          </v-alert>
          
          <v-table density="compact" class="items-table">
            <thead>
              <tr>
                <th class="text-left" style="width: 30%;">Product Name</th>
                <th class="text-left" style="width: 15%;">Quantity</th>
                <th class="text-left" style="width: 15%;">Price (₪)</th>
                <th class="text-left" style="width: 30%;">Notes</th>
                <th class="text-center" style="width: 10%;">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in newItems" :key="index" class="item-row">
                <td class="pa-2">
                  <v-text-field
                    :ref="el => setProductInputRef(el, index)"
                    v-model="row.name"
                    label="Product"
                    :rules="[rules.required]"
                    density="compact"
                    hide-details="auto"
                    variant="outlined"
                  />
                </td>
                <td class="pa-2">
                  <v-text-field
                    v-model.number="row.quantity"
                    label="Qty"
                    type="number"
                    min="1"
                    density="compact"
                    hide-details="auto"
                    variant="outlined"
                  />
                </td>
                <td class="pa-2">
                  <v-text-field
                    v-model.number="row.price"
                    label="Price"
                    type="number"
                    min="0"
                    step="0.01"
                    prefix="₪"
                    density="compact"
                    hide-details="auto"
                    variant="outlined"
                  />
                </td>
                <td class="pa-2">
                  <v-text-field
                    v-model="row.notes"
                    label="Notes"
                    density="compact"
                    hide-details="auto"
                    variant="outlined"
                  />
                </td>
                <td class="text-center pa-2">
                  <v-btn
                    icon
                    variant="text"
                    size="small"
                    @click="removeItemRow(index)"
                    color="error"
                    :disabled="newItems.length === 1"
                    title="Remove Row"
                  >
                    <v-icon>mdi-delete</v-icon>
                  </v-btn>
                </td>
              </tr>
            </tbody>
          </v-table>
          
          <!-- Add Row Button -->
          <div class="text-center mt-4 mb-2">
            <v-btn
              color="primary"
              variant="outlined"
              @click="addItemRow"
              prepend-icon="mdi-plus"
            >
              Add Row
            </v-btn>
          </div>
          
          <div v-if="newItems.length === 0" class="text-center pa-4">
            <p class="text-grey">No items to add. Click the "Add Row" button to add a row.</p>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="grey" variant="text" @click="cancelAddItem">
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            @click="addItems"
            :disabled="!canSaveItems"
            :loading="adding"
          >
            {{ adding ? 'Adding...' : `Add ${newItems.filter(i => i.name && i.name.trim()).length} Item${newItems.filter(i => i.name && i.name.trim()).length !== 1 ? 's' : ''}` }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit Item Dialog -->
    <v-dialog v-model="showEditItemDialog" max-width="500">
      <v-card>
        <v-card-title>Edit Item</v-card-title>
        <v-card-text>
          <v-form ref="editForm" v-model="editFormValid">
            <v-text-field
              v-model="editingItem.name"
              label="Item Name"
              :rules="[rules.required]"
              required
            />
            <v-text-field
              v-model="editingItem.quantity"
              label="Quantity"
              type="number"
              min="1"
            />
            <v-text-field
              v-model="editingItem.notes"
              label="Notes (optional)"
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="grey" variant="text" @click="cancelEditItem">
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            @click="saveEditItem"
            :disabled="!editFormValid"
            :loading="saving"
          >
            {{ saving ? 'Saving...' : 'Save Changes' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, apiService } from '@/utils/api'

const route = useRoute()
const router = useRouter()

// Reactive data
const showAddItemDialog = ref(false)
const showEditItemDialog = ref(false)
const formValid = ref(false)
const editFormValid = ref(false)
const adding = ref(false)
const saving = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)
const productQuery = ref('')
const productSuggestions = ref<any[]>([])
const selectedProduct = ref<any | null>(null)
const priceSummary = ref<any | null>(null)
const searchingProducts = ref(false)
const addingSmartProduct = ref(false)
const smartQuantity = ref(1)
let searchTimer: number | undefined

const newItems = ref<Array<{
  name: string
  quantity: number
  price?: number
  notes: string
}>>([{
  name: '',
  quantity: 1,
  price: undefined,
  notes: ''
}])

const newItem = reactive({
  name: '',
  quantity: 1,
  notes: ''
})

const editingItem = reactive({
  id: '',
  name: '',
  quantity: 1,
  notes: ''
})

// Shopping list and items
const shoppingList = ref<any>(null)
const items = ref<any[]>([])

// Validation rules
const rules = {
  required: (value: any) => !!value || 'Required field'
}

watch(productQuery, (query) => {
  window.clearTimeout(searchTimer)
  selectedProduct.value = null
  priceSummary.value = null
  if (!query || query.trim().length < 3) { productSuggestions.value = []; return }
  searchTimer = window.setTimeout(async () => {
    searchingProducts.value = true
    try {
      const response = await apiService.grocery.search(query.trim())
      productSuggestions.value = response.data.data || []
    } catch { productSuggestions.value = [] }
    finally { searchingProducts.value = false }
  }, 900)
})

const selectProduct = async (product: any) => {
  selectedProduct.value = product
  priceSummary.value = product.pricing?.summary || null
  productSuggestions.value = []
  try {
    const response = await apiService.grocery.getProduct(product.barcode, { skipPrices: true })
    const details = response.data.data || {}
    selectedProduct.value = { ...product, ...details, pricing: product.pricing || details.pricing }
    priceSummary.value = selectedProduct.value.pricing?.summary || priceSummary.value
  } catch { /* Basic catalogue data is still useful offline from price providers. */ }
}

const openManualAdd = () => {
  newItems.value = [{ name: productQuery.value.trim(), quantity: 1, price: undefined, notes: '' }]
  showAddItemDialog.value = true
}

const addSmartProduct = async () => {
  if (!selectedProduct.value) return
  addingSmartProduct.value = true
  try {
    const cheapest = priceSummary.value?.cheapest || priceSummary.value?.minPrice || null
    const response = await apiService.shoppingItems.create({
      listId: route.params.id,
      productName: selectedProduct.value.name,
      quantity: Math.max(1, smartQuantity.value || 1),
      unit: selectedProduct.value.quantity || 'pcs',
      barcode: selectedProduct.value.barcode,
      imageUrl: selectedProduct.value.imageUrl,
      category: selectedProduct.value.category,
      estimatedPrice: cheapest,
      priceSource: cheapest ? 'api' : 'manual',
      metadata: { brand: selectedProduct.value.brand, ingredients: selectedProduct.value.ingredients, allergens: selectedProduct.value.allergens, nutritionGrade: selectedProduct.value.nutritionGrade, nutriments: selectedProduct.value.nutriments, pricing: selectedProduct.value.pricing }
    })
    await loadShoppingItems()
    productQuery.value = ''; selectedProduct.value = null; priceSummary.value = null; smartQuantity.value = 1
  } catch (err:any) { error.value = err.response?.data?.error || 'Could not add this product' }
  finally { addingSmartProduct.value = false }
}

// Helper function to check if string is a valid UUID
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

// Methods
const loadShoppingList = async () => {
  loading.value = true
  error.value = null
  
  // Check if the ID is a valid UUID
  const listId = route.params.id as string
  if (!isValidUUID(listId)) {
    error.value = `Invalid list ID format. Please create a new shopping list from the shopping lists page.`
    loading.value = false
    // Redirect to shopping lists page after 3 seconds
    setTimeout(() => {
      router.push('/shopping-lists')
    }, 3000)
    return
  }
  
  try {
    // Load shopping list - but don't fail if it errors
    try {
      const listResponse = await api.get(`/lists/${listId}`)
      shoppingList.value = listResponse.data.data || listResponse.data
      console.log('Shopping list loaded:', shoppingList.value)
    } catch (listErr: any) {
      console.warn('Failed to load shopping list details, but continuing:', listErr.response?.data)
      // Set a basic list object so we can still add items
      shoppingList.value = {
        id: listId,
        name: 'Shopping List',
        description: 'Grocery Store, This Week'
      }
    }
    
    // Load shopping items for this list (this is more important)
    await loadShoppingItems()
  } catch (err: any) {
    console.error('Error loading shopping list:', err)
    console.error('Error response:', err.response?.data)
    const errorMessage = err.response?.data?.error || err.response?.data?.details || err.message || 'Failed to load shopping list'
    error.value = errorMessage
  } finally {
    loading.value = false
  }
}

const loadShoppingItems = async () => {
  try {
    const listId = route.params.id as string
    
    // Double-check UUID validity
    if (!isValidUUID(listId)) {
      console.error('Invalid UUID format:', listId)
      error.value = 'Invalid list ID. Please create a new shopping list.'
      return
    }
    
    console.log('Loading shopping items for listId:', listId)
    const response = await apiService.shoppingItems.getAll({ listId })
    console.log('Shopping items response:', response.data)
    
    // API now returns { success: true, data: { items: [...], total: ... } }
    const responseData = response.data
    const data = responseData.data || responseData
    const itemsArray = data.items || data || []
    
    console.log('Items array:', itemsArray)
    
    items.value = itemsArray.map((item: any) => ({
      ...item,
      id: item.id,
      name: item.productName || item.name,
      quantity: item.quantity || 1,
      completed: item.checked || item.completed || false,
      notes: item.notes || '',
      metadata: item.metadata || {}
    }))
    
    console.log('Mapped items:', items.value)
    
    // Clear error on success
    if (error.value && error.value.includes('items')) {
      error.value = null
    }
  } catch (err: any) {
    console.error('Error loading shopping items:', err)
    console.error('Error response:', err.response?.data)
    console.error('Error status:', err.response?.status)
    console.error('Error details:', err.response?.data?.details)
    
    const errorMessage = err.response?.data?.error || err.response?.data?.details || err.message || 'Failed to load items'
    error.value = errorMessage
    
    // If it's a table doesn't exist error, suggest running db:fix
    if (errorMessage.includes('does not exist')) {
      error.value = 'Shopping items table does not exist. Please run: npm run db:fix in the backend directory'
    }
  }
}

const toggleItem = async (item: any) => {
  try {
    await apiService.shoppingItems.toggle(item.id)
    item.completed = !item.completed
    // Reload to get updated data
    await loadShoppingItems()
  } catch (err: any) {
    console.error('Error toggling item:', err)
    error.value = err.response?.data?.error || 'Failed to toggle item'
  }
}

const productInputRefs = ref<Array<any>>([])

const setProductInputRef = (el: any, index: number) => {
  if (el) {
    productInputRefs.value[index] = el
  }
}

const addItemRow = async () => {
  const newIndex = newItems.value.length
  newItems.value.push({
    name: '',
    quantity: 1,
    price: undefined,
    notes: ''
  })
  
  // Wait for DOM to update, then focus on the new input
  await nextTick()
  // Try multiple ways to access the input element (Vuetify 3 compatibility)
  const ref = productInputRefs.value[newIndex]
  if (ref) {
    // Try direct access
    let input: HTMLInputElement | null = null
    
    // Method 1: Vuetify component with $el
    if (ref.$el) {
      input = ref.$el.querySelector('input')
    }
    
    // Method 2: Direct element access
    if (!input && ref.querySelector) {
      input = ref.querySelector('input')
    }
    
    // Method 3: If ref is already the input
    if (!input && ref.tagName === 'INPUT') {
      input = ref as HTMLInputElement
    }
    
    if (input) {
      // Small delay to ensure the input is fully rendered
      setTimeout(() => {
        input?.focus()
      }, 50)
    }
  }
}

const removeItemRow = (index: number) => {
  if (newItems.value.length > 1) {
    newItems.value.splice(index, 1)
  }
}

const canSaveItems = computed(() => {
  return newItems.value.some(item => item.name && item.name.trim() !== '')
})

const addItems = async () => {
  if (!canSaveItems.value) {
    error.value = 'Please fill in at least one product name'
    return
  }
  
  const listId = route.params.id as string
  
  // Validate UUID before creating items
  if (!isValidUUID(listId)) {
    error.value = 'Invalid list ID. Please create a new shopping list.'
    return
  }
  
  adding.value = true
  error.value = null
  
  try {
    const validItems = newItems.value.filter(item => item.name && item.name.trim() !== '')
    
    if (validItems.length === 0) {
      error.value = 'Please fill in at least one product name'
      adding.value = false
      return
    }
    
    // Add all items one by one
    let successCount = 0
    let failCount = 0
    
    for (const item of validItems) {
      try {
        await apiService.shoppingItems.create({
          listId: listId,
          productName: item.name.trim(),
          quantity: item.quantity || 1,
          price: item.price,
          notes: item.notes || '',
          checked: false
        })
        successCount++
      } catch (itemErr: any) {
        console.error(`Error adding item "${item.name}":`, itemErr)
        failCount++
        // Continue with other items even if one fails
      }
    }
    
    // Reload items
    await loadShoppingItems()
    
    // Close dialog and reset form
    showAddItemDialog.value = false
    cancelAddItem()
    
    if (failCount > 0) {
      error.value = `Added ${successCount} item(s), but ${failCount} item(s) failed to add.`
    }
  } catch (err: any) {
    console.error('Error adding items:', err)
    error.value = err.response?.data?.error || 'Failed to add items'
  } finally {
    adding.value = false
  }
}

const addItem = async () => {
  if (!formValid.value) {
    error.value = 'Please fill in all required fields'
    return
  }
  
  if (!newItem.name || newItem.name.trim() === '') {
    error.value = 'Item name is required'
    return
  }
  
  // Don't try to load list if it fails - just use the listId from route
  if (!shoppingList.value) {
    console.warn('Shopping list not loaded, but continuing with listId from route')
  }
  
  adding.value = true
  error.value = null
  try {
    const listId = route.params.id as string
    
    // Validate UUID before creating item
    if (!isValidUUID(listId)) {
      error.value = 'Invalid list ID. Please create a new shopping list.'
      adding.value = false
      return
    }
    
    console.log('Creating item with data:', {
      listId,
      productName: newItem.name,
      quantity: newItem.quantity || 1,
      notes: newItem.notes || '',
      checked: false
    })
    
    const response = await apiService.shoppingItems.create({
      listId,
      productName: newItem.name.trim(),
      quantity: parseInt(newItem.quantity) || 1,
      notes: newItem.notes?.trim() || '',
      checked: false
    })
    
    console.log('Item created successfully:', response.data)
    
    // Extract data from response
    const createdItem = response.data.data || response.data
    
    showAddItemDialog.value = false
    
    // Reset form
    newItem.name = ''
    newItem.quantity = 1
    newItem.notes = ''
    error.value = null
    
    // Reload items (don't reload list to avoid the error)
    await loadShoppingItems()
  } catch (err: any) {
    console.error('Error adding item:', err)
    console.error('Error response:', err.response?.data)
    console.error('Error status:', err.response?.status)
    
    // Handle validation errors
    if (err.response?.status === 400) {
      const validationErrors = err.response.data?.errors || []
      if (validationErrors.length > 0) {
        error.value = validationErrors.map((e: any) => e.msg || e.message).join(', ')
      } else {
        error.value = err.response.data?.error || 'Validation failed. Please check your input.'
      }
    } else if (err.response?.status === 404) {
      error.value = 'Shopping list not found. Please refresh the page.'
    } else if (err.response?.status === 401) {
      error.value = 'You are not authorized. Please log in again.'
    } else {
      error.value = err.response?.data?.error || err.message || 'Failed to add item. Please try again.'
    }
    
    // Show error in dialog
    console.error('Error details:', error.value)
  } finally {
    adding.value = false
  }
}

const editItem = (item: any) => {
  editingItem.id = item.id
  editingItem.name = item.name
  editingItem.quantity = item.quantity
  editingItem.notes = item.notes
  showEditItemDialog.value = true
}

const saveEditItem = async () => {
  if (!editFormValid.value) return
  
  saving.value = true
  error.value = null
  try {
    await apiService.shoppingItems.update(editingItem.id, {
      productName: editingItem.name,
      quantity: editingItem.quantity,
      notes: editingItem.notes || ''
    })
    
    showEditItemDialog.value = false
    
    // Reload items
    await loadShoppingItems()
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to update item'
    console.error('Error saving item:', err)
  } finally {
    saving.value = false
  }
}

const deleteItem = async (item: any) => {
  if (!confirm('Are you sure you want to delete this item?')) return
  
  try {
    await apiService.shoppingItems.delete(item.id)
    // Remove from local array immediately for better UX
    const index = items.value.findIndex(i => i.id === item.id)
    if (index > -1) {
      items.value.splice(index, 1)
    }
    // Optionally reload to ensure sync
    await loadShoppingItems()
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to delete item'
    console.error('Error deleting item:', err)
    // Reload on error to restore state
    await loadShoppingItems()
  }
}

const cancelAddItem = () => {
  showAddItemDialog.value = false
  newItem.name = ''
  newItem.quantity = 1
  newItem.notes = ''
  // Reset multiple items form
  newItems.value = [{
    name: '',
    quantity: 1,
    price: undefined,
    notes: ''
  }]
}

const cancelEditItem = () => {
  showEditItemDialog.value = false
  editingItem.id = ''
  editingItem.name = ''
  editingItem.quantity = 1
  editingItem.notes = ''
}

onMounted(() => {
  loadShoppingList()
})

// Watch for route changes to reload data if list ID changes
watch(
  () => route.params.id,
  (newId, oldId) => {
    if (newId && newId !== oldId) {
      loadShoppingList()
    }
  }
)

// Share and Print functionality
const canUseWebShare = computed(() => {
  return typeof navigator !== 'undefined' && 'share' in navigator
})

const generateShoppingListText = () => {
  const listName = shoppingList.value?.name || 'Shopping List'
  const description = shoppingList.value?.description || ''
  let text = `🛒 ${listName}\n`
  if (description) {
    text += `${description}\n\n`
  }
  text += 'Items:\n'
  items.value.forEach((item, index) => {
    const checkbox = item.completed ? '✅' : '☐'
    text += `${checkbox} ${item.name}`
    if (item.quantity) {
      text += ` (Qty: ${item.quantity})`
    }
    if (item.price) {
      text += ` - ₪${item.price}`
    }
    if (item.notes) {
      text += ` - ${item.notes}`
    }
    text += '\n'
  })
  return text
}

const printOrSavePDF = () => {
  const listName = shoppingList.value?.name || 'Shopping List'
  const description = shoppingList.value?.description || ''
  
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
        <h2 style="margin: 0; color: #1976d2; font-size: 1.5rem; font-weight: 600;">רשימת קניות / Shopping List</h2>
      </div>
      <h1>${listName}</h1>
      ${description ? `<p class="description">${description}</p>` : ''}
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Item</th>
            <th>Quantity</th>
            <th>Price</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${items.value.map(item => `
            <tr class="${item.completed ? 'completed' : ''}">
              <td><span class="checkbox">${item.completed ? '✅' : '☐'}</span></td>
              <td>${item.name || '-'}</td>
              <td>${item.quantity || '-'}</td>
              <td>${item.price ? `₪${item.price}` : '-'}</td>
              <td>${item.notes || '-'}</td>
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
      // Remove iframe after printing
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
  const text = generateShoppingListText()
  const encodedText = encodeURIComponent(text)
  const url = `https://wa.me/?text=${encodedText}`
  window.open(url, '_blank')
}

const shareViaSMS = () => {
  const text = generateShoppingListText()
  const encodedText = encodeURIComponent(text)
  const url = `sms:?body=${encodedText}`
  window.location.href = url
}

const shareViaEmail = () => {
  const subject = encodeURIComponent(shoppingList.value?.name || 'Shopping List')
  const body = encodeURIComponent(generateShoppingListText())
  const url = `mailto:?subject=${subject}&body=${body}`
  window.location.href = url
}

const copyShareLink = async () => {
  const listId = route.params.id
  const shareUrl = `${window.location.origin}/shopping-list/${listId}`
  
  try {
    await navigator.clipboard.writeText(shareUrl)
    // Show success message (you can use a snackbar if available)
    alert('Link copied to clipboard!')
  } catch (err) {
    console.error('Failed to copy link:', err)
    error.value = 'Failed to copy link. Please copy manually: ' + shareUrl
  }
}

const shareViaWebAPI = async () => {
  if (!canUseWebShare.value) return
  
  const text = generateShoppingListText()
  const listId = route.params.id
  const shareUrl = `${window.location.origin}/shopping-list/${listId}`
  
  try {
    await navigator.share({
      title: shoppingList.value?.name || 'Shopping List',
      text: text,
      url: shareUrl
    })
  } catch (err: any) {
    // User cancelled or error occurred
    if (err.name !== 'AbortError') {
      console.error('Error sharing:', err)
      error.value = 'Failed to share. Please try another method.'
    }
  }
}
</script>

<style scoped>
.shopping-list-view{min-height:100vh;padding:0 0 72px}

.header-section{padding:42px 28px 20px;text-align:left}

.header-content{max-width:1124px;margin:0 auto;padding:0}

.header-icon{color:#245b55;font-size:1.6rem}

.app-title {
  font-size: clamp(2.4rem,5vw,4.5rem);
  font-weight: 900;
  color: #173d3a;
  margin: 0;
  letter-spacing: -.055em;
  text-align: left;
}

.app-subtitle {
  font-size: 1.2rem;
  font-weight: 600;
  color: #687572;
  margin: 0;
  letter-spacing: 0;
  text-align: left;
}

.shopping-list-card{border:1px solid #dce3df;border-radius:22px;overflow:hidden;box-shadow:none!important}
.smart-add{padding:22px;border:1px solid #cfe0db;border-radius:20px;background:#f7fbf9;margin-bottom:24px}.smart-copy{display:flex;align-items:flex-start;gap:14px;margin-bottom:18px}.smart-icon{width:46px;height:46px;flex:0 0 auto;border-radius:14px;background:#dceee6;color:#245b55;display:grid;place-items:center}.section-kicker{font:700 10px ui-monospace,monospace;letter-spacing:.13em;color:#49716b;margin-bottom:4px}.smart-copy h2,.selected-copy h3{color:#173d3a;margin:0 0 4px}.smart-copy p,.selected-copy p{color:#687572;margin:0;font-size:.82rem}.product-results{border:1px solid #dce3df;border-radius:15px;background:#fff;margin-top:8px;overflow:hidden}.product-results button{width:100%;min-height:68px;padding:9px 12px;display:flex;align-items:center;gap:12px;text-align:left;border:0;border-bottom:1px solid #edf1ef;background:#fff;color:#173d3a}.product-results button:last-child{border-bottom:0}.product-results button:hover,.product-results button:focus-visible{background:#f0f7f4}.product-thumb,.selected-image{display:grid;place-items:center;background:#eef3f1;color:#6a7d79;overflow:hidden}.product-thumb{width:48px;height:48px;border-radius:11px}.product-thumb img,.selected-image img{width:100%;height:100%;object-fit:contain}.product-result-copy{display:flex;flex:1;min-width:0;flex-direction:column}.product-result-copy strong{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.product-result-copy small{color:#75817f;margin-top:3px}.result-price{white-space:nowrap;border-radius:999px;background:#e2f1eb;color:#245b55;padding:5px 9px;font-size:.72rem;font-weight:700}.selected-product{display:grid;grid-template-columns:82px 1fr auto;gap:16px;align-items:center;margin-top:14px;padding:14px;background:#fff;border:1px solid #cfe0db;border-radius:16px}.selected-image{width:82px;height:82px;border-radius:13px}.product-badges{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.product-badges span{font-size:.66rem;color:#245b55;background:#e2f1eb;padding:4px 7px;border-radius:8px}.selected-actions{display:grid;grid-template-columns:78px 130px;gap:8px;align-items:center}.no-product{display:flex;justify-content:space-between;align-items:center;color:#687572;font-size:.8rem;padding-top:12px}

.items-list {
  margin-bottom: 2rem;
}

.shopping-item {
  display: flex;
  align-items: center;
  padding: 16px;
  background: white;
  border-radius: 15px;
  border:1px solid #e1e8e5;
  box-shadow:none;
  margin-bottom: 12px;
  transition: all 0.3s ease;
}
.item-product-image{width:54px;height:54px;flex:0 0 auto;margin-right:13px;border-radius:12px;background:#eef3f1;overflow:hidden}.item-product-image img{width:100%;height:100%;object-fit:contain}.item-insights{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}.item-insights span{font-size:.66rem;color:#245b55;background:#e2f1eb;padding:3px 7px;border-radius:7px}

.shopping-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.shopping-item.completed {
  opacity: 0.6;
  background: #f5f5f5;
}

.item-left {
  margin-right: 16px;
}

.item-content {
  flex: 1;
}

.item-name {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 4px 0;
}

.item-quantity {
  font-size: 14px;
  color: #666;
  margin: 0;
}

.item-actions {
  display: flex;
  gap: 4px;
}

.add-item-section {
  text-align: center;
  padding-top: 1rem;
  border-top: 1px solid #e0e0e0;
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
.smart-add{padding:16px}.selected-product{grid-template-columns:64px 1fr}.selected-image{width:64px;height:64px}.selected-actions{grid-column:1/-1;grid-template-columns:90px 1fr}.no-product{align-items:flex-start;flex-direction:column}
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

.items-table {
  margin-bottom: 1rem;
}

.items-table tbody tr.item-row {
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.items-table tbody tr.item-row td {
  padding: 16px 8px !important;
  vertical-align: middle;
}

.items-table tbody tr.item-row:last-child {
  border-bottom: none;
}

/* Responsive Design */
@media (max-width: 600px) {
  .app-title {
    font-size: 2rem;
  }

  .app-subtitle {
    font-size: 1rem;
  }

  .shopping-item {
    padding: 12px;
  }

  .item-name {
    font-size: 14px;
  }

  .item-quantity {
    font-size: 12px;
  }
}
</style>
