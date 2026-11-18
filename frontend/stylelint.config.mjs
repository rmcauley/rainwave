/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard', 'stylelint-order'],
  referenceFiles: ['src/theme.css'],
  rules: {
    'no-unknown-custom-properties': true,
  },
};
