import { RainwaveApi } from './rainwave';

const api = new RainwaveApi({
  apiKey: bootstrap.user.api_key,
  sid: bootstrap.user.sid,
  userId: bootstrap.user.id,
  initialUserState: bootstrap.user,
});

export { api };
