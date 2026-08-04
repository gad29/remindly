<template>
  <main class="auth-page" dir="ltr">
    <section class="auth-story" aria-labelledby="welcome-title">
      <RouterLink to="/login" class="brand-lockup" aria-label="Remindly home">
        <span class="brand-symbol"><v-icon>mdi-bell-check-outline</v-icon></span>
        <span>remindly</span>
      </RouterLink>
      <div class="story-copy">
        <p class="eyebrow">Your day, remembered</p>
        <h1 id="welcome-title">Clear your head.<br />Keep the promise.</h1>
        <p>Capture a thought by voice or text. Remindly turns it into a task you can review, schedule and finish.</p>
      </div>
      <div class="capture-preview" aria-hidden="true">
        <div class="capture-orb"><v-icon>mdi-waveform</v-icon></div>
        <div><small>Voice capture</small><strong>“Remind me to renew the SSL certificate Friday.”</strong></div>
        <v-icon color="success">mdi-check-circle</v-icon>
      </div>
    </section>

    <section class="auth-panel" aria-labelledby="login-title">
      <div class="auth-form-wrap">
        <p class="eyebrow">Welcome back</p>
        <h2 id="login-title">Sign in to your day</h2>
        <p class="auth-intro">Use the account you created for Remindly.</p>

        <v-alert v-if="errorMessage" type="error" variant="tonal" class="mb-5" closable
          @click:close="errorMessage = ''" role="alert">{{ errorMessage }}</v-alert>

        <v-form ref="loginForm" v-model="formValid" @submit.prevent="handleLogin">
          <label class="field-label" for="login-email">Email address</label>
          <v-text-field id="login-email" v-model.trim="loginData.email" type="email" autocomplete="email"
            placeholder="you@example.com" :rules="[rules.required, rules.email]" variant="outlined"
            prepend-inner-icon="mdi-email-outline" class="auth-field" required />

          <div class="field-heading">
            <label class="field-label" for="login-password">Password</label>
          </div>
          <v-text-field id="login-password" v-model="loginData.password" :type="showPassword ? 'text' : 'password'"
            autocomplete="current-password" placeholder="At least 6 characters" :rules="[rules.required]"
            variant="outlined" prepend-inner-icon="mdi-lock-outline"
            :append-inner-icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
            :aria-label="showPassword ? 'Hide password' : 'Show password'"
            @click:append-inner="showPassword = !showPassword" class="auth-field" required />

          <v-btn type="submit" color="primary" size="x-large" block :loading="userStore.loading"
            :disabled="!formValid || userStore.loading" class="auth-submit">Sign in</v-btn>
        </v-form>

        <p class="auth-switch">New to Remindly? <RouterLink to="/register">Create your account</RouterLink></p>
        <p class="auth-footnote"><v-icon size="16">mdi-shield-check-outline</v-icon>Your data stays in your own Remindly server.</p>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'

const router = useRouter()
const userStore = useUserStore()
const loginForm = ref()
const formValid = ref(false)
const showPassword = ref(false)
const errorMessage = ref('')
const loginData = ref({ email: '', password: '' })

const rules = {
  required: (value: string) => Boolean(value) || 'This field is required',
  email: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || 'Enter a valid email address'
}

const handleLogin = async () => {
  const validation = await loginForm.value?.validate()
  if (!validation?.valid) return
  errorMessage.value = ''
  const result = await userStore.login(loginData.value.email, loginData.value.password)
  if (result.success) await router.replace('/')
  else errorMessage.value = result.error || 'Login failed. Please try again.'
}
</script>

<style scoped>
.auth-page{min-height:100dvh;display:grid;grid-template-columns:minmax(320px,1.05fr) minmax(420px,.95fr);background:var(--surface)}
.auth-story{position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;padding:clamp(32px,5vw,72px);color:#f7fbff;background:#132a3a}
.auth-story::after{content:"";position:absolute;width:520px;height:520px;right:-210px;bottom:-210px;border:1px solid rgba(255,255,255,.16);border-radius:50%;box-shadow:0 0 0 72px rgba(255,255,255,.035),0 0 0 144px rgba(255,255,255,.025)}
.brand-lockup{position:relative;z-index:1;display:inline-flex;align-items:center;gap:12px;width:max-content;color:inherit;text-decoration:none;font:700 1.25rem/1 var(--font-display)}
.brand-symbol{display:grid;place-items:center;width:38px;height:38px;border-radius:12px;color:#132a3a;background:var(--accent)}
.story-copy{position:relative;z-index:1;max-width:650px;margin-block:auto;padding-block:72px}
.eyebrow{margin:0 0 14px;color:var(--accent);font:700 .76rem/1.2 var(--font-utility);letter-spacing:.16em;text-transform:uppercase}
.story-copy h1{margin:0 0 24px;font:650 clamp(3rem,6vw,6.4rem)/.94 var(--font-display);letter-spacing:-.06em}
.story-copy>p:last-child{max-width:540px;margin:0;color:#c8d7df;font-size:1.08rem;line-height:1.7}
.capture-preview{position:relative;z-index:1;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:16px;max-width:620px;padding:16px 18px;border:1px solid rgba(255,255,255,.16);border-radius:20px;background:rgba(255,255,255,.08);backdrop-filter:blur(12px)}
.capture-orb{display:grid;place-items:center;width:46px;height:46px;border-radius:50%;color:#132a3a;background:var(--accent)}
.capture-preview small,.capture-preview strong{display:block}.capture-preview small{margin-bottom:3px;color:#9eb2bd}.capture-preview strong{font-size:.92rem;font-weight:550}
.auth-panel{display:grid;place-items:center;padding:40px clamp(24px,6vw,84px);background:var(--surface)}
.auth-form-wrap{width:min(100%,470px)}
.auth-form-wrap h2{margin:0;color:var(--ink);font:650 clamp(2.1rem,4vw,3.5rem)/1.05 var(--font-display);letter-spacing:-.045em}
.auth-intro{margin:14px 0 34px;color:var(--ink-muted)}
.field-label{display:block;margin:0 0 8px;color:var(--ink);font-weight:650;font-size:.88rem}
.auth-field{margin-bottom:8px}.auth-submit{height:54px!important;margin-top:8px;border-radius:14px!important;font-weight:700;letter-spacing:0;text-transform:none}
.auth-switch{margin:28px 0 0;text-align:center;color:var(--ink-muted)}.auth-switch a{color:var(--primary);font-weight:700;text-decoration:none}.auth-switch a:hover{text-decoration:underline}
.auth-footnote{display:flex;align-items:center;justify-content:center;gap:7px;margin:22px 0 0;color:var(--ink-soft);font-size:.78rem}
@media(max-width:820px){.auth-page{grid-template-columns:1fr}.auth-story{min-height:auto;padding:24px}.story-copy{padding:52px 0 38px}.story-copy h1{font-size:clamp(2.8rem,14vw,4.5rem)}.capture-preview{display:none}.auth-panel{padding:48px 24px 72px}}
</style>
