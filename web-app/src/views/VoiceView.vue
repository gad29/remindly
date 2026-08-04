<template>
  <div class="voice-view">
    <!-- Header Section -->
    <div class="header-section">
      <div class="header-content">
        <v-icon class="mr-2 header-icon">mdi-microphone</v-icon>
        <h1 class="app-title">VOICE MEMOS</h1>
        <p class="app-subtitle">Quick Thoughts, Audio Notes</p>
      </div>
    </div>

    <!-- Main Content -->
    <v-container fluid class="pa-4">
      <v-row>
        <!-- Voice Recordings List -->
        <v-col cols="12">
          <v-card class="recordings-card" elevation="4">
            <v-card-text class="pa-6">
              <div v-if="recordings.length === 0" class="empty-state text-center pa-8">
                <v-icon size="80" color="grey" class="mb-4">mdi-microphone-off</v-icon>
                <h3 class="empty-title">No Recordings Yet</h3>
                <p class="empty-description">Start recording your voice memos</p>
              </div>
              
              <div v-else class="recordings-list">
                <div
                  v-for="(recording, index) in recordings"
                  :key="recording.id"
                  class="recording-item"
                >
                  <div class="recording-left">
                    <v-icon
                      :color="recording.isCompleted ? 'primary' : 'grey'"
                      size="24"
                    >
                      {{ recording.isCompleted ? 'mdi-check-circle' : 'mdi-microphone' }}
                    </v-icon>
                  </div>
                  
                  <div class="recording-content">
                    <h3 class="recording-title">{{ recording.title }}</h3>
                    <p class="recording-subtitle">{{ recording.subtitle }}</p>
                  </div>
                  
                  <div class="recording-actions">
                    <v-btn
                      icon
                      variant="text"
                      size="small"
                      @click.stop="playRecording(recording)"
                      :disabled="!recording.audioUrl"
                    >
                      <v-icon>{{ isPlaying === recording.id ? 'mdi-pause' : 'mdi-play' }}</v-icon>
                    </v-btn>
                    <v-btn
                      icon
                      variant="text"
                      size="small"
                      @click.stop="editRecording(recording)"
                    >
                      <v-icon>mdi-pencil</v-icon>
                    </v-btn>
                    <v-btn
                      icon
                      variant="text"
                      size="small"
                      @click.stop="deleteRecording(recording)"
                    >
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                  </div>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <!-- Bottom Navigation Bar -->
    <div class="bottom-nav">
      <v-btn
        icon
        variant="text"
        size="large"
        @click="navigateToHome"
        class="nav-button"
      >
        <v-icon>mdi-home</v-icon>
        <span class="nav-label">Home</span>
      </v-btn>
      
      <v-btn
        color="primary"
        size="large"
        rounded
        elevation="8"
        @click="startRecording"
        class="new-recording-button"
      >
        <v-icon start>mdi-microphone</v-icon>
        New Recording
      </v-btn>
      
      <v-btn
        icon
        variant="text"
        size="large"
        @click="navigateToSettings"
        class="nav-button"
      >
        <v-icon>mdi-cog</v-icon>
        <span class="nav-label">Settings</span>
      </v-btn>
    </div>

    <!-- Recording Dialog -->
    <v-dialog v-model="showRecordingDialog" max-width="400">
      <v-card>
        <v-card-title class="text-center">
          Voice Recording
        </v-card-title>

        <v-card-text class="text-center">
          <v-btn
            :color="isRecording ? 'error' : isPaused ? 'warning' : 'primary'"
            size="x-large"
            @click.stop.prevent="toggleRecording"
            :disabled="isSaving"
          >
            <v-icon v-if="!isRecording && !isPaused">mdi-microphone</v-icon>
            <v-icon v-else-if="isPaused">mdi-play</v-icon>
            <v-icon v-else>mdi-pause</v-icon>
          </v-btn>
          
          <div class="mt-2" v-if="isRecording || isPaused">
            <v-btn
              color="error"
              size="small"
              @click.stop.prevent="stopRecordingCompletely"
            >
              <v-icon start>mdi-stop</v-icon>
              Stop Recording
            </v-btn>
          </div>

          <div class="mt-4">
            <p v-if="!isRecording && !isPaused && recordingDuration === 0 && !error">
              Click the microphone button to start recording.<br>
              <small class="text-grey">Your browser will show a permission request - please click "Allow" to enable microphone access.</small>
            </p>
            <p v-else-if="isRecording" class="text-error">
              <v-icon color="error" class="mr-2">mdi-record</v-icon>
              Recording... Click pause to pause, or stop to finish
            </p>
            <p v-else-if="isPaused" class="text-warning">
              <v-icon color="warning" class="mr-2">mdi-pause</v-icon>
              Recording paused... Click play to resume, or stop to finish
            </p>
            <p v-else-if="currentRecordingBlob && !error" class="text-success">
              <v-icon color="success" class="mr-2">mdi-check-circle</v-icon>
              Recording completed! Click Save to keep it.
            </p>
          </div>

          <div v-if="recordingDuration > 0" class="mt-2">
            <v-chip color="primary" variant="outlined" size="large">
              {{ formatDuration(recordingDuration) }}
            </v-chip>
          </div>
          
          <v-alert v-if="error" type="error" class="mt-4" dismissible @click:close="error = null">
            {{ error }}
          </v-alert>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn color="grey" variant="text" @click="cancelRecording">
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            @click="saveRecording"
            :disabled="!canSaveRecording"
            :loading="isSaving"
          >
            <v-icon start v-if="!isSaving">mdi-content-save</v-icon>
            {{ isSaving ? 'Saving...' : 'Save' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit Recording Dialog -->
    <v-dialog v-model="showEditDialog" max-width="600">
      <v-card>
        <v-card-title>
          Edit Recording
        </v-card-title>

        <v-card-text>
          <v-form ref="editForm" v-model="formValid">
            <v-text-field
              v-model="editingRecording.title"
              label="Title"
              :rules="[rules.required]"
              required
            />

            <v-textarea
              v-model="editingRecording.description"
              label="Description"
              rows="3"
            />

            <v-textarea
              v-model="editingRecording.transcription"
              label="Transcription"
              rows="4"
            />
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn color="grey" variant="text" @click="showEditDialog = false">
            Cancel
          </v-btn>
          <v-btn color="primary" @click="saveEdit" :disabled="!formValid">
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Audio Player -->
    <audio
      ref="audioPlayer"
      @ended="onPlaybackEnded"
      @timeupdate="onTimeUpdate"
    ></audio>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { apiService } from '@/utils/api'

const router = useRouter()
const loading = ref(false)

// Reactive data
const showRecordingDialog = ref(false)
const showEditDialog = ref(false)
const isRecording = ref(false)
const isPaused = ref(false)
const recordingDuration = ref(0)
const formValid = ref(false)
const recordingInterval = ref<number | null>(null)
const isPlaying = ref<string | null>(null)
const audioPlayer = ref<HTMLAudioElement | null>(null)
const error = ref<string | null>(null)
const isSaving = ref(false)

// MediaRecorder and related
let mediaRecorder: MediaRecorder | null = null
let audioChunks: Blob[] = []
let currentRecordingBlob: Blob | null = null
let currentRecordingUrl: string | null = null
let mediaStream: MediaStream | null = null

const editingRecording = ref({
  id: '',
  title: '',
  description: '',
  transcription: ''
})

// Load recordings from server
const loadRecordings = async () => {
  loading.value = true
  error.value = null
  try {
    const response = await apiService.voiceRecordings.getAll()
    if (response.data.success) {
      recordings.value = response.data.data.map((rec: any) => ({
        ...rec,
        audioUrl: rec.audioUrl ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001'}${rec.audioUrl}` : null,
        subtitle: formatRecordingSubtitle(rec)
      }))
    } else {
      error.value = 'Failed to load recordings'
      recordings.value = []
    }
  } catch (err: any) {
    console.error('Error loading recordings:', err)
    error.value = err.response?.data?.error || 'Failed to load recordings'
    recordings.value = []
  } finally {
    loading.value = false
  }
}

const formatRecordingSubtitle = (recording: any) => {
  const date = new Date(recording.createdAt)
  const dateStr = formatDate(date)
  const durationStr = formatDuration(recording.duration || 0)
  return `${dateStr} • ${durationStr}`
}

const recordings = ref<any[]>([])

// Computed property to check if recording can be saved
const canSaveRecording = computed(() => {
  const hasBlob = !!currentRecordingBlob
  const hasDuration = recordingDuration.value > 0
  const notRecording = !isRecording.value && !isPaused.value
  const notSaving = !isSaving.value
  
  const canSave = hasBlob && hasDuration && notRecording && notSaving
  
  if (import.meta.env.DEV) {
    console.log('canSaveRecording check:', {
      hasBlob,
      hasDuration,
      notRecording,
      notSaving,
      canSave,
      duration: recordingDuration.value,
      isRecording: isRecording.value,
      isPaused: isPaused.value
    })
  }
  
  return canSave
})

// Validation rules
const rules = {
  required: (value: any) => !!value || 'Required field'
}

// Methods
const startRecording = async () => {
  showRecordingDialog.value = true
  isRecording.value = false
  isPaused.value = false
  recordingDuration.value = 0
  error.value = null
  currentRecordingBlob = null
  if (currentRecordingUrl) {
    URL.revokeObjectURL(currentRecordingUrl)
    currentRecordingUrl = null
  }
  // Clear any existing chunks
  audioChunks = []
}

const toggleRecording = async (event?: Event) => {
  // Ensure this is called from user interaction
  if (event) {
    event.preventDefault()
    event.stopPropagation()
  }
  
  if (isRecording.value) {
    if (isPaused.value) {
      // Resume recording
      await resumeRecording()
    } else {
      // Pause recording
      await pauseRecording()
    }
  } else {
    // Start new recording
    await startActualRecording()
  }
}

const pauseRecording = () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.pause()
    isPaused.value = true
    isRecording.value = false // Show as not recording (but not stopped)
    
    // Pause the timer (keep the current duration value)
    if (recordingInterval.value) {
      clearInterval(recordingInterval.value)
      recordingInterval.value = null
    }
    
    console.log('Recording paused at:', recordingDuration.value, 'seconds')
  }
}

