import type { Routes } from '../router/router';
import { panelsTemplate } from './panels.template';

class Panels {
  private currentRoute: keyof Routes | undefined;
  public template: ReturnType<typeof panelsTemplate>;

  constructor() {
    this.template = panelsTemplate(null);
  }
}

export { Panels };
