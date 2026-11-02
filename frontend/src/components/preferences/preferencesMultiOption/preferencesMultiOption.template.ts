import type { preferencesMultiOptionContext } from './preferencesMultiOption.context';
function preferencesMultiOptionTemplate(context: preferencesMultiOptionContext) {
  const v1 = document.createElement('div');
  v1.className = 'preferences-multi-option';
  const v2 = document.createElement('div');
  v2.className = 'preferences-multi-option-wrapper';
  v1.appendChild(v2);
  const v3 = document.createElement('div');
  v3.className = 'preferences-multi-option-floating-highlight';
  v2.appendChild(v3);
  const v4 = context.values.map((context) => {
    const v5 = document.createDocumentFragment();
    const v6 = document.createElement('span');
    v6.appendChild(document.createTextNode(context));
    v6.className = 'preferences-multi-option-value';
    v5.appendChild(v6);
    v2.appendChild(v5);
    return { $root: v5, link: v6 };
  });
  const v7 = document.createElement('label');
  v7.appendChild(document.createTextNode(context.label));
  v1.appendChild(v7);
  return { $root: v1, highlight: v3, values: v4 };
}
export { preferencesMultiOptionTemplate };
