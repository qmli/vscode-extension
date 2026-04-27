// API服务

import { logger } from './logger';
import type { APIRequest, APIResponse } from './types';

class APIService {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;

  constructor(baseURL = '', timeout = 10000) {
    this.baseURL = baseURL;
    this.timeout = timeout;
    this.defaultHeaders = {
      'Content-Type': 'application/json'
    };
  }

  setBaseURL(url: string): void {
    this.baseURL = url;
  }

  setDefaultHeader(key: string, value: string): void {
    this.defaultHeaders[key] = value;
  }

  setTimeout(ms: number): void {
    this.timeout = ms;
  }

  async request<T = any>(config: APIRequest): Promise<APIResponse<T>> {
    const startTime = Date.now();

    try {
      const url = this.buildURL(config.url, config.params);
      const requestConfig: RequestInit = {
        method: config.method,
        headers: {
          ...this.defaultHeaders,
          ...config.headers
        },
        signal: this.createTimeoutSignal(config.timeout || this.timeout)
      };

      if (config.data && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
        requestConfig.body = JSON.stringify(config.data);
      }

      logger.debug(`API Request: ${config.method} ${url}`, {
        config: config,
        headers: requestConfig.headers
      });

      const response = await fetch(url, requestConfig);
      const responseData = await this.parseResponse(response);
      const duration = Date.now() - startTime;

      const result: APIResponse<T> = {
        success: response.ok,
        data: responseData,
        code: response.status,
        timestamp: Date.now()
      };

      if (!response.ok) {
        result.error = responseData?.message || response.statusText;
      }

      logger.debug(`API Response: ${config.method} ${url} (${duration}ms)`, {
        status: response.status,
        success: response.ok,
        data: responseData
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error(`API Error: ${config.method} ${config.url} (${duration}ms)`, {
        error: errorMessage,
        config: config
      });

      return {
        success: false,
        error: errorMessage,
        timestamp: Date.now()
      };
    }
  }

  private buildURL(url: string, params?: Record<string, any>): string {
    const fullURL = url.startsWith('http') ? url : `${this.baseURL}${url}`;

    if (!params) return fullURL;

    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });

    const queryString = searchParams.toString();
    return queryString ? `${fullURL}?${queryString}` : fullURL;
  }

  private createTimeoutSignal(timeout: number): AbortSignal {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeout);
    return controller.signal;
  }

  private async parseResponse(response: Response): Promise<any> {
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      return response.json();
    }

    if (contentType?.includes('text/')) {
      return response.text();
    }

    return response.blob();
  }

  // 便捷方法
  async get<T = any>(url: string, params?: Record<string, any>): Promise<APIResponse<T>> {
    return this.request<T>({ method: 'GET', url: url, params: params });
  }

  async post<T = any>(url: string, data?: any, params?: Record<string, any>): Promise<APIResponse<T>> {
    return this.request<T>({ method: 'POST', url: url, data: data, params: params });
  }

  async put<T = any>(url: string, data?: any, params?: Record<string, any>): Promise<APIResponse<T>> {
    return this.request<T>({ method: 'PUT', url: url, data: data, params: params });
  }

  async delete<T = any>(url: string, params?: Record<string, any>): Promise<APIResponse<T>> {
    return this.request<T>({ method: 'DELETE', url: url, params: params });
  }

  async patch<T = any>(url: string, data?: any, params?: Record<string, any>): Promise<APIResponse<T>> {
    return this.request<T>({ method: 'PATCH', url: url, data: data, params: params });
  }

  // 拦截器
  private requestInterceptors: Array<(config: APIRequest) => APIRequest | Promise<APIRequest>> = [];
  private responseInterceptors: Array<(response: APIResponse) => APIResponse | Promise<APIResponse>> = [];

  addRequestInterceptor(interceptor: (config: APIRequest) => APIRequest | Promise<APIRequest>): void {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: (response: APIResponse) => APIResponse | Promise<APIResponse>): void {
    this.responseInterceptors.push(interceptor);
  }

  // 批量请求
  async batch<T = any>(requests: APIRequest[]): Promise<APIResponse<T>[]> {
    const promises = requests.map((config) => this.request<T>(config));
    return Promise.all(promises);
  }

  // 串行请求
  async sequence<T = any>(requests: APIRequest[]): Promise<APIResponse<T>[]> {
    const results: APIResponse<T>[] = [];

    for (const config of requests) {
      const result = await this.request<T>(config);
      results.push(result);

      // 如果请求失败且没有继续标志，停止后续请求
      if (!result.success) {
        break;
      }
    }

    return results;
  }

  // 重试机制
  async requestWithRetry<T = any>(config: APIRequest, maxRetries = 3, delay = 1000): Promise<APIResponse<T>> {
    let lastError: APIResponse<T>;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await this.request<T>(config);

      if (result.success) {
        return result;
      }

      lastError = result;

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delay * attempt));
      }
    }

    return lastError!;
  }
}

// 全局API实例
export const api = new APIService();

// 创建API实例
export const createAPI = (baseURL?: string, timeout?: number): APIService => {
  return new APIService(baseURL, timeout);
};

// 导出类
export { APIService };
