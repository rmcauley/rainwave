const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', 'src');

function walk(dir, exts, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, exts, out);
      continue;
    }
    if (exts.some((ext) => entry.name.endsWith(ext))) {
      out.push(full);
    }
  }
}

function toKebab(value) {
  return value.replace(/_/g, '-');
}

function replaceOutsideTemplates(value) {
  return value.replace(/(\{\{[\s\S]*?\}\})|([^{}]+)/g, (match, templateExpr, plain) => {
    if (templateExpr) {return templateExpr;}
    
return toKebab(plain);
  });
}

function replaceStringLiterals(value) {
  return value.replace(/(['"`])((?:\\.|(?!\1)[\s\S])*)\1/g, (_match, quote, inner) => {
    return `${quote}${toKebab(inner)}${quote}`;
  });
}

function replaceHtml(text) {
  text = text.replace(/\bclass=(['"])([\s\S]*?)\1/g, (_full, quote, value) => {
    return `class=${quote}${replaceOutsideTemplates(value)}${quote}`;
  });

  text = text.replace(/\bdata-old-class=(['"])([\s\S]*?)\1/g, (_full, quote, value) => {
    return `data-old-class=${quote}${replaceStringLiterals(value)}${quote}`;
  });

  return text;
}

function replaceInMatches(text, regex) {
  return text.replace(regex, (full) => replaceStringLiterals(full));
}

function replaceJsTs(text) {
  text = replaceInMatches(
    text,
    /classList(?:\.(?:add|remove|toggle|contains)|\[[^\]]+\])\(([\s\S]*?)\)/g,
  );
  text = replaceInMatches(text, /className\s*=\s*([^;\n]+)/g);
  text = replaceInMatches(text, /getElementsByClassName\(([\s\S]*?)\)/g);
  text = replaceInMatches(text, /querySelector(?:All)?\(([\s\S]*?)\)/g);
  text = replaceInMatches(text, /setAttribute\((['"])class\1\s*,([\s\S]*?)\)/g);
  
return text;
}

const htmlFiles = [];
const jsTsFiles = [];

walk(root, ['.html'], htmlFiles);
walk(root, ['.js', '.ts'], jsTsFiles);

for (const file of htmlFiles) {
  const input = fs.readFileSync(file, 'utf8');
  const output = replaceHtml(input);
  if (output !== input) {
    fs.writeFileSync(file, output);
  }
}

for (const file of jsTsFiles) {
  const input = fs.readFileSync(file, 'utf8');
  const output = replaceJsTs(input);
  if (output !== input) {
    fs.writeFileSync(file, output);
  }
}

console.log(`updated ${htmlFiles.length} html files and ${jsTsFiles.length} js/ts files`);
