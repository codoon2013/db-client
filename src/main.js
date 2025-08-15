import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import App from './App.vue';

// 全局处理ResizeObserver错误
const resizeObserverErr = 'ResizeObserver loop limit exceeded';
const resizeObserverErrRegex = new RegExp(resizeObserverErr, 'i');
const isResizeObserverErr = (entry) => {
  const { message } = entry;
  return (
    message === resizeObserverErr ||
    resizeObserverErrRegex.test(message)
  );
};

const errorHandler = (err, vm, info) => {
  if (isResizeObserverErr(err)) {
    // 忽略ResizeObserver错误，避免控制台警告
    return;
  }
  console.error('Error:', err, 'Info:', info);
};

// 捕获全局Promise拒绝
window.addEventListener('unhandledrejection', event => {
  if (isResizeObserverErr(event.reason)) {
    event.preventDefault();
  }
});


// 捕获全局错误
window.addEventListener('error', event => {
  if (isResizeObserverErr(event.error)) {
    event.preventDefault();
  }
});

const app = createApp(App);

// 注册 Element Plus
app.use(ElementPlus);

app.config.errorHandler = errorHandler;


// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

app.mount('#app'); 