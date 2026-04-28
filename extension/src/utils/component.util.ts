// import { ISoftBooleanType } from '@/common/constants/constants.isoft';
// import type { Template } from '@shared/webviews/models/template';

// interface Item {
//   name: string;
//   value: string | null | number | boolean;
//   label: string;
// }

// interface Option {
//   multiple: boolean;
//   placeholder: string;
//   maxlength: string;
//   items: Item[];
// }

// interface Rule {
//   required: boolean;
//   pattern?: string;
//   message: string;
//   trigger: string;
// }

// const ComponentUtils = {
//   createRadio: (objectName: string) => {
//     const radio: Option = {
//       items: Object.values(ISoftBooleanType).map((item) => {
//         return { name: item, value: item, label: item } as unknown as Item;
//       }),
//       maxlength: '1',
//       multiple: false,
//       placeholder: ''
//     };
//     return radio;
//   },
//   createSelectOptions: (multiple: boolean, items: Template[], placeholder?: string, maxlength?: string) => {
//     const select: Option = {
//       items: items.map((item) => {
//         return { name: item.name, value: item.name || '', label: item.name } as Item;
//       }),
//       maxlength: maxlength || '',
//       multiple: multiple,
//       placeholder: placeholder || ''
//     };
//     return select;
//   },
//   createRules: (lowerBound?: string, upperBound?: string, Pattern?: string) => {
//     const rules: Rule[] = [];
//     if (lowerBound === '1') {
//       const rule: Rule = {
//         required: true,
//         message: '必填项不能为空',
//         trigger: 'blur'
//       } as Rule;
//       rules.push(rule);
//     }
//     if (Pattern) {
//       const pattern: Rule = {
//         pattern: Pattern,
//         message: '值不符合标准规则'
//       } as Rule;
//       rules.push(pattern);
//     }
//     return rules;
//   },
//   createDraft: (multiple: boolean, iType: string) => {
//     const iTypeArr = iType.split(',').map((type) => type.trim());
//     return {
//       draft: {
//         iType: iTypeArr,
//         label: 'shortName',
//         value: 'id',
//         multiple: multiple,
//         result: ['shortName', 'longName', 'appId', 'id'],
//         headers: [
//           { label: 'ObjectType', prop: 'objectType' },
//           { label: 'ShortName', prop: 'shortName' }
//           // { label: 'ID', prop: 'id', hide: true },
//         ]
//       }
//     };
//   }
// };

// export { ComponentUtils };
