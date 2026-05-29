<template>
  <div class="about">
    <h1>批量文件传输</h1>
    <div class="actions">
      <el-button type="warning">Warning</el-button>
      <el-button type="primary" :loading="state.loading" :disabled="state.loading" @click="transferFiles">
        开始传输
      </el-button>
      <el-button v-if="state.canCancel" type="danger" :disabled="!state.loading" @click="cancelTransfer">
        取消
      </el-button>
    </div>
    <div v-if="state.loading || state.finished" class="progress-wrapper">
      <div class="progress-header">
        <span>进度: {{ state.progress }}%</span>
        <span>{{ state.processedItems }}/{{ state.totalItems }}</span>
      </div>
      <el-progress :percentage="state.progress" :status="progressStatus" :stroke-width="14" />
    </div>
    <div v-if="state.finished" class="result mt-2">
      <el-result
        :icon="state.success ? 'success' : 'warning'"
        :title="state.success ? '传输完成' : '部分失败'"
        :sub-title="resultSubtitle"
      >
        <template #extra>
          <el-tag v-if="state.successCount" type="success"> 成功: {{ state.successCount }} </el-tag>
          <el-tag v-if="state.failureCount" type="danger" class="ml-1"> 失败: {{ state.failureCount }} </el-tag>
        </template>
      </el-result>
      <el-collapse v-if="state.errors.length" class="mt-1">
        <el-collapse-item name="errors">
          <template #title>
            <span class="error-title">错误详情 ({{ state.errors.length }})</span>
          </template>
          <el-alert
            v-for="(err, idx) in state.errors"
            :key="idx"
            :title="err || String(err)"
            type="error"
            :closable="false"
            class="mb-1"
          />
        </el-collapse-item>
      </el-collapse>
    </div>
    <h1>创建简单选择步骤</h1>
    <div>
      <el-button type="primary" @click="quickSelectProject"> 选择项目步骤 </el-button>
    </div>
    <h1>动态表单</h1>
    <DynamicForm ref="formRef" v-model="formData" :config="formConfig" />
    <div class="form-footer">
      <el-button type="primary" @click="handleSave">保存</el-button>
      <el-button @click="handleCancel">取消</el-button>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { reactive, computed, onUnmounted, ref, watch } from 'vue';
import { BatchTransferManager } from '@/services/batchFileService';
import type {
  BatchTransferCompletedParams,
  BatchTransferProgressParams,
  BatchTransferResponse
} from '@shared/example.protocol';
import { ElMessage } from 'element-plus';
import { useWebviewIPC } from '@orientais/webview-core';
import { ExampleQuickPickSelectCommand } from '@shared/example.protocol';
import { DynamicForm } from '@orientais/webview-core';
import type { DynamicFormConfig } from '@orientais/webview-core';

// 取消功能（假设未来 BatchTransferManager 支持 abort）
let abortController: AbortController | undefined;

const _batchManager = new BatchTransferManager();

interface UIState {
  loading: boolean;
  finished: boolean;
  progress: number;
  processedItems: number;
  totalItems: number;
  success: boolean;
  successCount: number;
  failureCount: number;
  errors: string[];
  rawResult?: BatchTransferCompletedParams;
  canCancel: boolean;
}

const state = reactive<UIState>({
  loading: false,
  finished: false,
  progress: 0,
  processedItems: 0,
  totalItems: 0,
  success: false,
  successCount: 0,
  failureCount: 0,
  errors: [],
  rawResult: undefined,
  canCancel: false
});

_batchManager.onProgress((p: BatchTransferProgressParams) => {
  state.progress = p.progress;
  state.processedItems = p.processedItems;
  state.totalItems = p.totalItems;
});

_batchManager.onCompleted((result: BatchTransferCompletedParams) => {
  state.loading = false;
  state.finished = true;
  state.rawResult = result;
  state.success = result.success;
  const response: BatchTransferResponse = result.results;
  state.successCount = response.successCount;
  state.failureCount = response.failureCount;
  state.totalItems = response.totalItems;
  // 协议中 errors?: string[]
  state.errors = response.errors ?? [];
  if (result.success) {
    ElMessage.success('传输成功：' + String(state.successCount) + '/' + String(state.totalItems));
  } else if (state.failureCount) {
    ElMessage.warning('传输完成，失败 ' + String(state.failureCount) + ' 项');
  }
});

const items = [
  BatchTransferManager.createItem('item1', 'File', {
    setting: 'value1',
    enabled: true
  }),
  BatchTransferManager.createItem('item2', 'File', {
    name: 'feature/new-feature',
    upstream: 'origin/main'
  })
  // 更多项...
];

