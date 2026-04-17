export class SdkInfo {
  constructor(
    public sdkVersion: string = '', // SDK版本
    public sdkBuildType: string = '', // SDK编译类型
    public sdkName: string = '', // SDK名称
    public sdkInstallSize: string = '0', // SDK安装大小（单位：MB）
    public toolchain: string = '', // 工具链类型
    public orientaisToolPath: string = '' // 工具链脚本路径
  ) {}

  /**
   * 创建当前对象的深拷贝
   */
  clone(): SdkInfo {
    return new SdkInfo(
      this.sdkVersion,
      this.sdkBuildType,
      this.sdkName,
      this.sdkInstallSize,
      this.toolchain,
      this.orientaisToolPath
    );
  }

  /**
   * 从源对象复制所有属性到当前对象
   */
  copy(source: SdkInfo): this {
    this.sdkVersion = source.sdkVersion;
    this.sdkBuildType = source.sdkBuildType;
    this.sdkName = source.sdkName;
    this.sdkInstallSize = source.sdkInstallSize;
    this.toolchain = source.toolchain;
    this.orientaisToolPath = source.orientaisToolPath;
    return this;
  }

  /**
   * 清理对象持有的资源
   */
  dispose(): void {
    // SdkInfo 对象主要是值类型，不需要特殊清理
  }

  toJSON(): {
    sdkVersion: string;
    sdkBuildType: string;
    sdkName: string;
    sdkInstallSize: string;
    toolchain: string;
    orientaisToolPath: string;
  } {
    return {
      sdkVersion: this.sdkVersion,
      sdkBuildType: this.sdkBuildType,
      sdkName: this.sdkName,
      sdkInstallSize: this.sdkInstallSize,
      toolchain: this.toolchain,
      orientaisToolPath: this.orientaisToolPath
    };
  }

  static fromJSON(json: any): SdkInfo {
    return new SdkInfo(
      json.sdkVersion || '',
      json.sdkBuildType || '',
      json.sdkName || '',
      json.sdkInstallSize || '0',
      json.toolchain || '',
      json.orientaisToolPath || ''
    );
  }
}
