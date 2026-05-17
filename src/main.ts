import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { initAntiDebug } from './anti-debug'

initAntiDebug()

createApp(App).mount('#app')
