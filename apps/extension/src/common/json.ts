import { Uri } from 'vscode';
import { isContainer } from '@/container';

export function loggingJsonReplacer(key: string, value: unknown): unknown {
  if (key === '' || value == null || typeof value !== 'object') return value;
  if (key.startsWith('_')) return undefined;

  if (value instanceof Error) return String(value);
  if (value instanceof Uri) {
    if ('sha' in value && typeof value.sha === 'string' && value.sha) {
      return `${value.sha}:${value.toString()}`;
    }
    return value.toString();
  }

  if (isContainer(value)) return '<container>';
  return value;
}
