import { RainwaveApi } from './rainwave';

const api = new RainwaveApi({
  apiKey: bootstrap.user.api_key,
  sid: bootstrap.user.sid,
  userId: bootstrap.user.id,
  url: '/api4/websocket',
});

export { api };
