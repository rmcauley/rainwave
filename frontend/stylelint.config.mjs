/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard-scss', 'stylelint-order'],
  overrides: [{ files: ['**/*Template.module.scss'], rules: { 'no-empty-source': null } }],
};