const transferFiles = async () => {
  try {
    state.loading = true;
    state.finished = false;
    state.progress = 0;
    state.processedItems = 0;
    state.totalItems = items.length;
    state.success = false;
    state.successCount = 0;
    state.failureCount = 0;
    state.errors = [];
    abortController = new AbortController();
    state.canCancel = !!abortController;
    // 传递 signal 如 API 支持（假设 future）
    await _batchManager.transfer(items, {
      continueOnError: true,
      validateOnly: false
      // signal: abortController.signal
    });
  } catch (error) {
    state.loading = false;
    state.finished = true;
    state.success = false;
    state.errors.push(error instanceof Error ? error.message : String(error));
    ElMessage.error('批量传输失败');
  }
};

const cancelTransfer = () => {
  if (!abortController) return;
  abortController.abort();
  ElMessage.info('已请求取消传输');
};

const progressStatus = computed(() => {
  if (state.loading) return undefined; // 默认样式
  if (state.finished && state.success) return 'success';
  if (state.finished && !state.success) return 'exception';
  return undefined;
});

const resultSubtitle = computed(() => {
  if (!state.finished) return '';
  if (state.success && state.failureCount === 0)
    return '全部成功 (' + String(state.successCount) + '/' + String(state.totalItems) + ')';
  return (
    '成功 ' + String(state.successCount) + '，失败 ' + String(state.failureCount) + ' / ' + String(state.totalItems)
  );
});
const { sendCommand } = useWebviewIPC();
const quickSelectProject = () => {
  sendCommand(ExampleQuickPickSelectCommand, undefined);
};

//-----------------------------------------动态表单----------------------------------------
interface Props {
  selectedNode?: unknown; // 从 A 或 B 区域传来的选中节点
}

const props = defineProps<Props>();
const formRef = ref();

const formConfig: DynamicFormConfig = {
  labelWidth: '150px',
  size: 'small',
  columns: 2,
  fields: [
    {
      key: 'physicalNodeCount',
      label: '物理节点数',
      type: 'number',
      required: true
    },
    {
      key: 'portId',
      label: '端口选择',
      type: 'select-table',
      required: true,
      placeholder: '请选择端口',
      options: [
        { id: '1', ObjectType: 'Port', ShortName: 'Port_A', Description: '端口A' },
        { id: '2', ObjectType: 'Port', ShortName: 'Port_B', Description: '端口B' },
        { id: '3', ObjectType: 'Channel', ShortName: 'Channel_1', Description: '通道1' },
        { id: '4', ObjectType: 'Channel', ShortName: 'Channel_2', Description: '通道2' }
      ],
      selectTableConfig: {
        columns: [
          { key: 'ObjectType', title: 'ObjectType', width: 150 },
          { key: 'ShortName', title: 'ShortName', width: 150 },
          { key: 'Description', title: 'Description', width: 200 }
        ],
        valueKey: 'id',
        labelKey: 'ShortName',
        searchKeys: ['ObjectType', 'ShortName', 'Description'],
        pageSize: 10
      }
    },
    {
      key: 'secondPort',
      label: 'secondPort',
      type: 'text'
    },
    {
      key: 'transmitOpportunityTimer',
      label: 'transmitOpportunityTimer',
      type: 'text'
    },
    {
      key: 'couplingPorts',
      label: 'CouplingPortRef',
      type: 'table',
      canAddChild: true,
      tableColumns: [
        { key: 'name', title: '名称', width: 200 },
        { key: 'ref', title: '引用', width: 200 },
        { key: 'type', title: '类型', width: 150 }
      ],
      childTemplate: {
        name: '',
        ref: '',
        type: 'CouplingPortConnection'
      }
    }
  ]
};

const formData = ref({});

// 监听选中节点变化，更新表单数据
watch(
  () => props.selectedNode,
  (node) => {
    if (node) {
      formData.value = { ...node };
    }
  },
  { immediate: true }
);

const handleSave = async () => {
  const valid = await formRef.value?.validate();
  if (valid) {
    // 保存数据逻辑
    console.log('保存数据:', formData.value);
  }
};

const handleCancel = () => {
  formRef.value?.resetFields();
};
onUnmounted(() => {
  _batchManager.dispose();
});
</script>
<style>
@media (min-width: 1024px) {
  .about {
    min-height: 100vh;
    display: flex;
    align-items: center;
  }
}
.about {
  flex-direction: column;
}
.actions {
  margin-bottom: 12px;
  display: flex;
  gap: 8px;
}
.progress-wrapper {
  width: 360px;
}
.progress-header {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  margin-bottom: 4px;
}
.result {
  width: 420px;
}
.error-title {
  color: var(--vscode-errorForeground, #f56c6c);
}
.mt-1 {
  margin-top: 8px;
}
.mt-2 {
  margin-top: 16px;
}
.ml-1 {
  margin-left: 8px;
}
.mb-1 {
  margin-bottom: 8px;
}

.region-c {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.form-header {
  margin-bottom: 16px;
}

.form-footer {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
