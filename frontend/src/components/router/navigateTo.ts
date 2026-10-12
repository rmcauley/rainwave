import type { Routes } from './router';

function navigateTo<T extends keyof Routes>(to: T, param: Routes[T][1]): void {
  let query = `#!/${to}`;
  if (param) {
    query += `/${param}`;
  }
  window.location.assign(query);
}

export { navigateTo };