const resumeRecording = () => {
  if (mediaRecorder && mediaRecorder.state === 'paused') {
    mediaRecorder.resume()
    isPaused.value = false
    isRecording.value = true
    
    // Resume the timer from where it left off (don't reset)
    if (!recordingInterval.value) {
      recordingInterval.value = window.setInterval(() => {
        recordingDuration.value++
      }, 1000)
    }
    
    console.log('Recording resumed from:', recordingDuration.value, 'seconds')
  }
}

const stopRecording = async () => {
  if (mediaRecorder) {
    const state = mediaRecorder.state
    console.log('Stopping recording, current state:', state)
    
    // Clear interval first
    if (recordingInterval.value) {
      clearInterval(recordingInterval.value)
      recordingInterval.value = null
    }
    
    if (state === 'recording' || state === 'paused') {
      mediaRecorder.stop()
      // Don't set states here - let onstop handler do it after blob is created
    }
    
    // Wait for onstop to fire and create the blob
    await new Promise(resolve => setTimeout(resolve, 300))
  }
  
  // Ensure stream is stopped even if mediaRecorder is null
  if (mediaStream) {
    console.log('Stopping media stream tracks')
    mediaStream.getTracks().forEach(track => {
      track.stop()
      console.log('Track stopped:', track.kind, track.label)
    })
    mediaStream = null
  }
}

