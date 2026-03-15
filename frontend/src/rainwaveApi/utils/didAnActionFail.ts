import type { components } from '../rainwave-openapi';

export function didAnActionFail(
  obj: Record<string | number | symbol, unknown>,
): components['schemas']['error'] | undefined {
  const found = Object.values(obj).find((result: unknown) => {
    if (result && typeof result === 'object') {
      if ((result as Record<string, unknown>).success === false) {
        return true;
      }
    }

    return false;
  });
  if (found) {
    return found as components['schemas']['error'];
  }

  return undefined;
}
