<template>
  <div class="history-demo">
    <h1>History 撤销 / 重做示例</h1>

    <!-- 全局撤销/重做工具栏 -->
    <el-card class="toolbar-card">
      <template #header>
        <span>全局操作栏（共享实例 · Ctrl+Z / Ctrl+Y）</span>
      </template>
      <el-space wrap>
        <el-button :disabled="!canUndo" @click="undo">
          ↩ 撤销 <el-tag v-if="state.undoName" size="small" type="info">{{ state.undoName }}</el-tag>
        </el-button>
        <el-button :disabled="!canRedo" @click="redo">
          ↪ 重做 <el-tag v-if="state.redoName" size="small" type="info">{{ state.redoName }}</el-tag>
        </el-button>
        <el-button type="danger" plain @click="clearHistory">清空历史</el-button>
        <el-tag type="info">撤销步数: {{ state.undoCount }}</el-tag>
        <el-tag type="success">重做步数: {{ state.redoCount }}</el-tag>
      </el-space>
    </el-card>

    <!-- 场景一：表单字段追踪 -->
    <el-card class="scene-card">
      <template #header>
        <span>场景一：表单字段撤销（trackInput）</span>
      </template>
      <el-form label-width="120px" size="small">
        <el-form-item label="姓名">
          <el-input
            v-model="form.name"
            placeholder="输入后修改触发记录"
            @focus="nameHandlers.onFocus"
            @change="nameHandlers.onChange"
          />
        </el-form-item>
        <el-form-item label="年龄">
          <el-input-number
            v-model="form.age"
            :min="0"
            :max="150"
            @focus="ageHandlers.onFocus"
            @change="ageHandlers.onChange"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="form.remark"
            placeholder="备注"
            @focus="remarkHandlers.onFocus"
            @change="remarkHandlers.onChange"
          />
        </el-form-item>
      </el-form>
      <el-descriptions :column="3" border size="small">
        <el-descriptions-item label="name">{{ form.name }}</el-descriptions-item>
        <el-descriptions-item label="age">{{ form.age }}</el-descriptions-item>
        <el-descriptions-item label="remark">{{ form.remark }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 场景二：手动 record() -->
    <el-card class="scene-card">
      <template #header>
        <span>场景二：手动 record(new SetValueCommand(...))</span>
      </template>
      <el-space wrap>
        <el-input v-model="manualName" placeholder="输入新姓名" style="width: 160px" />
        <el-button type="primary" @click="manualSet">直接执行命令</el-button>
      </el-space>
      <p class="hint">当前姓名：{{ form.name }}</p>
    </el-card>

    <!-- 场景三：批量原子操作 -->
    <el-card class="scene-card">
      <template #header>
        <span>场景三：批量原子操作（SetValuesCommand / BatchCommand）</span>
      </template>
      <el-space wrap>
        <el-button @click="resetFormA">方式A: SetValuesCommand 重置表单</el-button>
        <el-button @click="resetFormB">方式B: BatchCommand 组合命令</el-button>
      </el-space>
      <el-descriptions :column="3" border size="small" class="mt-1">
        <el-descriptions-item label="name">{{ form.name }}</el-descriptions-item>
        <el-descriptions-item label="age">{{ form.age }}</el-descriptions-item>
        <el-descriptions-item label="remark">{{ form.remark }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 场景四：列表增删排序 -->
    <el-card class="scene-card">
      <template #header>
        <span>场景四：列表增删排序（AddItemCommand / RemoveItemCommand / MoveItemCommand）</span>
      </template>
      <el-space wrap class="mb-1">
        <el-button type="primary" @click="addItem">追加元素</el-button>
        <el-button @click="insertItem">在索引 1 处插入</el-button>
        <el-button type="danger" :disabled="tagList.length === 0" @click="removeItem"> 删除索引 0 </el-button>
        <el-button :disabled="tagList.length < 2" @click="moveItem"> 末尾 → 首位 </el-button>
      </el-space>
      <el-space wrap>
        <el-tag v-for="(item, idx) in tagList" :key="idx" type="primary" effect="plain">
          [{{ idx }}] {{ item }}
        </el-tag>
        <el-empty v-if="tagList.length === 0" description="列表为空" :image-size="40" />
      </el-space>
    </el-card>

    <!-- 场景五：自定义命令 -->
    <el-card class="scene-card">
      <template #header>
        <span>场景五：自定义命令（ToggleVisibleCommand）</span>
      </template>
      <el-space wrap>
        <el-button @click="toggleVisible">切换可见性</el-button>
        <el-tag :type="node.visible ? 'success' : 'danger'"> visible: {{ node.visible }} </el-tag>
      </el-space>
    </el-card>

    <!-- 场景六：Pinia Store -->
    <el-card class="scene-card">
      <template #header>
        <span>场景六：Pinia Store（useHistoryStore）</span>
      </template>
      <el-space wrap class="mb-1">
        <el-button type="primary" @click="storeSetValue">setValue</el-button>
        <el-button @click="storeBatch">batch 批量操作</el-button>
        <el-button :disabled="!hs.canUndo" @click="hs.undo()">Store 撤销</el-button>
        <el-button :disabled="!hs.canRedo" @click="hs.redo()">Store 重做</el-button>
      </el-space>
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="storeForm.title">{{ storeForm.title }}</el-descriptions-item>
        <el-descriptions-item label="storeForm.count">{{ storeForm.count }}</el-descriptions-item>
        <el-descriptions-item label="canUndo">{{ hs.canUndo }}</el-descriptions-item>
        <el-descriptions-item label="undoName">{{ hs.undoName }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 场景七：键盘快捷键说明 -->
    <el-card class="scene-card">
      <template #header>
        <span>场景七：键盘快捷键（自动绑定）</span>
      </template>
      <el-descriptions :column="3" border size="small">
        <el-descriptions-item label="Ctrl/Cmd + Z">撤销</el-descriptions-item>
        <el-descriptions-item label="Ctrl/Cmd + Y">重做</el-descriptions-item>
        <el-descriptions-item label="Ctrl/Cmd + Shift + Z">重做</el-descriptions-item>
      </el-descriptions>
      <p class="hint">当前组件使用 <code>useHistory({ shared: true })</code>，快捷键已自动绑定。</p>
    </el-card>

    <!-- 场景八：事件监听日志 -->
    <el-card class="scene-card">
      <template #header>
        <span>场景八：事件监听日志</span>
      </template>
      <el-scrollbar height="140px">
        <div v-for="(log, idx) in eventLogs" :key="idx" class="log-line">
          <el-tag size="small" :type="logTagType(log.type)" effect="plain">{{ log.type }}</el-tag>
          <span class="log-name">{{ log.name }}</span>
          <span class="log-time">{{ log.time }}</span>
        </div>
        <el-empty v-if="eventLogs.length === 0" description="暂无事件" :image-size="40" />
      </el-scrollbar>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onUnmounted } from 'vue';
import {
  useHistory,
  useHistoryStore,
  Command,
  SetValueCommand,
  SetValuesCommand,
  AddItemCommand,
  RemoveItemCommand,
  MoveItemCommand,
  BatchCommand
} from '@orientais/webview-core';
import type { HistoryEventType } from '@orientais/webview-core';

// ─── 共享历史实例（场景一至五、七、八） ───────────────────────────────
const { state, canUndo, canRedo, undo, redo, record, trackInput, history } = useHistory({
  shared: true,
  keyboardShortcuts: true
});

// ─── 场景一：表单 trackInput ─────────────────────────────────────────
const form = reactive({ name: 'Alice', age: 18, remark: '' });

const nameHandlers = trackInput(form, 'name', '修改姓名');
const ageHandlers = trackInput(form, 'age', '修改年龄');
const remarkHandlers = trackInput(form, 'remark', '修改备注');

// ─── 场景二：手动 record ──────────────────────────────────────────────
const manualName = ref('');
const manualSet = () => {
  if (!manualName.value) return;
  record(new SetValueCommand(form, 'name', manualName.value, '手动设置姓名'));
  manualName.value = '';
};

// ─── 场景三：批量操作 ─────────────────────────────────────────────────
const resetFormA = () => {
  record(new SetValuesCommand(form, { name: 'Alice', age: 18, remark: '' }, '方式A重置表单'));
};

const resetFormB = () => {
  record(
    new BatchCommand('方式B批量重置')
      .add(new SetValueCommand(form, 'name', 'Bob'))
      .add(new SetValueCommand(form, 'age', 20))
      .add(new SetValueCommand(form, 'remark', 'BatchCommand示例'))
  );
};

// ─── 场景四：列表增删排序 ─────────────────────────────────────────────
const tagList = reactive<string[]>(['vue3', 'pinia', 'ts']);
let addCounter = 0;

const addItem = () => {
  addCounter++;
  record(new AddItemCommand(tagList, `item-${addCounter}`, '追加元素'));
};

const insertItem = () => {
  addCounter++;
  record(new AddItemCommand(tagList, `insert-${addCounter}`, '插入元素', 1));
};

const removeItem = () => {
  record(new RemoveItemCommand(tagList, 0, '删除首项'));
};

const moveItem = () => {
  record(new MoveItemCommand(tagList, tagList.length - 1, 0, '末尾移到首位'));
};

// ─── 场景五：自定义命令 ───────────────────────────────────────────────
class ToggleVisibleCommand extends Command {
  override type = 'ToggleVisibleCommand';
  override updatable = false;

  constructor(private readonly target: { visible: boolean }) {
    super();
    this.name = '切换可见性';
  }

  execute(): void {
    this.target.visible = !this.target.visible;
  }
  undo(): void {
    this.target.visible = !this.target.visible;
  }
}

const node = reactive({ visible: true });
const toggleVisible = () => {
  record(new ToggleVisibleCommand(node));
};

// ─── 场景六：Pinia Store ─────────────────────────────────────────────
const hs = useHistoryStore();
hs.init({ maxHistorySize: 50, mergeWindow: 500 });

const storeForm = reactive({ title: 'Hello', count: 0 });

const storeSetValue = () => {
  storeForm.count++;
  hs.setValue(storeForm, 'title', `Title-${storeForm.count}`, '更新标题');
};

const storeBatch = () => {
  hs.batch('批量重置Store表单', (b) => {
    b.add(new SetValueCommand(storeForm, 'title', 'Reset'));
    b.add(new SetValueCommand(storeForm, 'count', 0));
  });
};

// ─── 清空历史 ─────────────────────────────────────────────────────────
const clearHistory = () => {
  history.clear();
};

// ─── 场景八：事件监听 ─────────────────────────────────────────────────
interface LogEntry {
  type: HistoryEventType;
  name: string;
  time: string;
}

const eventLogs = reactive<LogEntry[]>([]);

const unsubscribe = history.on((event) => {
  const now = new Date().toLocaleTimeString();
  eventLogs.unshift({
    type: event.type,
    name: event.command?.name ?? '—',
    time: now
  });
  if (eventLogs.length > 30) eventLogs.pop();
});

onUnmounted(unsubscribe);

const logTagType = (type: HistoryEventType) => {
  const map: Record<HistoryEventType, string> = {
    execute: 'primary',
    undo: 'warning',
    redo: 'success',
    clear: 'danger',
    error: 'danger'
  };
  return map[type] ?? 'info';
};
</script>

<style scoped>
.history-demo {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 860px;
}

.toolbar-card {
  position: sticky;
  top: 0;
  z-index: 10;
}

.scene-card {
  width: 100%;
}

.hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin: 6px 0 0;
}

.mt-1 {
  margin-top: 8px;
}

.mb-1 {
  margin-bottom: 8px;
}

.log-line {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 4px;
  font-size: 12px;
}

.log-name {
  flex: 1;
  color: var(--el-text-color-primary);
}

.log-time {
  color: var(--el-text-color-secondary);
  font-size: 11px;
}
</style>
