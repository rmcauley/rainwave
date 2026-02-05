import type { RainwaveResponseTypes } from './responseTypes';

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
  response: Partial<RainwaveResponseTypes>;

  constructor(
    message: string,
    response: Partial<RainwaveResponseTypes>,
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
};
