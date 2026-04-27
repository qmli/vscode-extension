/**
 * 历史记录项 这个来源 是 orientais-studio-common/src/entity/HistoryInfo.ts 中的 IHistoryInfo
 * @property id - 唯一标识
 * @property from - 来源
 * @property type - 类型
 * @property handle - 处理函数
 * @property detail - 详细信息
 */
export interface HistoryItem {
  id?: string;
  from: string;
  type: string;
  handle: () => void; //这个要优化
  detail: unknown; // 这个后面要确定类型
}
