import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import App from './App.vue'
import router from './router'

// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import '@mdi/font/css/materialdesignicons.css'

// Locales
import he from './locales/he.json'
import en from './locales/en.json'

// Styles
import './styles/main.scss'

const i18n = createI18n({
  legacy: false,
  locale: 'he',
  fallbackLocale: 'en',
  messages: {
    he,
    en
  }
})

const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi
    }
  },
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#176b78',
          secondary: '#526773',
          accent: '#ffb38a',
          error: '#c5484d',
          info: '#347ba3',
          success: '#2e8b6d',
          warning: '#b77712',
          background: '#f3f7f7',
          surface: '#ffffff'
        }
      },
      dark: {
        colors: {
          primary: '#6fc3ca',
          secondary: '#a9bbc3',
          accent: '#ffb38a',
          error: '#ff8b91',
          info: '#79b9dc',
          success: '#67c5a5',
          warning: '#e6b866',
          background: '#0f202c',
          surface: '#172e3d'
        }
      }
    }
  }
})

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(i18n)
app.use(vuetify)

app.mount('#app')
