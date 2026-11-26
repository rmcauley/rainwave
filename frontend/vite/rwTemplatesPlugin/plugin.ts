import { existsSync, readdirSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { format } from 'oxfmt';
import type { Plugin, ViteDevServer } from 'vite';

import { compileTemplate } from './compiler.ts';

const TEMPLATE_SUFFIX = '.template.ts';

interface RainwaveTemplatesOptions {
  /** Directory (relative to the Vite root) holding the .html templates. */
  templateDir?: string;
}

function findHtmlFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return findHtmlFiles(entryPath);
    }
    return entry.name.endsWith('.html') ? [entryPath] : [];
  });
}

/**
 * Compiles component .html templates to sibling .template.ts files, formatted
 * with oxfmt.  Everything is compiled when Vite starts or builds; in dev, the
 * affected template is recompiled whenever its .html is written, and Vite's
 * normal TS update takes it from there.
 */
export function rainwaveTemplates(options: RainwaveTemplatesOptions = {}): Plugin {
  let root = process.cwd();
  let templateDir = path.join(root, options.templateDir ?? 'src/components');
  let formatConfig: Record<string, unknown> = {};

  const isTemplateHtml = (file: string): boolean =>
    file.endsWith('.html') && path.resolve(file).startsWith(templateDir + path.sep);

  async function compileFile(htmlFile: string): Promise<void> {
    const base = htmlFile.slice(0, -'.html'.length);
    const outputFile = base + TEMPLATE_SUFFIX;
    const contextFile = `${base}.context.ts`;
    const styleFile = `${base}.css`;

    let code: string;
    try {
      code = compileTemplate(await readFile(htmlFile, 'utf8'), {
        templateName: path.basename(base),
        outputFile,
        contextFile: existsSync(contextFile) ? contextFile : undefined,
        styleFile: existsSync(styleFile) ? styleFile : undefined,
        svgModule: path.join(root, 'src/helpers/svg.ts'),
        languageModule: path.join(root, 'src/language/index.ts'),
      });
    } catch (error) {
      throw new Error(
        `Failed to compile ${path.relative(root, htmlFile)}: ${(error as Error).message}`,
        {
          cause: error,
        },
      );
    }

    const formatted = await format(outputFile, code, formatConfig);
    if (formatted.errors.length > 0) {
      throw new Error(
        `Failed to format ${path.relative(root, outputFile)}: ${formatted.errors.map((e) => e.message).join('\n')}`,
      );
    }

    // Skipping identical writes keeps Vite's watcher from firing for nothing.
    const existing = await readFile(outputFile, 'utf8').catch(() => null);
    if (existing !== formatted.code) {
      await writeFile(outputFile, formatted.code);
    }
  }

  async function compileAll(): Promise<void> {
    const htmlFiles = findHtmlFiles(templateDir);
    const seen = new Map<string, string>();
    for (const htmlFile of htmlFiles) {
      const name = path.basename(htmlFile, '.html');
      const previous = seen.get(name);
      if (previous) {
        throw new Error(`${name} is a duplicate template name (${previous}, ${htmlFile}).`);
      }
      seen.set(name, htmlFile);
    }
    await Promise.all(htmlFiles.map(compileFile));
  }

  /** The .html a sibling .context.ts or .css file changes the output of. */
  function owningHtml(file: string): string | null {
    const match = /^(.*?)(\.context\.ts|\.css)$/.exec(file);
    const html = match ? `${match[1]}.html` : null;
    return html && existsSync(html) && isTemplateHtml(html) ? html : null;
  }

  /** Compiles, reporting failures to the terminal and the browser overlay instead of throwing. */
  async function recompile(server: ViteDevServer, htmlFile: string): Promise<boolean> {
    try {
      await compileFile(htmlFile);
      return true;
    } catch (error) {
      const message = (error as Error).message;
      server.config.logger.error(`[rainwave-templates] ${message}`, { timestamp: true });
      server.ws.send({ type: 'error', err: { message, stack: '' } });
      return false;
    }
  }

  function watchTemplates(server: ViteDevServer): void {
    server.watcher.add(templateDir);
    // A new or removed .context.ts / stylesheet adds or removes an import.
    const onSiblingChange = (file: string): void => {
      const htmlFile = owningHtml(file);
      if (htmlFile) {
        void recompile(server, htmlFile);
      }
    };
    server.watcher.on('add', onSiblingChange);
    server.watcher.on('unlink', onSiblingChange);
  }

  return {
    name: 'rainwave-templates',

    async configResolved(config) {
      root = config.root;
      templateDir = path.resolve(root, options.templateDir ?? 'src/components');
      const rcFile = path.join(root, '.oxfmtrc.json');
      if (existsSync(rcFile)) {
        const rc = JSON.parse(await readFile(rcFile, 'utf8')) as Record<string, unknown>;
        delete rc.$schema;
        delete rc.ignorePatterns;
        formatConfig = rc;
      }
    },

    buildStart: compileAll,

    configureServer: watchTemplates,

    // A written .html isn't in the module graph, so Vite would reload the page
    // straight away, before the template is recompiled.  Recompile first, then
    // hand Vite the .template.ts module so it updates that instead; the
    // rewritten file is what actually reaches the browser.
    async hotUpdate({ file, type, server }) {
      if (type !== 'update' || this.environment.name !== 'client' || !isTemplateHtml(file)) {
        return undefined;
      }
      await recompile(server, file);
      const modules = this.environment.moduleGraph.getModulesByFile(
        file.slice(0, -'.html'.length) + TEMPLATE_SUFFIX,
      );
      return modules ? [...modules] : [];
    },
  };
}
