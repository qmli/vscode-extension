/**
 * 菜单设置 原ISetting.ts
 */
export interface MenuSetting {
  id?: string | Set<string>; // 菜单ID
  code?: string; // 菜单编码
  name?: string; // 菜单名称
  isTab?: boolean; // 是否为标签页
  isShow?: boolean; // 是否显示
  icon?: string; // 菜单图标
  component?: string; // 菜单组件
  parentId?: string; // 父菜单ID
}
