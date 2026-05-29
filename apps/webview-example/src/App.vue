<template>
  <div id="app" class="webview-settings" data-vscode-context='{"preventDefaultContextMenuItems": true}'>
    <nav class="app-nav">
      <RouterLink to="/">首页示例</RouterLink>
      <RouterLink to="/history">History 示例</RouterLink>
    </nav>
    <main class="main-content">
      <Vue3AppProvider ref="appProvider" app-name="autosar.editor" @message-received="handleMessageReceived">
        <RouterView />
      </Vue3AppProvider>
    </main>
  </div>
</template>

<script setup lang="ts">
import { Vue3AppProvider } from '@orientais/webview-core';
import { IpcMessage } from '@orientais/shared';

const handleMessageReceived = (msg: IpcMessage) => {
  console.log('msg', msg);
};
</script>

<style scoped>
.webview-settings {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--color-background);
  color: var(--color-text);
}

.app-nav {
  display: flex;
  gap: 12px;
  padding: 6px 16px;
  border-bottom: 1px solid var(--el-border-color);
  font-size: 13px;
}

.app-nav a {
  color: var(--el-text-color-regular);
  text-decoration: none;
}

.app-nav a.router-link-active {
  color: var(--el-color-primary);
  font-weight: 600;
}
</style>