const startActualRecording = async () => {
  // Check if getUserMedia is available
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    error.value = 'Your browser does not support voice recording. Please use a modern browser like Chrome, Firefox, or Edge.'
    isRecording.value = false
    return
  }
  
  // Check if we're on HTTPS or localhost (required for getUserMedia)
  if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
    error.value = 'Voice recording requires HTTPS. Please access the site via HTTPS or localhost.'
    isRecording.value = false
    return
  }
  
  try {
    error.value = null
    
    // Request microphone permission - this MUST be called directly from user interaction
    // This will trigger the browser's permission dialog
    console.log('Requesting microphone access...')
    console.log('Protocol:', location.protocol)
    console.log('Hostname:', location.hostname)
    
    // Request permission - browser will show permission dialog
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      } 
    })
    
    console.log('Microphone access granted, stream received:', stream)
    console.log('Stream tracks:', stream.getTracks())
    
    // Store stream for cleanup
    mediaStream = stream
    
    // Create MediaRecorder with timeslice for better pause/resume support
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    })
    audioChunks = []
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        audioChunks.push(event.data)
      }
    }
    
    mediaRecorder.onstop = () => {
      // Combine all chunks into a single blob
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
      currentRecordingBlob = audioBlob
      currentRecordingUrl = URL.createObjectURL(audioBlob)
      
      // Ensure recording states are cleared
      isRecording.value = false
      isPaused.value = false
      
      // Stop all tracks
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop())
        mediaStream = null
      }
      
      console.log('Recording stopped, blob size:', audioBlob.size)
      console.log('Final duration:', recordingDuration.value, 'seconds')
      console.log('Blob created, can save:', !!currentRecordingBlob)
      console.log('Current state - isRecording:', isRecording.value, 'isPaused:', isPaused.value)
    }
    
    mediaRecorder.onpause = () => {
      console.log('Recording paused')
    }
    
    mediaRecorder.onresume = () => {
      console.log('Recording resumed')
    }
    
    mediaRecorder.onerror = (event: any) => {
      console.error('MediaRecorder error:', event)
      error.value = 'An error occurred during recording. Please try again.'
      isRecording.value = false
      isPaused.value = false
    }
    
    // Start recording with timeslice (collect data every 1 second)
    mediaRecorder.start(1000)
    isRecording.value = true
    isPaused.value = false
    // Don't reset duration - keep existing value when resuming
    error.value = null
    
    // Start duration timer only if not already running
    if (!recordingInterval.value) {
      recordingInterval.value = window.setInterval(() => {
        recordingDuration.value++
      }, 1000)
    }
  } catch (err: any) {
    console.error('Error starting recording:', err)
    isRecording.value = false
    
    // Provide specific error messages based on error type
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      error.value = 'Microphone permission was denied. Please click the lock icon (🔒) in your browser\'s address bar, allow microphone access, then try again. Or go to browser settings and enable microphone for this site.'
    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      error.value = 'No microphone found. Please connect a microphone and try again.'
    } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      error.value = 'Microphone is already in use by another application. Please close other applications using the microphone and try again.'
    } else if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
      error.value = 'Microphone settings are not supported. Please try a different microphone.'
    } else if (err.name === 'SecurityError') {
      error.value = 'Security error. Please make sure you are accessing the site via HTTPS or localhost.'
    } else {
      error.value = `Failed to start recording: ${err.message || 'Unknown error'}. Please check your microphone permissions and try again.`
    }
  }
}

