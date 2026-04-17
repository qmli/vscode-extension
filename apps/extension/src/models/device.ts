/**
 * DeviceModel 类
 */
export class DeviceModel {
  constructor(
    public readonly id: string, // device id
    public name: string, // device name
    public cpu: number = 0, // device cpu
    public memory: number = 0, // device memory (unit: M)
    public core: number = 1, // device core
    public board: string = 'local', // device board
    public networkConfig: string = '', // device network config
    public pushAres: Are[] = [], // push ares
    public installAres: Are[] = [], // device install ares
    public createTime: number = Date.now() // create time
  ) {}

  /**
   * 创建当前对象的深拷贝
   */
  clone(): DeviceModel {
    const cloned = new DeviceModel(
      this.id,
      this.name,
      this.cpu,
      this.memory,
      this.core,
      this.board,
      this.networkConfig,
      this.pushAres.map((are) => are.clone()),
      this.installAres.map((are) => are.clone()),
      this.createTime
    );
    return cloned;
  }

  /**
   * 从源对象复制所有属性到当前对象
   */
  copy(source: DeviceModel): this {
    // id 和 uuid 是只读的，不复制
    this.name = source.name;
    this.cpu = source.cpu;
    this.memory = source.memory;
    this.core = source.core;
    this.board = source.board;
    this.networkConfig = source.networkConfig;
    this.pushAres = source.pushAres.map((are) => are.clone());
    this.installAres = source.installAres.map((are) => are.clone());
    this.createTime = source.createTime;
    return this;
  }

  /**
   * 清理对象持有的资源
   */
  dispose(): void {
    // 清理数组引用
    this.pushAres.length = 0;
    this.installAres.length = 0;
  }

  toJSON(): any {
    return {
      id: this.id,
      name: this.name,
      cpu: this.cpu,
      memory: this.memory,
      core: this.core,
      board: this.board,
      networkConfig: this.networkConfig,
      pushAres: this.pushAres.map((are) => are.tojson()),
      installAres: this.installAres.map((are) => are.tojson()),
      createTime: this.createTime
    };
  }

  static fromJSON(json: DeviceModel): DeviceModel {
    const device = new DeviceModel(
      json.id,
      json.name,
      json.cpu,
      json.memory,
      json.core,
      json.board,
      json.networkConfig,
      (json.pushAres || []).map((areJson: any) => Are.fromJSON(areJson)),
      (json.installAres || []).map((areJson: any) => Are.fromJSON(areJson)),
      json.createTime || Date.now()
    );
    return device;
  }
}

/**
 * Are 类
 */
export class Are {
  constructor(
    public name: string,
    public filePath: string,
    public sdkName: string,
    public generateType: string,
    public board: string,
    public araSysrootPath: string,
    public installPath: string = '',
    public installSize: number = 0, // ARE包安装后的大小，单位：MB
    public machineShortName: string = '' // 关联的Machine简短名称，如Machine1
  ) {}

  /**
   * 克隆对象
   * 创建当前对象的深拷贝
   */
  clone(): Are {
    const cloned = new Are(
      this.name,
      this.filePath,
      this.sdkName,
      this.generateType,
      this.board,
      this.araSysrootPath,
      this.installPath,
      this.installSize,
      this.machineShortName
    );
    return cloned;
  }

  /**
   * 复制属性
   * 从源对象复制所有属性到当前对象
   */
  copy(source: Are): this {
    // uuid 是只读的，不复制
    this.name = source.name;
    this.filePath = source.filePath;
    this.sdkName = source.sdkName;
    this.generateType = source.generateType;
    this.board = source.board;
    this.araSysrootPath = source.araSysrootPath;
    this.installPath = source.installPath;
    this.installSize = source.installSize;
    this.machineShortName = source.machineShortName;
    return this;
  }

  /**
   * 释放资源
   * 清理对象持有的资源
   */
  dispose(): void {
    // Are 对象主要是值类型，不需要特殊清理
    // 如果需要清理资源，可以在这里添加
  }

  tojson(): any {
    return {
      name: this.name,
      filePath: this.filePath,
      sdkName: this.sdkName,
      generateType: this.generateType,
      board: this.board,
      araSysrootPath: this.araSysrootPath,
      installPath: this.installPath,
      installSize: this.installSize,
      machineShortName: this.machineShortName
    };
  }

  static fromJSON(json: Are): Are {
    const are = new Are(
      json.name,
      json.filePath,
      json.sdkName,
      json.generateType,
      json.board,
      json.araSysrootPath,
      json.installPath || '',
      json.installSize || 0,
      json.machineShortName || ''
    );
    return are;
  }

  // [sdk]
  // SDK_NAME = SDK-1.2.0-x86_64-x86_64-ubuntu20.04-local-debug
  // SDK_BUILD_TYPE = debug
  // SDK_SOURCE_COMMITID = edc97aa669f80231617a1dc695b9bdfa251d4d11

  // [are]
  // ARE_ARCH = x86_64
  // ARE_TAG = 20250612171537
  // ARE_INSTALL_SIZE = 1096
}

export interface DeviceStatus {
  id: string;
  deleted: boolean; // 是否已被删除
}
