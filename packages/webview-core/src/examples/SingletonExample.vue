<!-- <template>
  <div class="singleton-example">
    <h1>Vue3 Webview 单例模式示例</h1>

    <div class="status-section">
      <h2>应用状态</h2>
      <p>连接状态: {{ isConnected ? '已连接' : '未连接' }}</p>
      <p>焦点状态: {{ isFocused ? '已聚焦' : '未聚焦' }}</p>
      <p>可见状态: {{ isVisible ? '可见' : '隐藏' }}</p>
    </div>

    <div class="state-section">
      <h2>应用状态</h2>
      <p>计数器: {{ state.counter || 0 }}</p>
      <button @click="incrementCounter">
        增加计数
      </button>
    </div>

    <div class="ipc-section">
      <h2>IPC 通信</h2>
      <button @click="sendTestCommand">
        发送测试命令
      </button>
      <button @click="sendTestRequest">
        发送测试请求
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { createVue3App } from '../app/vue3App';
import { useApp, useWebviewIPC } from '../composables/useWebview';

// 在组件外初始化应用（单例模式）
const app = createVue3App({
  appName: 'singleton-example',
  initialState: { counter: 0 },
  onInitialize: async () => {
    console.log('应用初始化中...');
  },
  onInitialized: async () => {
    console.log('应用初始化完成');
  }
});

// 使用应用功能（无需Provider包装）
const { state, isConnected, isFocused, isVisible, setState } = useApp();
const { sendCommand, sendRequest } = useWebviewIPC();

// 增加计数器
const incrementCounter = () => {
  const newCounter = (state.value.counter || 0) + 1;
  setState({ counter: newCounter });
};

// 发送测试命令
const sendTestCommand = () => {
  sendCommand({ method: 'test/command' } as any, { message: 'Hello from singleton mode!' });
};

// 发送测试请求
const sendTestRequest = async () => {
  try {
    const result = await sendRequest({ method: 'test/request' } as any, { data: 'test data' });
    console.log('请求结果:', result);
  } catch (error) {
    console.error('请求失败:', error);
  }
};

onMounted(() => {
  console.log('组件已挂载，应用状态:', state.value);
});
</script>

<style scoped>
.singleton-example {
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.status-section,
.state-section,
.ipc-section {
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
  margin-right: 10px;
  transition: background-color 0.2s;
}

button:hover {
  background: #0056b3;
}
</style> -->
