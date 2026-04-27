// 工具函数测试

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  debounce,
  deepClone,
  formatDate,
  formatFileSize,
  generateId,
  getFileExtension,
  getFileNameWithoutExtension,
  isEmpty,
  throttle
} from './index';

describe('Utils', () => {
  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();

      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
    });
  });

  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should debounce function calls', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledOnce();
    });

    it('should call with latest arguments', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn('first');
      debouncedFn('second');
      debouncedFn('third');

      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledWith('third');
    });
  });

  describe('throttle', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should throttle function calls', () => {
      const fn = vi.fn();
      const throttledFn = throttle(fn, 100);

      throttledFn();
      throttledFn();
      throttledFn();

      expect(fn).toHaveBeenCalledOnce();

      vi.advanceTimersByTime(100);

      throttledFn();
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('deepClone', () => {
    it('should clone primitive values', () => {
      expect(deepClone(1)).toBe(1);
      expect(deepClone('test')).toBe('test');
      expect(deepClone(true)).toBe(true);
      expect(deepClone(null)).toBe(null);
      // const result = deepClone(undefined);
      // expect(result).toBe(undefined);
    });

    it('should clone objects', () => {
      const obj = { a: 1, b: { c: 2 } };
      const cloned = deepClone(obj);

      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
      expect(cloned.b).not.toBe(obj.b);
    });

    it('should clone arrays', () => {
      const arr = [1, 2, { a: 3 }];
      const cloned = deepClone(arr);

      expect(cloned).toEqual(arr);
      expect(cloned).not.toBe(arr);
      expect(cloned[2]).not.toBe(arr[2]);
    });

    it('should clone dates', () => {
      const date = new Date('2023-01-01');
      const cloned = deepClone(date);

      expect(cloned).toEqual(date);
      expect(cloned).not.toBe(date);
    });
  });

  describe('formatFileSize', () => {
    it('should format file sizes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });
  });

  describe('formatDate', () => {
    it('should format dates with default format', () => {
      const date = new Date('2023-01-01T12:30:45');
      const formatted = formatDate(date);
      expect(formatted).toBe('2023-01-01 12:30:45');
    });

    it('should format dates with custom format', () => {
      const date = new Date('2023-01-01T12:30:45');
      const formatted = formatDate(date, 'DD/MM/YYYY');
      expect(formatted).toBe('01/01/2023');
    });

    it('should handle string dates', () => {
      const formatted = formatDate('2023-01-01T12:30:45');
      expect(formatted).toBe('2023-01-01 12:30:45');
    });

    it('should handle timestamp', () => {
      const timestamp = new Date('2023-01-01T12:30:45').getTime();
      const formatted = formatDate(timestamp);
      expect(formatted).toBe('2023-01-01 12:30:45');
    });
  });

  describe('isEmpty', () => {
    it('should detect empty values', () => {
      expect(isEmpty(null)).toBe(true);
      expect(isEmpty(undefined)).toBe(true);
      expect(isEmpty('')).toBe(true);
      expect(isEmpty('  ')).toBe(true);
      expect(isEmpty([])).toBe(true);
      expect(isEmpty({})).toBe(true);
    });

    it('should detect non-empty values', () => {
      expect(isEmpty('text')).toBe(false);
      expect(isEmpty([1])).toBe(false);
      expect(isEmpty({ a: 1 })).toBe(false);
      expect(isEmpty(0)).toBe(false);
      expect(isEmpty(false)).toBe(false);
    });
  });

  describe('getFileExtension', () => {
    it('should extract file extensions', () => {
      expect(getFileExtension('file.txt')).toBe('txt');
      expect(getFileExtension('path/to/file.js')).toBe('js');
      expect(getFileExtension('file.tar.gz')).toBe('gz');
      expect(getFileExtension('file')).toBe('');
      expect(getFileExtension('.hidden')).toBe('');
    });
  });

  describe('getFileNameWithoutExtension', () => {
    it('should extract filename without extension', () => {
      expect(getFileNameWithoutExtension('file.txt')).toBe('file');
      expect(getFileNameWithoutExtension('path/to/file.js')).toBe('path/to/file');
      expect(getFileNameWithoutExtension('file.tar.gz')).toBe('file.tar');
      expect(getFileNameWithoutExtension('file')).toBe('file');
    });
  });
});
