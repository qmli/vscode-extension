<!-- <template>
  <div class="vue3-app-example">
    <header class="app-header">
      <h1>{{ appName }} - Vue3 Webview Example</h1>
      <div class="status-bar">
        <span :class="['status', { connected: isConnected }]">
          {{ isConnected ? 'Connected' : 'Disconnected' }}
        </span>
        <span :class="['status', { focused: isFocused }]">
          {{ isFocused ? 'Focused' : 'Blurred' }}
        </span>
        <span :class="['status', { visible: isVisible }]">
          {{ isVisible ? 'Visible' : 'Hidden' }}
        </span>
      </div>
    </header>

    <main class="app-content">
      <section class="state-section">
        <h2>Application State</h2>
        <div class="state-display">
          <pre>{{ JSON.stringify(state, null, 2) }}</pre>
        </div>
        <button @click="updateState" :disabled="isExecuting">
          Update State
        </button>
      </section>

      <section class="theme-section">
        <h2>Theme Management</h2>
        <div class="theme-controls">
          <button @click="toggleTheme" :disabled="isExecuting">
            Toggle Theme ({{ theme }})
          </button>
          <span class="theme-indicator" :class="theme">
            Current: {{ theme }}
          </span>
        </div>
      </section>

      <section class="language-section">
        <h2>Language Management</h2>
        <div class="language-controls">
          <select v-model="selectedLanguage" @change="changeLanguage">
            <option value="en">English</option>
            <option value="zh-cn">中文</option>
          </select>
          <span class="language-indicator">
            Current: {{ language }}
          </span>
        </div>
      </section>

      <section class="commands-section">
        <h2>Command Execution</h2>
        <div class="command-controls">
          <button @click="executeTestCommand" :disabled="isExecuting">
            Execute Test Command
          </button>
          <button @click="executeTestRequest" :disabled="isExecuting">
            Execute Test Request
          </button>
          <div v-if="hasError" class="error-display">
            Error: {{ lastError?.message }}
          </div>
        </div>
      </section>

      <section class="performance-section">
        <h2>Performance Metrics</h2>
        <div class="metrics-display">
          <div class="metric">
            <label>Load Time:</label>
            <span>{{ performanceMetrics.loadTime }}ms</span>
          </div>
          <div class="metric">
            <label>Memory Usage:</label>
            <span>{{ formatBytes(performanceMetrics.memoryUsage) }}</span>
          </div>
          <div class="metric">
            <label>Last Update:</label>
            <span>{{ formatTime(performanceMetrics.lastUpdate) }}</span>
          </div>
        </div>
      </section>

      <section class="resources-section">
        <h2>Resource Management</h2>
        <div class="resource-controls">
          <input
            v-model="resourceUrl"
            placeholder="Enter resource URL"
            @keyup.enter="loadResource"
          />
          <button @click="loadResource" :disabled="isResourceLoading(resourceUrl)">
            Load Resource
          </button>
          <div class="resource-list">
            <div v-for="url in Array.from(resources)" :key="url" class="resource-item">
              <span>{{ url }}</span>
              <button @click="unloadResource(url)">Unload</button>
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer class="app-footer">
      <p>Vue3 Webview Application - Built with Composition API</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  useApp,
  useWebviewIPC,
  useWebviewState,
  useWebviewFocus,
  useWebviewVisibility,
  useWebviewTheme,
  useWebviewLanguage,
  useWebviewCommands,
  useWebviewPerformance,
  useWebviewResources,
  useWebviewLifecycle,
  useWebviewError
} from '../composables/useWebview';
import { useWebviewLifecycle as useLifecycle } from '../composables/useLifecycle';

// 应用基础信息
const appName = 'Vue3WebviewExample';

// 使用各种composables
const {
  state,
  focused,
  inputFocused,
  visible,
  isConnected,
  isFocused,
  isInputFocused,
  isVisible,
  sendCommand,
  sendRequest,
  setState,
  getState
} = useApp();

const { sendCommand: ipcSendCommand, sendRequest: ipcSendRequest } = useWebviewIPC();
const { saveState, syncState } = useWebviewState({ counter: 0, message: 'Hello Vue3!' });
const { theme, isDark, isLight, toggleTheme } = useWebviewTheme();
const { language, setLanguage } = useWebviewLanguage();
const { executing, lastError, executeCommand, executeRequest, isExecuting, hasError } = useWebviewCommands();
const { performanceMetrics } = useWebviewPerformance();
const {
  resources,
  loadingResources,
  failedResources,
  loadResource: loadResourceFunc,
  unloadResource,
  isResourceLoading,
  isResourceFailed
} = useWebviewResources();
const { isInitialized, isReady } = useWebviewLifecycle();
const { error, hasError: hasAppError, handleError } = useWebviewError();

