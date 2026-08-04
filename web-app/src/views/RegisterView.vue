<template>
  <main class="register-page" dir="ltr">
    <RouterLink to="/login" class="register-brand"><span class="brand-symbol"><v-icon>mdi-bell-check-outline</v-icon></span><span>remindly</span></RouterLink>
    <section class="register-card" aria-labelledby="register-title">
      <header>
        <p class="eyebrow">Start with one thought</p>
        <h1 id="register-title">Create your account</h1>
        <p>One account keeps your reminders, lists and server routines together.</p>
      </header>

      <v-alert v-if="errorMessage" type="error" variant="tonal" class="mb-5" closable
        @click:close="errorMessage = ''" role="alert">{{ errorMessage }}</v-alert>

      <v-form ref="registerForm" v-model="formValid" @submit.prevent="handleRegister">
        <label class="field-label" for="register-name">Your name</label>
        <v-text-field id="register-name" v-model.trim="form.name" autocomplete="name" placeholder="How should we address you?"
          :rules="[rules.required, rules.name]" variant="outlined" prepend-inner-icon="mdi-account-outline" class="auth-field" />

        <label class="field-label" for="register-email">Email address</label>
        <v-text-field id="register-email" v-model.trim="form.email" type="email" autocomplete="email" placeholder="you@example.com"
          :rules="[rules.required, rules.email]" variant="outlined" prepend-inner-icon="mdi-email-outline" class="auth-field" />

        <div class="form-grid">
          <div>
            <label class="field-label" for="register-password">Password</label>
            <v-text-field id="register-password" v-model="form.password" :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password" :rules="[rules.required, rules.password]" variant="outlined"
              :append-inner-icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
              @click:append-inner="showPassword = !showPassword" class="auth-field" />
          </div>
          <div>
            <label class="field-label" for="register-confirm">Confirm password</label>
            <v-text-field id="register-confirm" v-model="form.confirmPassword" :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password" :rules="[rules.required, rules.confirm]" variant="outlined" class="auth-field" />
          </div>
        </div>

        <label class="field-label" for="register-language">Preferred language</label>
        <v-select id="register-language" v-model="form.language" :items="languages" item-title="title" item-value="value"
          variant="outlined" prepend-inner-icon="mdi-translate" class="auth-field" />

        <v-checkbox v-model="acceptTerms" color="primary" hide-details class="terms-check">
          <template #label><span>I agree to use Remindly responsibly and keep my account credentials private.</span></template>
        </v-checkbox>

        <v-btn type="submit" color="primary" size="x-large" block :loading="userStore.loading"
          :disabled="!formValid || !acceptTerms || userStore.loading" class="auth-submit">Create account</v-btn>
      </v-form>

      <p class="auth-switch">Already have an account? <RouterLink to="/login">Sign in</RouterLink></p>
    </section>
    <aside class="register-note"><v-icon>mdi-microphone-outline</v-icon><span><strong>Voice-first, confirmation-always.</strong>Your assistant previews every change before applying it.</span></aside>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'

const router = useRouter()
const userStore = useUserStore()
const registerForm = ref()
const formValid = ref(false)
const acceptTerms = ref(false)
const showPassword = ref(false)
const errorMessage = ref('')
const form = ref({ name: '', email: '', password: '', confirmPassword: '', language: 'en' as 'he' | 'en' })
const languages = [{ title: 'English', value: 'en' }, { title: 'עברית', value: 'he' }]
const rules = {
  required: (value: string) => Boolean(value) || 'This field is required',
  name: (value: string) => value.length >= 2 || 'Use at least 2 characters',
  email: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || 'Enter a valid email address',
  password: (value: string) => value.length >= 8 || 'Use at least 8 characters',
  confirm: (value: string) => value === form.value.password || 'Passwords do not match'
}

const handleRegister = async () => {
  const validation = await registerForm.value?.validate()
  if (!validation?.valid || !acceptTerms.value) return
  errorMessage.value = ''
  const result = await userStore.register({ name: form.value.name, email: form.value.email, password: form.value.password, language: form.value.language })
  if (result.success) await router.replace('/')
  else errorMessage.value = result.error || 'Registration failed. Please try again.'
}
</script>

<style scoped>
.register-page{min-height:100dvh;display:grid;grid-template-columns:minmax(0,760px) minmax(260px,360px);align-content:center;justify-content:center;gap:40px;padding:80px 32px;background:radial-gradient(circle at 12% 14%,#dceef0 0,transparent 30%),var(--surface-soft)}
.register-brand{position:absolute;top:28px;left:32px;display:flex;align-items:center;gap:10px;color:var(--ink);font:700 1.2rem var(--font-display);text-decoration:none}.brand-symbol{display:grid;place-items:center;width:36px;height:36px;border-radius:11px;color:#132a3a;background:var(--accent)}
.register-card{padding:clamp(28px,5vw,58px);border:1px solid var(--line);border-radius:28px;background:var(--surface);box-shadow:var(--shadow-lg)}
.register-card header{margin-bottom:30px}.eyebrow{margin:0 0 12px;color:var(--primary);font:700 .76rem var(--font-utility);letter-spacing:.15em;text-transform:uppercase}.register-card h1{margin:0;color:var(--ink);font:650 clamp(2.4rem,5vw,4rem)/1 var(--font-display);letter-spacing:-.05em}.register-card header p:last-child{color:var(--ink-muted)}
.field-label{display:block;margin:0 0 8px;color:var(--ink);font-weight:650;font-size:.88rem}.auth-field{margin-bottom:7px}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.terms-check{margin:2px 0 18px}.terms-check span{color:var(--ink-muted);font-size:.84rem;line-height:1.45}.auth-submit{height:54px!important;border-radius:14px!important;font-weight:700;text-transform:none;letter-spacing:0}.auth-switch{text-align:center;margin:26px 0 0;color:var(--ink-muted)}.auth-switch a{color:var(--primary);font-weight:700;text-decoration:none}
.register-note{align-self:end;display:flex;gap:16px;padding:24px;border-radius:22px;color:#dce8ed;background:#132a3a}.register-note .v-icon{flex:0 0 auto;color:var(--accent)}.register-note span,.register-note strong{display:block}.register-note span{font-size:.88rem;line-height:1.55}.register-note strong{margin-bottom:5px;color:#fff}
@media(max-width:900px){.register-page{grid-template-columns:minmax(0,680px);padding:92px 18px 48px}.register-note{display:none}.form-grid{grid-template-columns:1fr}.register-brand{left:22px}}
</style>
