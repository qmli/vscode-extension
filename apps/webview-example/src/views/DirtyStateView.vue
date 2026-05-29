<template>
  <div class="dirty-demo">
    <!-- ===== 页头：模拟面板标题栏 ===== -->
    <div class="panel-titlebar">
      <span class="panel-title">示例面板</span>
      <el-tag :type="isDirty ? 'warning' : 'success'" size="small" effect="plain">
        {{ isDirty ? '有未保存更改' : '无更改' }}
      </el-tag>
      <el-tag v-if="justSaved" size="small" type="success" effect="plain">✓ 保存成功</el-tag>
      <el-tag v-if="extensionDirty !== null" size="small" type="info" effect="plain">
        Extension 确认 dirty: {{ extensionDirty }}
      </el-tag>
    </div>

    <!-- ===== 说明横幅 ===== -->
    <el-alert :closable="false" type="warning" show-icon>
      <template #title>CustomEditorProvider 原生 Dirty 状态流程</template>
      <div class="alert-body">
        <div class="flow-row">
          <el-tag size="small" type="primary">Webview</el-tag>
          数据变更
          <span class="arrow">→</span>
          <code>WebviewSetDirtyCommand</code>
          <span class="arrow">→</span>
          <el-tag size="small" type="success">Extension</el-tag>
          <code>onDidChangeCustomDocument.fire()</code>
          <span class="arrow">→</span>
          VS Code 标签页显示 <strong>●</strong>
        </div>
        <div class="flow-row">
          Ctrl+S 或关闭面板选 Save
          <span class="arrow">→</span>
          <code>saveCustomDocument()</code>
          <span class="arrow">→</span>
          <code>provider.saveDocument(token)</code>
          <span class="arrow">→</span>
          <el-tag size="small" type="success">成功</el-tag>
          推送 <code>DidSaveDocumentNotification</code>
          <span class="arrow">/</span>
          <el-tag size="small" type="danger">抛出异常</el-tag>
          面板不关闭
        </div>
        <div class="flow-row">
          <el-tag size="small" type="primary">Webview</el-tag>
          <code>requestSave()</code>
          <span class="arrow">→</span>
          <code>WebviewRequestSaveCommand</code>
          <span class="arrow">→</span>
          <el-tag size="small" type="success">Extension</el-tag>
          <code>workbench.action.files.save</code>
          (同上保存流程)
        </div>
      </div>
    </el-alert>

    <!-- ===== 场景一：表单变更 → markDirty ===== -->
    <el-card class="scene-card">
      <template #header>
        <span>场景一：表单变更触发 <code>markDirty()</code></span>
      </template>
      <el-form label-width="90px" size="small" class="demo-form">
        <el-form-item label="名称">
          <el-input v-model="form.name" placeholder="修改即标记 dirty" @input="markDirty" />
        </el-form-item>
        <el-form-item label="版本号">
          <el-input v-model="form.version" placeholder="如 1.0.0" @input="markDirty" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" @input="markDirty" />
        </el-form-item>
      </el-form>
      <el-space class="form-actions">
        <el-button type="primary" :disabled="!isDirty" @click="handleRequestSave"> 💾 保存（requestSave） </el-button>
      </el-space>
      <p class="hint">
        点击"保存"→ <code>requestSave()</code> → <code>WebviewRequestSaveCommand</code> → Extension 触发
        <code>workbench.action.files.save</code> → VS Code 调用 <code>provider.saveDocument(token)</code> → 成功后推送
        <code>DidSaveDocumentNotification</code>。
      </p>
    </el-card>

    <!-- ===== 场景二：手动 API 调用 ===== -->
    <el-card class="scene-card">
      <template #header>
        <span>场景二：手动调用 <code>markDirty()</code> / <code>requestSave()</code></span>
      </template>
      <el-space wrap>
        <el-button type="warning" @click="markDirty">markDirty()</el-button>
        <el-button @click="setDirty(!isDirty)">toggle dirty</el-button>
        <el-button type="primary" :disabled="!isDirty" @click="handleRequestSave"> requestSave() </el-button>
      </el-space>
      <el-descriptions :column="3" border size="small" class="mt-1">
        <el-descriptions-item label="isDirty (Webview)">
          <el-tag :type="isDirty ? 'warning' : 'success'">{{ isDirty }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="extensionDirty">
          <el-tag v-if="extensionDirty !== null" :type="extensionDirty ? 'warning' : 'success'">
            {{ extensionDirty }}
          </el-tag>
          <el-tag v-else type="info">未收到通知</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="justSaved (本地)">
          <el-tag :type="justSaved ? 'success' : 'info'">{{ justSaved }}</el-tag>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- ===== 场景三：监听 Save / DirtyState 通知 ===== -->
    <el-card class="scene-card">
      <template #header>
        <span
          >场景三：监听 <code>DidSaveDocumentNotification</code> / <code>DidChangeDirtyStateNotification</code></span
        >
      </template>
      <p class="hint">
        Extension 在相应操作完成后主动推送通知，<code>useDirtyState</code> 内部自动监听并更新状态、触发回调。
        以下模拟按钮仅在非 VS Code 环境（独立预览）下用于展示回调效果，<strong>不能替代真实 IPC 通知</strong>。
      </p>
      <el-descriptions :column="1" border size="small">
        <el-descriptions-item label="DidSaveDocumentNotification">
          <code>isDirty = false</code>，触发 <code>onSaved()</code>
        </el-descriptions-item>
        <el-descriptions-item label="DidChangeDirtyStateNotification">
          更新 <code>extensionDirty</code>，触发 <code>onChangeDirtyState(dirty)</code>
          <el-tag size="small" type="warning" effect="plain" style="margin-left: 6px">
            独立模式下 extensionDirty 不更新
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>
      <div class="simulate-row mt-1">
        <el-button size="small" type="success" @click="simulateReceiveSaved">
          模拟收到 DidSaveDocumentNotification
        </el-button>
      </div>
    </el-card>

    <!-- ===== IPC 通信日志 ===== -->
    <el-card class="scene-card">
      <template #header>
        <span>IPC 通信日志</span>
        <el-button size="small" plain style="float: right" @click="clearLogs">清空</el-button>
      </template>
      <el-scrollbar height="180px">
        <div v-for="(log, idx) in logs" :key="idx" class="log-line">
          <el-tag :type="log.direction === 'out' ? 'primary' : 'success'" size="small" effect="plain">
            {{ log.direction === 'out' ? '→ 发送' : '← 接收' }}
          </el-tag>
          <code class="log-method">{{ log.method }}</code>
          <el-tag v-if="log.label" size="small" :type="log.labelType ?? 'info'" effect="plain">
            {{ log.label }}
          </el-tag>
          <span class="log-time">{{ log.time }}</span>
        </div>
        <el-empty v-if="logs.length === 0" description="暂无 IPC 事件" :image-size="36" />
      </el-scrollbar>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import {
  DidChangeDirtyStateNotification,
  DidSaveDocumentNotification,
  WebviewRequestSaveCommand,
  WebviewSetDirtyCommand
} from '@orientais/webview-core';
import { useDirtyState } from '@orientais/webview-core';

// ─── Dirty State Composable ────────────────────────────────────────────────
// 回调提取为命名函数，simulateReceiveSaved 可复用，
// 确保模拟路径与真实 IPC 通知路径行为完全一致。
//
// justSaved：本地"刚保存"瞬态标志，替代已移除的 isSaved ref。
// 由 handleOnChange（变脏时重置）和 handleOnSaved（保存成功时置 true）维护。
const justSaved = ref(false);

const handleOnChange = (dirty: boolean) => {
  if (dirty) justSaved.value = false;
  addLog('out', WebviewSetDirtyCommand.method, `dirty=${dirty}`, dirty ? 'warning' : 'info');
};

const handleOnSaved = () => {
  justSaved.value = true;
  addLog('in', DidSaveDocumentNotification.method, 'success=true', 'success');
  ElMessage.success('收到 DidSaveDocumentNotification → 已保存');
};

const handleOnChangeDirtyState = (dirty: boolean) => {
  addLog('in', DidChangeDirtyStateNotification.method, `dirty=${dirty}`, dirty ? 'warning' : 'info');
  ElMessage({ type: dirty ? 'warning' : 'success', message: `Extension 确认 dirty: ${dirty}`, duration: 1500 });
};

const { isDirty, extensionDirty, markDirty, setDirty, requestSave } = useDirtyState({
  onChange: handleOnChange,
  onSaved: handleOnSaved,
  onChangeDirtyState: handleOnChangeDirtyState
});

// ─── 表单数据 ─────────────────────────────────────────────────────────────
const INITIAL_FORM = { name: 'MyProject', version: '1.0.0', description: '' };
const form = reactive({ ...INITIAL_FORM });

const handleRequestSave = () => {
  requestSave();
  addLog('out', WebviewRequestSaveCommand.method, '触发保存', 'primary');
  ElMessage.info('已发送 WebviewRequestSaveCommand，等待 Extension 响应...');
};

// ─── 场景三：模拟接收通知 ─────────────────────────────────────────────────
// 独立预览模式下仅演示回调的触发效果（日志 + Toast）。
// 注意：isDirty / extensionDirty 均为只读 ref，无真实 Extension 时不会被更新。
const simulateReceiveSaved = () => {
  handleOnSaved();
};

// ─── IPC 日志 ─────────────────────────────────────────────────────────────
type TagType = 'primary' | 'success' | 'warning' | 'danger' | 'info';
interface LogEntry {
  direction: 'in' | 'out';
  method: string;
  label?: string;
  labelType?: TagType;
  time: string;
}

const logs = reactive<LogEntry[]>([]);

const addLog = (direction: 'in' | 'out', method: string, label?: string, labelType?: TagType) => {
  logs.unshift({ direction, method, label, labelType, time: new Date().toLocaleTimeString() });
  if (logs.length > 50) logs.pop();
};

const clearLogs = () => logs.splice(0);
</script>

<style scoped>
.dirty-demo {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 920px;
}

/* ── 面板标题栏模拟 ── */
.panel-titlebar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  font-size: 13px;
  flex-wrap: wrap;
}

.panel-title {
  font-weight: 600;
  flex: 1;
  color: var(--el-text-color-primary);
}

/* ── 流程横幅 ── */
.alert-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  margin-top: 4px;
}

.flow-row {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
}

.arrow {
  color: var(--el-text-color-secondary);
  font-weight: bold;
}

/* ── 场景卡片 ── */
.scene-card {
  width: 100%;
}

.demo-form {
  max-width: 500px;
}

.form-actions {
  margin-top: 10px;
}

/* ── 场景三 ── */
.simulate-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* ── 日志 ── */
.log-line {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 4px;
  font-size: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.log-method {
  flex: 1;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.log-time {
  color: var(--el-text-color-placeholder);
  font-size: 11px;
  white-space: nowrap;
}

/* ── 辅助 ── */
.hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin: 6px 0 0;
  line-height: 1.6;
}

.mt-1 {
  margin-top: 8px;
}
</style>
