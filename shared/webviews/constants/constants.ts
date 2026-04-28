export const keys = Object.freeze([
  'left',
  'alt+left',
  'ctrl+left',
  'right',
  'alt+right',
  'ctrl+right',
  'alt+,',
  'alt+.',
  'alt+enter',
  'ctrl+enter',
  'escape'
] as const);
export type Keys = (typeof keys)[number];

export const extensionPrefix = 'autosar';

const utm = 'source=autosar';
export const urls = Object.freeze({
  releaseNotes: `https://test.com.cn/?${utm}`
});
