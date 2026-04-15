import type { pulloutContext } from './pullout.context';

function pullout(context: pulloutContext) {
  const v1 = document.createDocumentFragment();

  const v2 = document.createElement('div');
  v2.setAttribute('id', `requests_positioner`);
  v1.appendChild(v2);

  const v3 = document.createElement('div');
  v3.setAttribute('id', `requests_grab_tag`);
  v2.appendChild(v3);

  return { $root: v1, requestsPullout: v2 };
}
export { pullout };
