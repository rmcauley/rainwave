export interface RainwaveErrorObject {
  /** Equivalent HTTP error code. */
  code: number;
  /** Translation key to be used on the rainwave.cc website. Can be used as a result code. */
  tl_key: string;
  /** Text describing the error. Can be presented to users. */
  text: string;
}
