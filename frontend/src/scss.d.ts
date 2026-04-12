declare module '*.module.scss' {
  const classes: Record<string, string>;
  export default classes;
}

declare module '*.scss' {
  const stylesheet: string;
  export default stylesheet;
}