const stopRecordingCompletely = async () => {
  await stopRecording()
  
  // Ensure stream is stopped
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop())
    mediaStream = null
  }
}

const cancelRecording = async () => {
  if (isRecording.value || isPaused.value) {
    await stopRecordingCompletely()
  }
  isRecording.value = false
  isPaused.value = false
  recordingDuration.value = 0
  if (recordingInterval.value) {
    clearInterval(recordingInterval.value)
    recordingInterval.value = null
  }
  if (currentRecordingUrl) {
    URL.revokeObjectURL(currentRecordingUrl)
    currentRecordingUrl = null
  }
  currentRecordingBlob = null
  audioChunks = []
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop())
    mediaStream = null
  }
  showRecordingDialog.value = false
  error.value = null
}

const saveRecording = async () => {
  // Stop recording if still active
  if (isRecording.value || isPaused.value) {
    await stopRecordingCompletely()
    // Wait for the blob to be created in onstop handler
    await new Promise(resolve => setTimeout(resolve, 300))
  }
  
  if (!currentRecordingBlob) {
    error.value = 'No recording to save. Please record something first.'
    return
  }
  
  if (recordingDuration.value === 0) {
    error.value = 'Recording is too short. Please record at least 1 second.'
    return
  }
  
  isSaving.value = true
  error.value = null
  
  try {
    // Create FormData to send the audio file
    const formData = new FormData()
    const now = new Date()
    const fileName = `recording-${Date.now()}.webm`
    
    // Ensure the blob has the correct type
    let audioBlob = currentRecordingBlob
    if (!audioBlob.type || !audioBlob.type.startsWith('audio/')) {
      console.warn('Blob type is not audio, converting:', audioBlob.type)
      audioBlob = new Blob([audioBlob], { type: 'audio/webm' })
    }
    
    // Create File object with explicit MIME type and extension
    const audioFile = new File([audioBlob], fileName, { 
      type: 'audio/webm',
      lastModified: Date.now()
    })
    
    console.log('Saving recording:', {
      fileName,
      fileSize: audioFile.size,
      fileType: audioFile.type,
      fileName_prop: audioFile.name,
      duration: recordingDuration.value,
      blobSize: currentRecordingBlob.size,
      blobType: currentRecordingBlob.type
    })
    
    // Verify file properties before sending
    if (!audioFile.type || !audioFile.name) {
      error.value = 'Failed to create valid file object'
      isSaving.value = false
      return
    }
    
    // Append file - make sure field name matches backend expectation ('audio')
    // Use the File object directly - multer will extract MIME type from it
    formData.append('audio', audioFile, fileName)
    formData.append('title', `Recording ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`)
    formData.append('duration', recordingDuration.value.toString())
    formData.append('language', 'auto')
    
    // Log FormData contents (for debugging)
    console.log('FormData entries:')
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`  ${key}: File(${value.name}, ${value.type}, ${value.size} bytes)`)
      } else {
        console.log(`  ${key}: ${value}`)
      }
    }
    
    const response = await apiService.voiceRecordings.create(formData)
    
    if (response.data.success) {
      const newRecording = {
        ...response.data.data,
        audioUrl: response.data.data.audioUrl 
          ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001'}${response.data.data.audioUrl}`
          : null,
        subtitle: formatRecordingSubtitle(response.data.data)
      }
      
      recordings.value.unshift(newRecording)
      
      // Ensure stream is stopped before resetting
      if (mediaStream) {
        console.log('Stopping media stream after successful save')
        mediaStream.getTracks().forEach(track => {
          track.stop()
          console.log('Track stopped after save:', track.kind)
        })
        mediaStream = null
      }
      
      // Reset
      cancelRecording()
    } else {
      error.value = response.data.error || 'Failed to save recording'
      
      // Stop stream even on error
      if (mediaStream) {
        console.log('Stopping media stream after save error')
        mediaStream.getTracks().forEach(track => track.stop())
        mediaStream = null
      }
    }
  } catch (err: any) {
    console.error('Error saving recording:', err)
    error.value = err.response?.data?.error || 'Failed to save recording'
    
    // Stop stream on error
    if (mediaStream) {
      console.log('Stopping media stream after exception')
      mediaStream.getTracks().forEach(track => track.stop())
      mediaStream = null
    }
  } finally {
    isSaving.value = false
  }
}

