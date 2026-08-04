import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { List, CreateListForm } from '@/types'
import { api } from '@/utils/api'

export const useListStore = defineStore('list', () => {
  // State
  const lists = ref<List[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const listsByType = computed(() => {
    // Return all lists as custom - no default categorization
    return {
      tasks: null,
      shopping: null,
      calls: null,
      meetings: null,
      appointments: null,
      repairs: null,
      custom: lists.value
    }
  })

  const getListById = computed(() => (id: string) => 
    lists.value.find(list => list.id === id)
  )

  // Actions
  const loadLists = async () => {
    // Check if user is authenticated
    const token = localStorage.getItem('token')
    if (!token) {
      lists.value = []
      return
    }

    loading.value = true
    error.value = null
    
    try {
      const response = await api.get('/lists')
      lists.value = response.data.data || response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || 'שגיאה בטעינת הרשימות'
      // Clear lists on error
      lists.value = []
    } finally {
      loading.value = false
    }
  }

  const createList = async (listData: CreateListForm) => {
    loading.value = true
    error.value = null
    
    try {
      console.log('Creating list with data:', listData)
      const response = await api.post('/lists', listData)
      const newList = response.data.data || response.data
      lists.value.push(newList)
      
      return { success: true, list: newList }
    } catch (err: any) {
      console.error('Error creating list:', err)
      console.error('Error response:', err.response?.data)
      error.value = err.response?.data?.error || err.response?.data?.message || 'שגיאה ביצירת הרשימה'
      if (err.response?.data?.details) {
        console.error('Validation errors:', err.response.data.details)
      }
      return { success: false, error: error.value, details: err.response?.data?.details }
    } finally {
      loading.value = false
    }
  }

  const updateList = async (id: string, listData: Partial<CreateListForm>) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.put(`/lists/${id}`, listData)
      const updatedList = response.data.data || response.data
      const index = lists.value.findIndex(list => list.id === id)
      if (index !== -1) {
        lists.value[index] = updatedList
      }
      
      return { success: true, list: updatedList }
    } catch (err: any) {
      error.value = err.response?.data?.message || 'שגיאה בעדכון הרשימה'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  const deleteList = async (id: string) => {
    loading.value = true
    error.value = null
    
    try {
      await api.delete(`/lists/${id}`)
      lists.value = lists.value.filter(list => list.id !== id)
      
      return { success: true }
    } catch (err: any) {
      error.value = err.response?.data?.message || 'שגיאה במחיקת הרשימה'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  const reorderLists = async (reorderedLists: List[]) => {
    loading.value = true
    error.value = null
    
    try {
      const updates = reorderedLists.map((list, index) => ({
        id: list.id,
        position: index
      }))
      
      await api.put('/lists/reorder', { lists: updates })
      lists.value = reorderedLists
      
      return { success: true }
    } catch (err: any) {
      error.value = err.response?.data?.message || 'שגיאה בסידור הרשימות'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }


  const searchLists = async (query: string) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.get(`/lists/search?q=${encodeURIComponent(query)}`)
      return { success: true, results: response.data.data || response.data }
    } catch (err: any) {
      error.value = err.response?.data?.message || 'שגיאה בחיפוש רשימות'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  const clearError = () => {
    error.value = null
  }

  return {
    // State
    lists,
    loading,
    error,
    
    // Getters
    listsByType,
    getListById,
    
    // Actions
    loadLists,
    createList,
    updateList,
    deleteList,
    reorderLists,
    searchLists,
    clearError
  }
})
