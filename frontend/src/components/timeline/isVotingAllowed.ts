import { api } from '../../rainwaveApi/api';

function isVotingAllowed(): boolean {
  const voteAllowedUnderLock =
    !api.user.lock || (api.user.lock && api.user.lock_sid === api.user.sid);
  return api.user.tuned_in && voteAllowedUnderLock;
}

export { isVotingAllowed };
