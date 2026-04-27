// 图标注册中心

import type { IconConfig } from './types';
import { iconSvgs } from './index';

class IconRegistry {
  private icons: Map<string, IconConfig> = new Map();

  constructor() {
    this.registerDefaultIcons();
  }

  /**
   * 注册默认图标
   */
  private registerDefaultIcons() {
    Object.entries(iconSvgs).forEach(([name, svg]) => {
      this.register({
        name: name,
        svg: svg,
        category: this.getIconCategory(name)
      });
    });
  }

  /**
   * 注册新图标
   */
  register(config: IconConfig): void {
    this.icons.set(config.name, config);
  }

  /**
   * 批量注册图标
   */
  registerBatch(configs: IconConfig[]): void {
    configs.forEach((config) => this.register(config));
  }

  /**
   * 获取图标
   */
  get(name: string): IconConfig | undefined {
    return this.icons.get(name);
  }

  /**
   * 获取图标SVG
   */
  getSvg(name: string): string | undefined {
    const icon = this.get(name);
    return icon?.svg;
  }

  /**
   * 检查图标是否存在
   */
  has(name: string): boolean {
    return this.icons.has(name);
  }

  /**
   * 获取所有图标名称
   */
  getNames(): string[] {
    return Array.from(this.icons.keys());
  }

  /**
   * 按分类获取图标
   */
  getByCategory(category: string): IconConfig[] {
    return Array.from(this.icons.values()).filter((icon) => icon.category === category);
  }

  /**
   * 搜索图标
   */
  search(query: string): IconConfig[] {
    const lowerQuery = query.toLowerCase();

    return Array.from(this.icons.values()).filter((icon) => {
      const nameMatch = icon.name.toLowerCase().includes(lowerQuery);
      const keywordMatch = icon.keywords?.some((keyword) => keyword.toLowerCase().includes(lowerQuery));

      return nameMatch || keywordMatch;
    });
  }

  /**
   * 获取图标分类
   */
  private getIconCategory(name: string): string {
    if (['add', 'remove', 'edit', 'delete', 'save', 'close', 'refresh'].includes(name)) {
      return 'actions';
    }
    if (['folder', 'folderOpen', 'file'].includes(name)) {
      return 'files';
    }
    if (['chevronRight', 'chevronDown', 'chevronLeft', 'chevronUp'].includes(name)) {
      return 'navigation';
    }
    if (['info', 'warning', 'error', 'success', 'loading'].includes(name)) {
      return 'status';
    }
    if (['copy', 'paste', 'cut', 'search', 'filter', 'sort', 'menu', 'more'].includes(name)) {
      return 'tools';
    }
    if (['sun', 'moon', 'auto'].includes(name)) {
      return 'theme';
    }
    if (['vscode'].includes(name)) {
      return 'brand';
    }
    return 'misc';
  }

  /**
   * 移除图标
   */
  remove(name: string): boolean {
    return this.icons.delete(name);
  }

  /**
   * 清空所有图标
   */
  clear(): void {
    this.icons.clear();
  }

  /**
   * 获取所有分类
   */
  getCategories(): string[] {
    const categories = new Set<string>();
    this.icons.forEach((icon) => {
      if (icon.category) {
        categories.add(icon.category);
      }
    });
    return Array.from(categories).sort();
  }
}

/**
 * 图标注册中心单例
 */
export const iconRegistry = new IconRegistry();

// 导出类用于扩展
export { IconRegistry };