const playRecording = async (recording: any) => {
  if (isPlaying.value === recording.id) {
    // Pause current recording
    if (audioPlayer.value) {
      audioPlayer.value.pause()
    }
    isPlaying.value = null
  } else {
    // Stop any currently playing recording
    if (audioPlayer.value) {
      audioPlayer.value.pause()
      audioPlayer.value.currentTime = 0
    }
    
    // Play new recording
    if (audioPlayer.value) {
      if (!recording.audioUrl) {
        error.value = 'No audio URL available for this recording'
        return
      }
      
      try {
        audioPlayer.value.src = recording.audioUrl
        await audioPlayer.value.play()
        isPlaying.value = recording.id
      } catch (err: any) {
        console.error('Error playing recording:', err)
        error.value = 'Failed to play recording. Please check if the file exists.'
        isPlaying.value = null
      }
    }
  }
}

const onPlaybackEnded = () => {
  isPlaying.value = null
}

const onTimeUpdate = () => {
  // Handle time updates if needed
}

const deleteRecording = async (recording: any) => {
  if (!confirm(`Are you sure you want to delete "${recording.title}"?`)) {
    return
  }
  
  try {
    const response = await apiService.voiceRecordings.delete(recording.id)
    
    if (response.data.success) {
      const index = recordings.value.findIndex(r => r.id === recording.id)
      if (index > -1) {
        recordings.value.splice(index, 1)
      }
      
      // If this was the playing recording, stop it
      if (isPlaying.value === recording.id) {
        if (audioPlayer.value) {
          audioPlayer.value.pause()
          audioPlayer.value.currentTime = 0
        }
        isPlaying.value = null
      }
    } else {
      error.value = response.data.error || 'Failed to delete recording'
    }
  } catch (err: any) {
    console.error('Error deleting recording:', err)
    error.value = err.response?.data?.error || 'Failed to delete recording'
  }
}

