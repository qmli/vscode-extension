/**
 * 复制选中内容
 * @param text 选中内容
 */
export function copyText(text: any): boolean {
  let copyResult = true;
  const textarea = document.createElement('textarea');
  textarea.setAttribute('readonly', 'readonly');
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  const result = document.execCommand('Copy');
  if (result) {
    copyResult = true;
  }
  document.body.removeChild(textarea);
  return copyResult;
}
