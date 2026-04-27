<template>
  <div class="simple-vue3-app">
    <h1>Simple Vue3 Webview</h1>

    <div class="status-section">
      <h2>Status</h2>
      <p>Connected: {{ isConnected ? 'Yes' : 'No' }}</p>
      <p>Focused: {{ isFocused ? 'Yes' : 'No' }}</p>
      <p>Visible: {{ isVisible ? 'Yes' : 'No' }}</p>
    </div>

    <div class="state-section">
      <h2>State</h2>
      <p>Counter: {{ state.counter || 0 }}</p>
      <button @click="incrementCounter">Increment</button>
    </div>

    <div class="theme-section">
      <h2>Theme</h2>
      <p>Current: {{ theme }}</p>
      <button @click="toggleTheme">Toggle Theme</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useApp } from '../app/vue3App';
import { useWebviewTheme, useWebviewState } from '../composables/useWebview';

// 使用基础应用功能
const { isConnected, isFocused, isVisible, state, setState } = useApp();

// 使用主题管理
const { theme, toggleTheme } = useWebviewTheme();

// 使用状态管理
const { saveState } = useWebviewState({ counter: 0 });

// 增加计数器
const incrementCounter = () => {
  const newCounter = (state.value.counter || 0) + 1;

  const newState = { counter: newCounter };
  setState(newState);
  saveState(newState);
};
</script>

<style scoped>
.simple-vue3-app {
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.status-section,
.state-section,
.theme-section {
  margin-bottom: 20px;
  padding: 15px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #f9f9f9;
}

h1 {
  color: #333;
  margin-bottom: 30px;
}

h2 {
  color: #555;
  margin-bottom: 10px;
  font-size: 18px;
}

p {
  margin: 8px 0;
  color: #666;
}

button {
  background: #007bff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

button:hover {
  background: #0056b3;
}

/* 主题样式 */
.theme-dark .simple-vue3-app {
  background: #1a1a1a;
  color: #ffffff;
}

.theme-dark .status-section,
.theme-dark .state-section,
.theme-dark .theme-section {
  background: #2d2d2d;
  border-color: #404040;
}

.theme-dark h1,
.theme-dark h2 {
  color: #ffffff;
}

.theme-dark p {
  color: #cccccc;
}
</style>
