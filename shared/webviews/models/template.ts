/**
 * Template 数据结构 来源文件ITemplate.ts ITemplate
 */
export interface Template {
  uuid?: string;
  id?: string;
  iType?: string;
  pType?: string;
  parentId?: string;
  name: string;
  alias?: string;
  type?: string;
  outline?: string;
  lowerBound?: string;
  upperBound?: string;
  leaf?: boolean;
  isNode?: boolean;
  init?: boolean;
  treeId?: string;
  sort?: number;
  category?: string;
  description?: string;
  optionalValueList?: string;
  defaultValue?: string;
  postBuildVariantMultiplicity?: boolean;
  postBuildVariantValue?: boolean;
  pattern?: string;
  patternList?: string;
  links?: string[];
}

/**
 * Attribute 数据结构 来源文件IAttribute.ts IAttribute
 */
export interface Attribute {
  AttributeName: string;
  Type: string;
  MultiplicityLowerBound: string;
  MultiplicityUpperBound: string;
  Category: string;
  Description: string;
  OptionalValueList: string;
  Pattern: string;
  PatternList: string;
  DefaultValue: string;
}
