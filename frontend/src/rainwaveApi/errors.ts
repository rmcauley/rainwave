import type { components } from './rainwave-openapi';

class RainwaveSDKInternalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RainwaveSDKInternalError';
  }
}

class RainwaveSDKUsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RainwaveSDKUsageError';
  }
}

class RainwaveSDKInvalidRatingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RainwaveSDKInvalidRatingError';
  }
}

class RainwaveSDKDisconnectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RainwaveSDKDisconnectedError';
  }
}

class RainwaveError extends Error {
  key: string;
  text: string;
  response: Partial<components['schemas']>;

  constructor(
    message: string,
    response: Partial<components['schemas']>,
    key: string,
    text: string,
  ) {
    super(message);
    this.name = 'RainwaveError';
    this.response = response;
    this.key = key;
    this.text = text;
  }
}

export {
  RainwaveSDKUsageError,
  RainwaveSDKInvalidRatingError,
  RainwaveSDKDisconnectedError,
  RainwaveError,
  RainwaveSDKInternalError,
};
