import type { NodeAttrs } from '@shared/webviews/models/nodeData';

export const mockNodeFormData: NodeAttrs = [
  {
    id: 'aca8d6b6-6473-48ac-bd0e-f43e03ce3228',
    nodeId: '5c893854-2429-470c-b86a-cc0643b73f54',
    appId: '301e62a6-620c-4178-b781-584d8c3423c9',
    treeId: '8f440647-5260-49d5-85c8-4ae45587368c',
    name: 'shortName',
    longName:
      'package[iSOFT].bswModule[Dcm_6c53].DcmConfigSets.DcmDsds.DcmDsdServiceTables[DcmDsdServiceTable_fd25].DcmDsdServices[DcmDsdService_aa60].DcmDsdSubServices[DcmDsdSubService_e79f]',
    label: 'shortName',
    component: 'text',
    value: 'DcmDsdSubService_e79f',
    tempId: '8ba5e29a266239f9337113016eac859e',
    defaultValue: '',
    description: 'The identifying name of current value.',
    constraintDesc: '',
    type: 'Identifier',
    category: 'Basis',
    iType: 'DcmDsdSubService',
    lowerBound: '1',
    upperBound: '1',
    pattern: '^([a-zA-Z][a-zA-Z0-9_]{0,127})$',
    patternList: '[a-zA-Z][a-zA-Z0-9_]{0,127}',
    rules: [
      {
        required: true,
        message: 'This field is required',
        trigger: 'blur'
      },
      {
        pattern: '^([a-zA-Z][a-zA-Z0-9_]{0,127})$',
        message: 'non-standard'
      }
    ],
    options: {
      placeholder: 'The Data Type Is Identifier'
    },
    isError: false,
    isCache: false,
    isWrite: true,
    postBuildVariantMultiplicity: 'false',
    postBuildVariantValue: 'false'
  },
  {
    id: '2999b78d-ca54-47a3-8fe1-82ddd58883d9',
    nodeId: '5c893854-2429-470c-b86a-cc0643b73f54',
    appId: '301e62a6-620c-4178-b781-584d8c3423c9',
    treeId: '8f440647-5260-49d5-85c8-4ae45587368c',
    name: 'DcmDsdSubServiceFnc',
    label: 'DcmDsdSubServiceFnc',
    component: 'text',
    value: null,
    isError: false,
    isCache: false,
    tempId: '1641e9afcebf00378531a71ddb1ab21d',
    isWrite: true,
    defaultValue: '',
    postBuildVariantMultiplicity: 'false',
    postBuildVariantValue: 'false',
    description:
      "Callback function of the ECU Supplier specific component for the particular service. The function's prototype is as described for <Module>_<DiagnosticService>_<SubService>.",
    type: 'String',
    category: 'Basis',
    iType: 'DcmDsdSubService',
    lowerBound: '0',
    upperBound: '1',
    pattern: '^(.*)$',
    patternList: '.*',
    rules: [
      {
        pattern: '^(.*)$',
        message: 'non-standard'
      }
    ],
    options: {
      placeholder: 'The Data Type Is String'
    },
    constraintDesc: ''
  },
  {
    id: '998bfb95-3d59-423f-809a-263af9bf2fd7',
    nodeId: '5c893854-2429-470c-b86a-cc0643b73f54',
    appId: '301e62a6-620c-4178-b781-584d8c3423c9',
    treeId: '8f440647-5260-49d5-85c8-4ae45587368c',
    name: 'DcmDsdSubServiceId',
    label: 'DcmDsdSubServiceId',
    component: 'text',
    value: null,
    isError: false,
    isCache: false,
    tempId: '852bee0f3a2047c14e18c05f5c988d90',
    isWrite: true,
    defaultValue: '',
    postBuildVariantMultiplicity: 'false',
    postBuildVariantValue: 'false',
    description: 'Identifier of the subservice.',
    type: 'SignedInteger8',
    category: 'Basis',
    iType: 'DcmDsdSubService',
    lowerBound: '1',
    upperBound: '1',
    pattern:
      '^(([\\+-]?0)|([\\+-]?[1-9][0-9]?)|([\\+-]?1[0-1][0-9])|([\\+-]?12[0-7])|(-128)|([\\+-]?0[xX]0?[0-9a-fA-F]{1})|([\\+-]?0[xX][1-7][0-9a-fA-F]{1})|(-0[xX]80)|([\\+-]?00?[0-7]{1,2})|([\\+-]?01[0-7]{2})|(-0200)|([\\+-]?0[bB][01]{1,7})|(-0[bB]1[0]{7}))$',
    patternList:
      '([\\+-]?0)#([\\+-]?[1-9][0-9]?)#([\\+-]?1[0-1][0-9])#([\\+-]?12[0-7])#(-128)#([\\+-]?0[xX]0?[0-9a-fA-F]{1})#([\\+-]?0[xX][1-7][0-9a-fA-F]{1})#(-0[xX]80)#([\\+-]?00?[0-7]{1,2})#([\\+-]?01[0-7]{2})#(-0200)#([\\+-]?0[bB][01]{1,7})#(-0[bB]1[0]{7})',
    rules: [
      {
        required: true,
        message: 'This field is required',
        trigger: 'blur'
      },
      {
        pattern:
          '^(([\\+-]?0)|([\\+-]?[1-9][0-9]?)|([\\+-]?1[0-1][0-9])|([\\+-]?12[0-7])|(-128)|([\\+-]?0[xX]0?[0-9a-fA-F]{1})|([\\+-]?0[xX][1-7][0-9a-fA-F]{1})|(-0[xX]80)|([\\+-]?00?[0-7]{1,2})|([\\+-]?01[0-7]{2})|(-0200)|([\\+-]?0[bB][01]{1,7})|(-0[bB]1[0]{7}))$',
        message: 'non-standard'
      }
    ],
    options: {
      placeholder: 'The Data Type Is SignedInteger8'
    },
    constraintDesc: ''
  },
  {
    id: 'd1d49ef7-2d71-4127-a2dd-14849780f6a8',
    nodeId: '5c893854-2429-470c-b86a-cc0643b73f54',
    appId: '301e62a6-620c-4178-b781-584d8c3423c9',
    treeId: '8f440647-5260-49d5-85c8-4ae45587368c',
    name: 'DcmDsdSubServiceUsed',
    label: 'DcmDsdSubServiceUsed',
    component: 'select',
    value: false,
    isError: false,
    isCache: false,
    tempId: 'e3fdc2d93ac7c2643db7ea104b70cbae',
    isWrite: true,
    defaultValue: 'true',
    postBuildVariantMultiplicity: 'false',
    postBuildVariantValue: 'true',
    description:
      'Allows to activate or deactivate the usage of a Subservice. This parameter can be used for multi-purpose ECUs.',
    type: 'Boolean',
    category: 'Basis',
    iType: 'DcmDsdSubService',
    lowerBound: '1',
    upperBound: '1',
    pattern: '^(true|false|0|1)$',
    patternList: 'true|false|0|1',
    rules: [
      {
        required: true,
        message: 'This field is required',
        trigger: 'blur'
      },
      {
        pattern: '^(true|false|0|1)$',
        message: 'non-standard'
      }
    ],
    options: {
      items: [
        {
          name: 'True',
          value: true,
          label: 'True'
        },
        {
          name: 'False',
          value: false,
          label: 'False'
        }
      ],
      maxlength: 8,
      multiple: false,
      placeholder: ''
    },
    constraintDesc: ''
  },
  {
    id: 'ce25cefa-5a6d-44f9-a683-8d95f5adcc5f',
    nodeId: '5c893854-2429-470c-b86a-cc0643b73f54',
    appId: '301e62a6-620c-4178-b781-584d8c3423c9',
    treeId: '8f440647-5260-49d5-85c8-4ae45587368c',
    name: 'DcmDsdSubServiceAddressingFormat',
    label: 'DcmDsdSubServiceAddressingFormat',
    component: 'select',
    value: 'PHYANDFUNC',
    isError: false,
    isCache: false,
    tempId: 'd403b7a3a670e2b926f70de44acbef69',
    isWrite: true,
    defaultValue: 'PHYANDFUNC',
    postBuildVariantMultiplicity: 'false',
    postBuildVariantValue: 'false',
    description:
      'This parameter is used only if the protocol is of type DCM_ROE_ON_xxx. It selects the transmission type of the protocol.',
    type: '[[DcmDsdSubServiceAddressingFormatEnum]]',
    category: 'Enum',
    iType: 'DcmDsdSubService',
    lowerBound: '1',
    upperBound: '1',
    pattern: '',
    patternList: '',
    rules: [
      {
        required: true,
        message: 'This field is required',
        trigger: 'blur'
      }
    ],
    options: {
      items: [
        {
          name: 'PHYSICAL',
          value: 'PHYSICAL',
          label: 'PHYSICAL'
        },
        {
          name: 'FUNCTIONAL',
          value: 'FUNCTIONAL',
          label: 'FUNCTIONAL'
        },
        {
          name: 'PHYANDFUNC',
          value: 'PHYANDFUNC',
          label: 'PHYANDFUNC'
        }
      ],
      maxlength: 8,
      multiple: false,
      placeholder: ''
    },
    constraintDesc: ''
  },
  {
    id: 'd837b0ab-0e89-4f2e-91f5-f9880cb610a1',
    nodeId: '5c893854-2429-470c-b86a-cc0643b73f54',
    appId: '301e62a6-620c-4178-b781-584d8c3423c9',
    treeId: '8f440647-5260-49d5-85c8-4ae45587368c',
    name: 'DcmDsdSubServiceP4ServerMax',
    label: 'DcmDsdSubServiceP4ServerMax',
    component: 'text',
    value: '0.05',
    isError: false,
    isCache: false,
    tempId: 'a77975edc6e5ecc029e6ded5c8d5232d',
    isWrite: true,
    defaultValue: '0.05',
    postBuildVariantMultiplicity: 'false',
    postBuildVariantValue: 'false',
    description: 'This is the subService value for P4ServerMax in seconds (per SubService).',
    type: 'Float',
    category: 'Basis',
    iType: 'DcmDsdSubService',
    lowerBound: '0',
    upperBound: '1',
    pattern:
      '^(([\\+-]?(?:[0-9]|[1-9][0-9]+)[eE][\\+-]?(?:[0-9]|[1-9][0-9]+)+)|([\\+-]?(?:[0-9]|[1-9][0-9]+)\\.(?:[eE][\\+-]?(?:[0-9]|[1-9][0-9]+)+)?)|([\\+-]?(?:[0-9]|[1-9][0-9]+)?\\.[0-9]+(?:[eE][\\+-]?(?:[0-9]|[1-9][0-9]+)+)?)|([-]?INF)|(NaN)|([\\+-]?0[xX]([0-9a-fA-F]+)\\.?[pP][\\+-]?(?:[0-9]|[1-9][0-9]+)+)|([\\+-]?0[xX]([0-9a-fA-F]+)?\\.[0-9a-fA-F]+[pP][\\+-]?(?:[0-9]|[1-9][0-9]+)+))$',
    patternList:
      '([\\+-]?(?:[0-9]|[1-9][0-9]+)[eE][\\+-]?(?:[0-9]|[1-9][0-9]+)+)#([\\+-]?(?:[0-9]|[1-9][0-9]+)\\.(?:[eE][\\+-]?(?:[0-9]|[1-9][0-9]+)+)?)#([\\+-]?(?:[0-9]|[1-9][0-9]+)?\\.[0-9]+(?:[eE][\\+-]?(?:[0-9]|[1-9][0-9]+)+)?)#([-]?INF)#(NaN)#([\\+-]?0[xX]([0-9a-fA-F]+)\\.?[pP][\\+-]?(?:[0-9]|[1-9][0-9]+)+)#([\\+-]?0[xX]([0-9a-fA-F]+)?\\.[0-9a-fA-F]+[pP][\\+-]?(?:[0-9]|[1-9][0-9]+)+)',
    rules: [
      {
        pattern:
          '^(([\\+-]?(?:[0-9]|[1-9][0-9]+)[eE][\\+-]?(?:[0-9]|[1-9][0-9]+)+)|([\\+-]?(?:[0-9]|[1-9][0-9]+)\\.(?:[eE][\\+-]?(?:[0-9]|[1-9][0-9]+)+)?)|([\\+-]?(?:[0-9]|[1-9][0-9]+)?\\.[0-9]+(?:[eE][\\+-]?(?:[0-9]|[1-9][0-9]+)+)?)|([-]?INF)|(NaN)|([\\+-]?0[xX]([0-9a-fA-F]+)\\.?[pP][\\+-]?(?:[0-9]|[1-9][0-9]+)+)|([\\+-]?0[xX]([0-9a-fA-F]+)?\\.[0-9a-fA-F]+[pP][\\+-]?(?:[0-9]|[1-9][0-9]+)+))$',
        message: 'non-standard'
      }
    ],
    options: {
      placeholder: 'The Data Type Is Float'
    },
    constraintDesc: ''
  },
  {
    id: '78476abe-9c37-4de9-863a-f18ad8da67b6',
    nodeId: '5c893854-2429-470c-b86a-cc0643b73f54',
    appId: '301e62a6-620c-4178-b781-584d8c3423c9',
    treeId: '8f440647-5260-49d5-85c8-4ae45587368c',
    name: 'DcmDsdSubServiceModeRuleRef',
    label: 'DcmDsdSubServiceModeRuleRef',
    component: 'draft',
    value: null,
    isError: false,
    isCache: false,
    tempId: '8b8ecf9bbb92a6a149a3cb729bd199dc',
    isWrite: true,
    defaultValue: '',
    postBuildVariantMultiplicity: 'false',
    postBuildVariantValue: 'false',
    description: 'Reference to a DcmDspModeRule which controls the execution of the subservice.',
    type: '[[DcmModeRule]]',
    category: 'Ref',
    iType: 'DcmDsdSubService',
    lowerBound: '0',
    upperBound: '1',
    pattern: '',
    patternList: '',
    rules: [],
    options: {
      draft: {
        transCommand: 'AppSectionTreeView.command.leaf.draft',
        iType: '[[DcmModeRule]]',
        label: 'shortName',
        value: 'id',
        multiple: false,
        result: ['shortName', 'longName', 'appId', 'id'],
        headers: [
          {
            label: 'ObjectType',
            prop: 'objectType'
          },
          {
            label: 'ShortName',
            prop: 'shortName'
          }
        ]
      }
    },
    constraintDesc: ''
  },
  {
    id: '14219b19-8e29-4cde-9596-60480d00fbe9',
    nodeId: '5c893854-2429-470c-b86a-cc0643b73f54',
    appId: '301e62a6-620c-4178-b781-584d8c3423c9',
    treeId: '8f440647-5260-49d5-85c8-4ae45587368c',
    name: 'DcmDsdSubServiceRoleRef',
    label: 'DcmDsdSubServiceRoleRef',
    component: 'draft',
    value: null,
    isError: false,
    isCache: false,
    tempId: '36905b945ca8ee5654d414e10172c53e',
    isWrite: true,
    defaultValue: '',
    postBuildVariantMultiplicity: 'false',
    postBuildVariantValue: 'false',
    description:
      'Reference to DcmDspAuthenticationRow that defines a role in that the service with this subfunction is allowed to be executed.',
    type: '[[DcmDspAuthenticationRow]]',
    category: 'Ref',
    iType: 'DcmDsdSubService',
    lowerBound: '0',
    upperBound: '32',
    pattern: '',
    patternList: '',
    rules: [],
    options: {
      draft: {
        transCommand: 'AppSectionTreeView.command.leaf.draft',
        iType: '[[DcmDspAuthenticationRow]]',
        label: 'shortName',
        value: 'id',
        multiple: true,
        result: ['shortName', 'longName', 'appId', 'id'],
        headers: [
          {
            label: 'ObjectType',
            prop: 'objectType'
          },
          {
            label: 'ShortName',
            prop: 'shortName'
          }
        ]
      }
    },
    constraintDesc: ''
  },
  {
    id: '177033d3-cb15-40ee-836f-a040fee1ea4a',
    nodeId: '5c893854-2429-470c-b86a-cc0643b73f54',
    appId: '301e62a6-620c-4178-b781-584d8c3423c9',
    treeId: '8f440647-5260-49d5-85c8-4ae45587368c',
    name: 'DcmDsdSubServiceSecurityLevelRef',
    label: 'DcmDsdSubServiceSecurityLevelRef',
    component: 'draft',
    value: null,
    isError: false,
    isCache: false,
    tempId: 'add344279b8a155d1bad8be9fb9c2f4f',
    isWrite: true,
    defaultValue: '',
    postBuildVariantMultiplicity: 'false',
    postBuildVariantValue: 'false',
    description:
      'Reference to a Security Level in which the subservice is allowed to be executed. Multiple references are allowed for a subservice.',
    type: '[[DcmDspSecurityRow]]',
    category: 'Ref',
    iType: 'DcmDsdSubService',
    lowerBound: '0',
    upperBound: '*',
    pattern: '',
    patternList: '',
    rules: [],
    options: {
      draft: {
        transCommand: 'AppSectionTreeView.command.leaf.draft',
        iType: '[[DcmDspSecurityRow]]',
        label: 'shortName',
        value: 'id',
        multiple: true,
        result: ['shortName', 'longName', 'appId', 'id'],
        headers: [
          {
            label: 'ObjectType',
            prop: 'objectType'
          },
          {
            label: 'ShortName',
            prop: 'shortName'
          }
        ]
      }
    },
    constraintDesc: ''
  },
  {
    id: 'cfbb5d6e-8118-4b02-9b94-173a9431f4fe',
    nodeId: '5c893854-2429-470c-b86a-cc0643b73f54',
    appId: '301e62a6-620c-4178-b781-584d8c3423c9',
    treeId: '8f440647-5260-49d5-85c8-4ae45587368c',
    name: 'DcmDsdSubServiceSessionLevelRef',
    label: 'DcmDsdSubServiceSessionLevelRef',
    component: 'draft',
    value: null,
    isError: false,
    isCache: false,
    tempId: '74423cc51729dabde78541269d4cfa42',
    isWrite: true,
    defaultValue: '',
    postBuildVariantMultiplicity: 'false',
    postBuildVariantValue: 'false',
    description:
      'Reference to a Session Level in which the subservice is allowed to be executed. Multiple references are allowed for a subservice.',
    type: '[[DcmDspSessionRow]]',
    category: 'Ref',
    iType: 'DcmDsdSubService',
    lowerBound: '0',
    upperBound: '*',
    pattern: '',
    patternList: '',
    rules: [],
    options: {
      draft: {
        transCommand: 'AppSectionTreeView.command.leaf.draft',
        iType: '[[DcmDspSessionRow]]',
        label: 'shortName',
        value: 'id',
        multiple: true,
        result: ['shortName', 'longName', 'appId', 'id'],
        headers: [
          {
            label: 'ObjectType',
            prop: 'objectType'
          },
          {
            label: 'ShortName',
            prop: 'shortName'
          }
        ]
      }
    },
    constraintDesc: ''
  }
];
