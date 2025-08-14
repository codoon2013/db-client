import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import App from './App.vue';

// 忽略 ResizeObserver loop limit exceeded 错误
const resizeObserverErr = window.console.error
window.console.error = (...args) => {
  if (args[0].includes && args[0].includes('ResizeObserver loop limit exceeded')) {
    return
  }
  resizeObserverErr(...args)
}

const app = createApp(App);

// 注册 Element Plus
app.use(ElementPlus);

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

app.mount('#app'); 