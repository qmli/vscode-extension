import fg from 'fast-glob';
import type { ExtensionContext } from 'vscode';
import { Uri } from 'vscode';
import { FileUtil } from '@/utils/file.util';

interface OsInfo {
  mapOsInterruptSource: Map<string, string>;
  manufacturer: string;
  chipSeries: string;
  nameOfCore: string;
  osMaxNumberOfCores: number;
  osPhyIdOfCores: string[];
  osScalabilityClass: string[];
  compilers: string[];
  osTimerSource: string[];
  osTimingProtTimerSource: string[];
  osRemoteSource: string[];
  archSystemTimerFrequency: string;
  archTimingProtFrequency: string;
  lowLevelOfInterruptFirst: string;
  highLevelOfInterruptFirst: string;
  lowLevelOfInterruptSecond: string;
  highLevelOfInterruptSecond: string;
  interruptRepeatable: boolean;
  osInterruptLevelMessage: string;
}

// 全局变量，用于存储芯片信息的映射表
let mapOsInfoEntity: Map<string, OsInfo> | null = null;

/**
 * 初始化其他文件加载器
 * @param context VS Code 扩展上下文
 */
export async function initOtherFileLoader(context: ExtensionContext): Promise<void> {
  loadMapOsInfoEntity(context); // 加载芯片信息实体映射
}

/**
 * 加载芯片信息实体映射表
 * @param context VS Code 扩展上下文
 */
async function loadMapOsInfoEntity(context: ExtensionContext) {
  // 定位 osinfo 资源目录
  const targetUri = Uri.joinPath(context.extensionUri, 'resources', 'osinfo');

  // 使用 fast-glob 查找目录下的所有 JSON 文件
  const files = await fg(`**/*.json`, { cwd: targetUri.fsPath, absolute: true });

  // 读取 JSON 文件内容并解析为对象
  const osInfoData = files.map((file) => JSON.parse(FileUtil.readFileSync(file)));
  const metaDataChipConfig = osInfoData;

  // 初始化全局映射表
  mapOsInfoEntity = new Map<string, OsInfo>();

  // 遍历每个芯片配置，构造 OsInfoEntity 实例
  metaDataChipConfig.forEach((chipConfig) => {
    const parameters = chipConfig['Configuration parameters:'][0]; // 获取配置参数

    // 提取芯片名称
    const chipName = parameters['NameOfCore'];

    // 创建 OsInfoEntity 实例并填充数据
    const entity: OsInfo = {
      mapOsInterruptSource: new Map<string, string>(),
      manufacturer: '',
      chipSeries: '',
      nameOfCore: '',
      osMaxNumberOfCores: 0,
      osPhyIdOfCores: [],
      osScalabilityClass: [],
      compilers: [],
      osTimerSource: [],
      osTimingProtTimerSource: [],
      osRemoteSource: [],
      archSystemTimerFrequency: '',
      archTimingProtFrequency: '',
      lowLevelOfInterruptFirst: '',
      highLevelOfInterruptFirst: '',
      lowLevelOfInterruptSecond: '',
      highLevelOfInterruptSecond: '',
      interruptRepeatable: false,
      osInterruptLevelMessage: ''
    };
    entity.manufacturer = parameters['Manufacturer'];
    entity.chipSeries = parameters['ChipSeries'];
    entity.nameOfCore = parameters['NameOfCore'];
    entity.osMaxNumberOfCores = parameters['OsMaxNumberOfCores'];
    entity.osPhyIdOfCores = parameters['OsPhyIdOfCores'];
    entity.osScalabilityClass = parameters['OsScalabilityClass'];
    entity.compilers = parameters['Compiler'];
    entity.osTimerSource = parameters['OsTimerSource'];
    entity.osTimingProtTimerSource = parameters['OsTimingProtTimerSource'];
    entity.osRemoteSource = parameters['OsRemoteSource'];
    entity.archSystemTimerFrequency = parameters['ArchSystemTimerFrequency'];
    entity.archTimingProtFrequency = parameters['ArchTimingProtFrequency'];

    // 处理中断源映射
    const mapTemp = parameters['OsInterruptSource-OsInterruptSourceId'];
    entity.mapOsInterruptSource = new Map();
    for (const key in mapTemp) {
      if (Object.prototype.hasOwnProperty.call(mapTemp, key)) {
        const value = mapTemp[key];
        entity.mapOsInterruptSource.set(key, value);
      }
    }

    // 处理配置验证部分
    const validation = chipConfig['Configuration validation:'];
    entity.lowLevelOfInterruptFirst = validation['LowLevelOfInterrupt1'];
    entity.highLevelOfInterruptFirst = validation['HighLevelOfInterrupt1'];
    entity.lowLevelOfInterruptSecond = validation['LowLevelOfInterrupt2'];
    entity.highLevelOfInterruptSecond = validation['HighLevelOfInterrupt2'];
    entity.interruptRepeatable = validation['InterruptPriorityRepeat'] === '1';

    // 处理中断级别消息
    entity.osInterruptLevelMessage =
      chipConfig['Configuration details:'][0][
        '<DEFINITION-REF DEST="ECUC-INTEGER-PARAM-DEF">/AUTOSAR/Os/OsIsr/OsIsrSettings/OsInterruptLevel</DEFINITION-REF>'
      ];

    // 将芯片名称和实体添加到映射表
    mapOsInfoEntity?.set(chipName, entity);
  });
}

// 导出芯片信息映射表
export { mapOsInfoEntity };
