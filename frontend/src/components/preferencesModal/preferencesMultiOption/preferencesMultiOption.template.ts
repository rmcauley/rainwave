import type { preferencesMultiOptionContext } from './preferencesMultiOption.context';
function preferencesMultiOptionTemplate(context: preferencesMultiOptionContext) {
  const v1 = document.createElement('div');
  v1.className = 'preferences-multi-option';
  const v2 = document.createElement('label');
  v2.appendChild(document.createTextNode(context.label));
  v1.appendChild(v2);
  const v3 = document.createElement('div');
  v1.appendChild(v3);
  const v4 = context.values.map((context) => {
    const v5 = document.createDocumentFragment();
    const v6 = document.createElement('div');
    v6.appendChild(document.createTextNode(context));
    v6.className = 'preferences-multi-option-value';
    v6.setAttribute('data-value', context);
    v5.appendChild(v6);
    v3.appendChild(v5);
    return { $root: v5, button: v6 };
  });
  return { $root: v1, values: v4 };
}
export { preferencesMultiOptionTemplate };
