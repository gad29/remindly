<template>
  <v-container class="create-list-page" fluid>
    <v-btn variant="text" prepend-icon="mdi-arrow-left" class="back-link" @click="router.push('/lists')">Back to lists</v-btn>
    <div class="create-layout">
      <section class="create-intro">
        <div class="kicker">A NEW SPACE</div>
        <h1>What do you want to move forward?</h1>
        <p>A list can be a quick checklist or a detailed routine with instructions for every task.</p>
        <div class="preview-card" :style="{ '--accent': form.color }">
          <span class="preview-icon"><v-icon :icon="form.icon" size="28"/></span>
          <div><strong>{{ form.name || 'Untitled routine' }}</strong><p>{{ form.description || 'Your description will appear here.' }}</p></div>
          <v-icon icon="mdi-arrow-right"/>
        </div>
      </section>

      <v-form ref="formRef" class="creation-card" @submit.prevent="createList">
        <div class="step-label"><span>1</span><div><strong>Name the outcome</strong><p>Short and specific works best.</p></div></div>
        <v-text-field v-model="form.name" label="List name" placeholder="Website launch, Weekly reset…" variant="outlined" :rules="nameRules" autofocus/>
        <v-textarea v-model="form.description" label="A helpful description" placeholder="What belongs here, and what does done look like?" variant="outlined" rows="3" counter="500"/>

        <div class="step-label"><span>2</span><div><strong>Choose its character</strong><p>You can change this later.</p></div></div>
        <div class="template-grid">
          <button v-for="template in templates" :key="template.name" type="button" :class="['template-choice',{active:form.icon===template.icon}]" @click="applyTemplate(template)">
            <span :style="{background:template.tint,color:template.color}"><v-icon :icon="template.icon"/></span><strong>{{ template.name }}</strong><small>{{ template.caption }}</small>
          </button>
        </div>

        <v-alert v-if="error" type="error" variant="tonal" class="mt-5">{{ error }}</v-alert>
        <div class="form-actions"><v-btn variant="text" @click="router.push('/lists')">Cancel</v-btn><v-btn type="submit" color="primary" size="large" append-icon="mdi-arrow-right" :loading="loading">Create and add tasks</v-btn></div>
      </v-form>
    </div>
  </v-container>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useListStore } from '@/stores/listStore'

const router=useRouter(),listStore=useListStore(),formRef=ref(),loading=ref(false),error=ref('')
const form=reactive({name:'',description:'',icon:'mdi-format-list-checks',color:'#245B55'})
const templates=[
  {name:'Simple',caption:'Everyday tasks',icon:'mdi-format-list-checks',color:'#245B55',tint:'#DCEEE6'},
  {name:'Project',caption:'A clear finish line',icon:'mdi-rocket-launch-outline',color:'#42637A',tint:'#E3EDF3'},
  {name:'Routine',caption:'Repeat with confidence',icon:'mdi-repeat',color:'#765B2B',tint:'#F4E9D3'},
  {name:'Home',caption:'Keep life running',icon:'mdi-home-heart',color:'#8A4E48',tint:'#F4E3E0'},
  {name:'Learning',caption:'Ideas into practice',icon:'mdi-book-open-page-variant-outline',color:'#66558A',tint:'#ECE7F5'},
  {name:'Wellbeing',caption:'Small steady care',icon:'mdi-heart-pulse',color:'#A04A60',tint:'#F7E2E8'}
]
const nameRules=[(value:string)=>Boolean(value?.trim())||'Give your list a name',(value:string)=>(value?.length||0)<=100||'Keep the name under 100 characters']
const applyTemplate=(template:any)=>{form.icon=template.icon;form.color=template.color}
const createList=async()=>{const validation=await formRef.value?.validate();if(!validation?.valid)return;loading.value=true;error.value='';const result=await listStore.createList({...form});loading.value=false;if(result.success&&result.list)router.push(`/lists/${result.list.id}`);else error.value=result.error||'Could not create this list'}
</script>

<style scoped>
.create-list-page{max-width:1180px;padding:26px 28px 80px}.back-link{margin-left:-12px;margin-bottom:22px}.create-layout{display:grid;grid-template-columns:minmax(280px,.8fr) minmax(480px,1.2fr);gap:48px;align-items:start}.create-intro{position:sticky;top:30px;padding-top:22px}.create-intro h1{font-size:clamp(2.5rem,5vw,4.6rem);line-height:.96;letter-spacing:-.055em;color:#173d3a;margin:0 0 18px}.create-intro>p{color:#687572;max-width:470px;font-size:1.04rem}.kicker{font:700 11px ui-monospace,monospace;letter-spacing:.14em;color:#245b55;margin-bottom:12px}.preview-card{--accent:#245b55;margin-top:36px;background:#173d3a;color:#fff;border-radius:20px;padding:18px;display:grid;grid-template-columns:48px 1fr 24px;align-items:center;gap:14px}.preview-icon{width:46px;height:46px;border-radius:14px;background:color-mix(in srgb,var(--accent) 35%,white);display:grid;place-items:center}.preview-card p{color:#b8c9c3;font-size:.76rem;margin:3px 0}.creation-card{background:#fff;border:1px solid #dce3df;border-radius:24px;padding:28px;box-shadow:0 18px 50px rgba(23,61,58,.08)}.step-label{display:flex;align-items:center;gap:12px;margin:3px 0 18px}.step-label>span{width:30px;height:30px;border-radius:9px;background:#173d3a;color:#fff;display:grid;place-items:center;font:700 .75rem ui-monospace,monospace}.step-label p{font-size:.74rem;color:#687572;margin:2px 0}.template-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.template-choice{border:1px solid #dce3df;background:#fff;border-radius:15px;padding:13px;text-align:left;display:grid;grid-template-columns:36px 1fr;gap:2px 10px;cursor:pointer;color:#173d3a;transition:.2s}.template-choice:hover,.template-choice.active{border-color:#4f897e;background:#f5faf8}.template-choice>span{grid-row:1/3;width:36px;height:36px;border-radius:11px;display:grid;place-items:center}.template-choice small{color:#687572}.form-actions{display:flex;justify-content:flex-end;align-items:center;gap:10px;border-top:1px solid #edf1ef;margin-top:26px;padding-top:20px}@media(max-width:850px){.create-list-page{padding:20px 14px 78px}.create-layout{grid-template-columns:1fr;gap:24px}.create-intro{position:static}.template-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:480px){.creation-card{padding:20px 15px}.template-grid{grid-template-columns:1fr}.form-actions{align-items:stretch;flex-direction:column-reverse}.form-actions .v-btn{width:100%}}
</style>
