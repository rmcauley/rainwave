import type { Routes } from './router';

function navigateTo<T extends keyof Routes>(to: T, param: Routes[T]): void {
  let query = `#!/${to}`;
  if (param) {
    query += `/${param}`;
  }
  window.location.assign(query);
}

export { navigateTo };
