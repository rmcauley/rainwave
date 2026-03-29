import type { components, paths } from '../rainwave-openapi';

type ApiPath = keyof paths;
type PostOperation<Path extends ApiPath> = paths[Path]['post'];
type JsonRequest<Path extends ApiPath> = PostOperation<Path> extends {
  requestBody: {
    content: {
      'application/json': infer Body;
    };
  };
}
  ? Body
  : undefined;
type JsonResponse<Path extends ApiPath> = PostOperation<Path> extends {
  responses: {
    default: {
      content: {
        'application/json': infer Response;
      };
    };
  };
}
  ? Response
  : never;

interface RainwaveEnvelope {
  error?: components['schemas']['error'];
}

export class RainwaveApiError extends Error {
  public readonly status: number;
  public readonly apiError?: components['schemas']['error'];

  public constructor(message: string, status: number, apiError?: components['schemas']['error']) {
    super(message);
    this.name = 'RainwaveApiError';
    this.status = status;
    this.apiError = apiError;
  }
}

function hasApiError(payload: unknown): payload is RainwaveEnvelope {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  return 'error' in payload;
}

export async function postRainwave<Path extends ApiPath>(
  path: Path,
  body?: JsonRequest<Path>,
): Promise<JsonResponse<Path>> {
  const response = await fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = (await response.json()) as JsonResponse<Path>;

  if (!response.ok) {
    const apiError = hasApiError(payload) ? payload.error : undefined;
    throw new RainwaveApiError(apiError?.text || response.statusText, response.status, apiError);
  }

  if (hasApiError(payload) && payload.error) {
    throw new RainwaveApiError(payload.error.text || payload.error.tl_key, response.status, payload.error);
  }

  return payload;
}

export type { JsonRequest, JsonResponse };
