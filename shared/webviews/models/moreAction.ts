/**
 * MoreAction 数据结构 来源文件IMoreAction.ts IMoreAction
 */
export interface MoreAction {
  // 是否可以粘贴
  hasPaste: boolean;
  // 是否可以克隆
  hasClone: boolean;
  // 是否可以删除
  hasDelete: boolean;
  // 是否可以复制
  hasCopy: boolean;
  // 是否可以更多
  hasMore: boolean;
}