const editRecording = (recording: any) => {
  editingRecording.value = { ...recording }
  showEditDialog.value = true
}

const saveEdit = async () => {
  try {
    const response = await apiService.voiceRecordings.update(editingRecording.value.id, {
      title: editingRecording.value.title,
      description: editingRecording.value.description,
      transcription: editingRecording.value.transcription
    })
    
    if (response.data.success) {
      const index = recordings.value.findIndex(r => r.id === editingRecording.value.id)
      if (index !== -1) {
        recordings.value[index] = {
          ...recordings.value[index],
          ...response.data.data,
          subtitle: formatRecordingSubtitle(response.data.data)
        }
      }
      showEditDialog.value = false
    } else {
      error.value = response.data.error || 'Failed to update recording'
    }
  } catch (err: any) {
    console.error('Error saving edit:', err)
    error.value = err.response?.data?.error || 'Failed to update recording'
  }
}

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const formatDate = (date: Date | string) => {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return d.toLocaleDateString()
}

// Navigation functions
const navigateToHome = () => {
  router.push('/')
}

const navigateToSettings = () => {
  router.push('/settings')
}

onMounted(() => {
  // Load recordings from server
  loadRecordings()
  
  // Check if MediaRecorder is supported
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.warn('getUserMedia is not supported in this browser')
  }
  
  // Check MediaRecorder support
  if (!window.MediaRecorder) {
    console.warn('MediaRecorder is not supported in this browser')
  }
})
</script>

<style scoped>
.voice-view {
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
  max-width: 400px;
  margin: 0 auto;
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

.recordings-card {
  border-radius: 16px;
  overflow: hidden;
}

.recordings-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recording-item {
  display: flex;
  align-items: center;
  padding: 16px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
}

.recording-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.recording-left {
  margin-right: 16px;
}

.recording-content {
  flex: 1;
}

.recording-title {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 4px 0;
}

.recording-subtitle {
  font-size: 14px;
  color: #666;
  margin: 0;
}

.recording-actions {
  margin-left: 16px;
  display: flex;
  gap: 4px;
}

.empty-state {
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
  margin: 0;
}

/* Bottom Navigation Bar */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 8px 16px;
  z-index: 1000;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
}

.nav-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 60px;
  height: 60px;
}

.nav-label {
  font-size: 12px;
  font-weight: 500;
  color: #666;
}

.new-recording-button {
  font-size: 1rem;
  font-weight: 600;
  padding: 12px 24px;
  text-transform: none;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

.new-recording-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

/* Add bottom padding to main content to account for fixed bottom nav */
.voice-view {
  padding-bottom: 80px;
}

/* Responsive Design */
@media (max-width: 600px) {
  .app-title {
    font-size: 2rem;
  }

  .app-subtitle {
    font-size: 0.9rem;
  }

  .recording-item {
    padding: 12px;
  }

  .recording-title {
    font-size: 14px;
  }

  .recording-subtitle {
    font-size: 12px;
  }

  .bottom-nav {
    padding: 4px 8px;
  }

  .nav-button {
    min-width: 50px;
    height: 50px;
  }

  .nav-label {
    font-size: 10px;
  }

  .new-recording-button {
    font-size: 0.9rem;
    padding: 8px 16px;
  }
}
</style>