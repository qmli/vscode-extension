import { autosarPlatform } from '@/common/constants/constants.project';

export class IntegratedProject {
  constructor(
    public readonly id: string, // 工程ID
    public name: string // 工程名称
  ) {}
}

export class IntegratedUnit {
  constructor(
    public readonly id: string, // unit id
    public name: string, // unit name
    public projectId: string, // integrated project id
    public platformType: string = autosarPlatform.ap // AP, CP
  ) {}

  toJSON(): any {
    return {
      id: this.id,
      name: this.name,
      projectId: this.projectId,
      platformType: this.platformType
    };
  }

  static fromJSON(json: any): IntegratedUnit {
    return new IntegratedUnit(json.id, json.name, json.projectId, json.platformType);
  }
}

export class GenerateType {
  constructor(
    public name: string,
    public description: string
  ) {}
}

export class SshConfig {
  constructor(
    public ip: string = '',
    public port: number = 22, // 默认端口 22
    public username: string = '',
    public password: string = '',
    public useKeyAuth: boolean = false,
    public privateKeyPath: string = ''
  ) {}

  static fromJSON(json: any): SshConfig | null {
    if (!json) {
      return null; // 如果 JSON 数据为 null 或 undefined，返回 null
    }
    return new SshConfig(
      json.ip || '',
      json.port || 22,
      json.username || '',
      json.password || '',
      json.useKeyAuth || false,
      json.privateKeyPath || ''
    );
  }

  toJSON(): {
    ip: string;
    port: number;
    username: string;
    password: string;
    useKeyAuth: boolean;
    privateKeyPath: string;
  } {
    return {
      ip: this.ip,
      port: this.port,
      username: this.username,
      password: this.password,
      useKeyAuth: this.useKeyAuth,
      privateKeyPath: this.privateKeyPath
    };
  }
}
