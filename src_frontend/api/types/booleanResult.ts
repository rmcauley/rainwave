export interface BooleanResult {
  /** True if operation succeeded, false if it was not successful. */
  success: boolean;
  /** Translation key to be used on the rainwave.cc website. Can be used as a result code. */
  tl_key: string;
  /** Text describing the result. Can be presented to users. */
  text: string;
}
