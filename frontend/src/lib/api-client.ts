import { clearAccessToken, readAccessToken } from '@/lib/access-token';

export type ApiQueryPrimitive = string | number | boolean;
export type ApiQueryValue =
  ApiQueryPrimitive | null | undefined | readonly (ApiQueryPrimitive | null | undefined)[];
export type ApiQuery = Record<string, ApiQueryValue>;

export interface ApiRequestOptions<TBody = unknown> extends Omit<RequestInit, 'body'> {
  body?: TBody;
  query?: ApiQuery;
}

export interface ApiClientOptions {
  baseUrl?: string;
  defaultHeaders?: HeadersInit;
  fetcher?: typeof fetch;
}

interface ApiErrorOptions {
  status: number;
  code?: number;
  details?: unknown;
  responseBody?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: number;
  readonly details?: unknown;
  readonly responseBody?: unknown;

  constructor(message: string, options: ApiErrorOptions) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
    this.responseBody = options.responseBody;
  }
}

type ApiMethodOptions = Omit<ApiRequestOptions<never>, 'body' | 'method'>;

export interface ApiClient {
  request<TResponse, TBody = unknown>(
    path: string,
    options?: ApiRequestOptions<TBody>,
  ): Promise<TResponse>;
  get<TResponse>(path: string, options?: ApiMethodOptions): Promise<TResponse>;
  post<TResponse, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: ApiMethodOptions,
  ): Promise<TResponse>;
  put<TResponse, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: ApiMethodOptions,
  ): Promise<TResponse>;
  patch<TResponse, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: ApiMethodOptions,
  ): Promise<TResponse>;
  delete<TResponse>(path: string, options?: ApiMethodOptions): Promise<TResponse>;
}

const DEFAULT_API_BASE_URL = '/api';

function normalizeBaseUrl(baseUrl: string): string {
  const trimmedBaseUrl = baseUrl.trim();

  if (!trimmedBaseUrl) {
    return DEFAULT_API_BASE_URL;
  }

  return trimmedBaseUrl.endsWith('/') ? trimmedBaseUrl.slice(0, -1) : trimmedBaseUrl;
}

function appendQuery(url: string, query?: ApiQuery): string {
  if (!query) {
    return url;
  }

  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    const values = Array.isArray(value) ? value : [value];

    for (const item of values) {
      if (item !== null && item !== undefined) {
        searchParams.append(key, String(item));
      }
    }
  }

  const search = searchParams.toString();
  if (!search) {
    return url;
  }

  return `${url}${url.includes('?') ? '&' : '?'}${search}`;
}

function buildUrl(baseUrl: string, path: string, query?: ApiQuery): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return appendQuery(`${baseUrl}${normalizedPath}`, query);
}

function mergeHeaders(defaultHeaders?: HeadersInit, requestHeaders?: HeadersInit): Headers {
  const headers = new Headers(defaultHeaders);

  new Headers(requestHeaders).forEach((value, key) => {
    headers.set(key, value);
  });

  if (!headers.has('accept')) {
    headers.set('accept', 'application/json');
  }

  return headers;
}

function isRawBody(body: unknown): body is BodyInit {
  return (
    typeof body === 'string' ||
    body instanceof Blob ||
    body instanceof FormData ||
    body instanceof URLSearchParams
  );
}

function serializeBody(body: unknown, headers: Headers): BodyInit | null | undefined {
  if (body === undefined) {
    return undefined;
  }

  if (body === null || isRawBody(body)) {
    return body;
  }

  if (!headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  return JSON.stringify(body);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function parseResponse(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205) {
    return undefined;
  }

  const text = await response.text();
  if (!text) {
    return undefined;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('json')) {
    return text;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError('Invalid JSON response', {
      status: response.status,
      responseBody: text,
    });
  }
}

function createResponseError(response: Response, responseBody: unknown): ApiError {
  const body = isRecord(responseBody) ? responseBody : undefined;
  const nestedError = body && isRecord(body.error) ? body.error : undefined;
  const error = nestedError ?? body;
  const message =
    typeof error?.message === 'string'
      ? error.message
      : response.statusText || `Request failed (HTTP ${response.status})`;

  return new ApiError(message, {
    status: response.status,
    code: typeof error?.code === 'number' ? error.code : undefined,
    details: error?.details,
    responseBody,
  });
}

export function createApiClient(options: ApiClientOptions = {}): ApiClient {
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? DEFAULT_API_BASE_URL);
  const fetcher = options.fetcher ?? ((input, init) => fetch(input, init));

  async function request<TResponse, TBody = unknown>(
    path: string,
    requestOptions: ApiRequestOptions<TBody> = {},
  ): Promise<TResponse> {
    const { body, headers: requestHeaders, query, ...init } = requestOptions;
    const headers = mergeHeaders(options.defaultHeaders, requestHeaders);
    const accessToken = readAccessToken();

    if (accessToken && !headers.has('authorization')) {
      headers.set('authorization', `Bearer ${accessToken}`);
    }

    const response = await fetcher(buildUrl(baseUrl, path, query), {
      ...init,
      body: serializeBody(body, headers),
      credentials: 'omit',
      headers,
    });
    const responseBody = await parseResponse(response);

    if (!response.ok) {
      if (response.status === 401) {
        clearAccessToken();
      }

      throw createResponseError(response, responseBody);
    }

    return responseBody as TResponse;
  }

  return {
    request,
    get: (path, requestOptions) =>
      request(path, {
        ...requestOptions,
        method: 'GET',
      }),
    post: (path, body, requestOptions) =>
      request(path, {
        ...requestOptions,
        body,
        method: 'POST',
      }),
    put: (path, body, requestOptions) =>
      request(path, {
        ...requestOptions,
        body,
        method: 'PUT',
      }),
    patch: (path, body, requestOptions) =>
      request(path, {
        ...requestOptions,
        body,
        method: 'PATCH',
      }),
    delete: (path, requestOptions) =>
      request(path, {
        ...requestOptions,
        method: 'DELETE',
      }),
  };
}

export const apiClient = createApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL,
});
