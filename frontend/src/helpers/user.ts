import { api } from '../rainwaveApi';

import type { RainwaveUser } from '../rainwaveApi/types';

let user: RainwaveUser = bootstrap.user as RainwaveUser;

function updateUser(newUser: RainwaveUser): void {
  user = newUser;
}

function getUser(): RainwaveUser {
  return user;
}

api.addEventListener('user', updateUser);

export { getUser };
