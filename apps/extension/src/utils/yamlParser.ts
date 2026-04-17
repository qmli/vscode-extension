import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export class YAMLParser {
  readonly supportedExtensions: string[];
  readonly defaultEncoding: BufferEncoding = 'utf8';
  readonly cache: Map<any, any>;
  readonly stats: { filesParsed: number; totalSize: number; lastParseTime: any };

  constructor() {
    this.supportedExtensions = ['.yaml', '.yml'];
    this.cache = new Map();
    this.stats = {
      filesParsed: 0,
      totalSize: 0,
      lastParseTime: null
    };
  }

  /**
   * 验证文件是否为YAML格式
   */
  validateFile(filePath: string): boolean {
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }

    const ext = path.extname(filePath).toLowerCase();
    if (!this.supportedExtensions.includes(ext)) {
      throw new Error(`不支持的文件格式: ${ext}，请使用 .yaml 或 .yml 文件`);
    }

    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      throw new Error(`文件为空: ${filePath}`);
    }

    return true;
  }

  /**
   * 解析YAML文件为JavaScript对象
   */
  parseFile(filePath: string, useCache = true): any {
    const startTime = Date.now();

    try {
      this.validateFile(filePath);

      if (useCache && this.cache.has(filePath)) {
        const cached = this.cache.get(filePath);
        console.log(`从缓存加载: ${filePath}`);
        return cached;
      }

      const fileContent = fs.readFileSync(filePath, this.defaultEncoding);
      const parsedData = yaml.load(fileContent.toString());

      const parseTime = Date.now() - startTime;
      this.stats.filesParsed++;
      this.stats.totalSize += fs.statSync(filePath).size;
      this.stats.lastParseTime = new Date();

      if (useCache) {
        this.cache.set(filePath, {
          data: parsedData,
          timestamp: this.stats.lastParseTime,
          parseTime: parseTime
        });
      }

      console.log(`解析完成: ${filePath} (耗时: ${parseTime}ms)`);
      return parsedData;
    } catch (error) {
      if (typeof error === 'string') {
        console.error(`解析失败: ${filePath}`, error);
      }
      throw error;
    }
  }

  /**
   * 将JavaScript对象转换为YAML字符串
   */
  stringifyToYAML(data: unknown, options = {}): string {
    const defaultOptions = {
      indent: 2,
      skipInvalid: true,
      flowLevel: -1,
      styles: {
        '!!null': 'empty'
      }
    };

    const yamlOptions = { ...defaultOptions, ...options };
    return yaml.dump(data, yamlOptions);
  }

  /**
   * 将JavaScript对象保存为YAML文件
   */
  saveToFile(data: unknown, filePath: string, options = {}): boolean {
    try {
      const yamlString = this.stringifyToYAML(data, options);
      fs.writeFileSync(filePath, yamlString, this.defaultEncoding);
      console.log(`YAML文件已保存: ${filePath}`);
      return true;
    } catch (error) {
      if (typeof error === 'string') {
        console.error(`保存失败: ${filePath}`, error);
      }
      throw error;
    }
  }

  /**
   * 批量解析目录中的YAML文件
   */
  parseDirectory(dirPath: string): any {
    if (!fs.existsSync(dirPath)) {
      throw new Error(`目录不存在: ${dirPath}`);
    }

    const files = fs.readdirSync(dirPath);
    const yamlFiles = files.filter((file) => this.supportedExtensions.includes(path.extname(file).toLowerCase()));

    const results: any = {};
    yamlFiles.forEach((file) => {
      const fullPath = path.join(dirPath, file);
      try {
        results[file] = this.parseFile(fullPath);
      } catch (error) {
        if (typeof error === 'string') {
          console.warn(`跳过文件 ${file}: ${error}`);
        }
      }
    });

    return results;
  }

  /**
   * 平铺key值
   */
  flattenObject(obj: any, parentKey = '', result: any = {}): any {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const newKey = parentKey ? `${parentKey}.${key}` : key;
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          this.flattenObject(obj[key], newKey, result);
        } else {
          result[newKey] = obj[key];
        }
      }
    }
    return result;
  }

  /**
   * 获取解析统计信息
   */
  getStats(): any {
    return {
      ...this.stats,
      cacheSize: this.cache.size,
      cacheEntries: Array.from(this.cache.keys())
    };
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.cache.clear();
    console.log('缓存已清空');
  }
}