// 本地状态
const selectedLanguage = ref('en');
const resourceUrl = ref('');

// 生命周期管理
const { initialize, dispose } = useLifecycle({
  onInitialize: async () => {
    console.log('Vue3 app initializing...');
  },
  onInitialized: async () => {
    console.log('Vue3 app initialized');
  },
  onReady: async () => {
    console.log('Vue3 app ready');
  },
  onDispose: async () => {
    console.log('Vue3 app disposing...');
  }
});

// 方法
const updateState = async () => {
  try {
    const newState = {
      counter: (state.value.counter || 0) + 1,
      message: `Updated at ${new Date().toLocaleTimeString()}`,
      timestamp: Date.now()
    };
    setState(newState);
    saveState(newState);
  } catch (err) {
    handleError(err);
  }
};

const changeLanguage = () => {
  setLanguage(selectedLanguage.value);
};

const executeTestCommand = async () => {
  try {
    await executeCommand(
      { method: 'test/command' } as any,
      { message: 'Test command from Vue3' }
    );
  } catch (err) {
    handleError(err);
  }
};

const executeTestRequest = async () => {
  try {
    const result = await executeRequest(
      { method: 'test/request' } as any,
      { message: 'Test request from Vue3' }
    );
    console.log('Request result:', result);
  } catch (err) {
    handleError(err);
  }
};

const loadResource = async () => {
  if (!resourceUrl.value) return;

  try {
    await loadResourceFunc(resourceUrl.value);
    resourceUrl.value = '';
  } catch (err) {
    handleError(err);
  }
};

// 工具函数
const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString();
};

// 组件挂载
onMounted(() => {
  console.log('Vue3 app example mounted');
  selectedLanguage.value = language.value;
});
</script>

<style scoped>
.vue3-app-example {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e0e0e0;
}

.app-header h1 {
  margin: 0;
  color: #333;
}

.status-bar {
  display: flex;
  gap: 10px;
}

.status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  background: #f0f0f0;
  color: #666;
}

.status.connected {
  background: #d4edda;
  color: #155724;
}

.status.focused {
  background: #cce5ff;
  color: #004085;
}

.status.visible {
  background: #fff3cd;
  color: #856404;
}

.app-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

section {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

section h2 {
  margin: 0 0 15px 0;
  color: #495057;
  font-size: 18px;
}

.state-display {
  background: #fff;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 10px;
  margin-bottom: 10px;
  max-height: 200px;
  overflow-y: auto;
}

.state-display pre {
  margin: 0;
  font-size: 12px;
  color: #495057;
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

button:hover:not(:disabled) {
  background: #0056b3;
}

button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.theme-controls,
.language-controls,
.command-controls,
.resource-controls {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.theme-indicator,
.language-indicator {
  padding: 4px 8px;
  background: #e9ecef;
  border-radius: 4px;
  font-size: 12px;
}

select {
  padding: 6px 10px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  background: white;
}

input {
  padding: 6px 10px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  flex: 1;
  min-width: 200px;
}

.error-display {
  background: #f8d7da;
  color: #721c24;
  padding: 10px;
  border-radius: 4px;
  margin-top: 10px;
  font-size: 14px;
}

.metrics-display {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}

.metric {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric label {
  font-weight: 500;
  color: #495057;
  font-size: 12px;
}

.metric span {
  font-size: 14px;
  color: #6c757d;
}

.resource-list {
  margin-top: 10px;
  max-height: 150px;
  overflow-y: auto;
}

.resource-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  margin-bottom: 5px;
}

.resource-item span {
  font-size: 12px;
  color: #495057;
  flex: 1;
  margin-right: 10px;
  word-break: break-all;
}

.resource-item button {
  padding: 4px 8px;
  font-size: 12px;
  background: #dc3545;
}

.resource-item button:hover {
  background: #c82333;
}

.app-footer {
  text-align: center;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
  color: #6c757d;
  font-size: 14px;
}

/* 主题样式 */
.theme-dark {
  background: #1a1a1a;
  color: #ffffff;
}

.theme-dark section {
  background: #2d2d2d;
  border-color: #404040;
}

.theme-dark .state-display {
  background: #1a1a1a;
  border-color: #404040;
}

.theme-dark input,
.theme-dark select {
  background: #2d2d2d;
  border-color: #404040;
  color: #ffffff;
}

.theme-dark .status {
  background: #404040;
  color: #ffffff;
}
</style> -->
