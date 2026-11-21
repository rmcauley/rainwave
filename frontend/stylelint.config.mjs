/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard', 'stylelint-order'],
  ignoreFiles: ['**/*.old.scss'],
  referenceFiles: ['src/theme.css'],
  rules: {
    'no-unknown-custom-properties': true,
  },
};
