from time import time as timestamp
from typing import TypedDict

from api.exceptions import APIException
from api.helpers.user_vote_cache import get_user_vote_cache, set_user_vote_cache
from common import log, stations
from common.db.cursor import get_tx_cursor
from common.schedule.election.election import Election
from common.schedule.election.insert_vote_into_history import insert_vote_into_history
from common.user.model.user_base import UserBase


class PreviousVoteRow(TypedDict):
    entry_id: int
    vote_id: int
    song_id: int


async def submit_vote(
    user: UserBase,
    election: Election,
    entry_id: int,
    song_id: int,
    lock_count: int,
) -> bool:
    async with get_tx_cursor() as cursor:
        # Subtract a previous vote from the song's total if there was one
        already_voted = False
        if user.is_anonymous():
            if (
                user.private_data["voted_entry"]
                and user.private_data["voted_entry"] == entry_id
            ):
                # immediately return and a success will be registered
                return True
            if user.private_data["voted_entry"]:
                already_voted = True if user.private_data["voted_entry"] else False
        else:
            previous_vote = await cursor.fetch_row(
                "SELECT entry_id, vote_id, song_id FROM r4_vote_history WHERE user_id = %s AND elec_id = %s",
                (user.id, election.id),
                row_type=PreviousVoteRow,
            )
            if previous_vote and previous_vote["entry_id"] == entry_id:
                # immediately return and a success will be registered
                return True
            elif previous_vote:
                already_voted = previous_vote["entry_id"]

        if already_voted:
            await cursor.update(
                "UPDATE r4_election_entries SET entry_votes = entry_votes + %s WHERE entry_id = %s",
                (-1, entry_id),
            )

        # If this is a new vote, we need to check to make sure the listener is not locked.
        if (
            not already_voted
            and user.private_data["lock"]
            and user.private_data["lock_sid"]
            and user.private_data["lock_sid"] != election.sid
        ):
            raise APIException(
                "user_locked",
                "User locked to %s for %s more song(s)."
                % (
                    stations.station_id_friendly[user.private_data["lock_sid"]],
                    user.private_data["lock_counter"],
                ),
            )

        # Issue the listener lock (will extend a lock if necessary)
        if not await user.lock_to_sid(cursor, election.sid, lock_count):
            log.warn(
                "vote",
                "Could not lock user: listener ID %s voting for entry ID %s, tried to lock for %s events."
                % (user.server_data["listener_id"], entry_id, lock_count),
            )
            raise APIException(
                "internal_error",
                "Internal server error.  User is now locked to station ID %s."
                % election.sid,
            )

        if user.is_anonymous():
            if not await cursor.update(
                "UPDATE r4_listeners SET listener_voted_entry = %s WHERE listener_id = %s",
                (entry_id, user.server_data["listener_id"]),
            ):
                log.warn(
                    "vote",
                    "Could not set voted_entry: listener ID %s voting for entry ID %s."
                    % (user.server_data["listener_id"], entry_id),
                )
                raise APIException("internal_error")
            user.private_data["voted_entry"] = entry_id
        else:
            if already_voted:
                await cursor.update(
                    "UPDATE r4_vote_history SET song_id = %s, entry_id = %s WHERE user_id = %s AND entry_id = %s",
                    (
                        song_id,
                        entry_id,
                        user.id,
                        already_voted,
                    ),
                )
            else:
                await insert_vote_into_history(
                    cursor, election.id, entry_id, user.id, song_id, election.sid
                )

                if user.server_data["radio_inactive"] or (
                    not user.server_data["radio_last_active"]
                    or user.server_data["radio_last_active"] < timestamp() - 3600
                ):
                    await cursor.update(
                        "UPDATE phpbb_users SET radio_inactive = FALSE, radio_last_active = %s WHERE user_id = %s",
                        (timestamp(), user.id),
                    )

        user_vote_cache = await get_user_vote_cache(user.id) or []
        found = False
        for voted in user_vote_cache:
            if voted[0] == election.id:
                found = True
                voted[1] = entry_id
        while len(user_vote_cache) > 5:
            user_vote_cache.pop(0)
        if not found:
            user_vote_cache.append([election.id, entry_id])
        await set_user_vote_cache(user.id, user_vote_cache)

        await cursor.update(
            "UPDATE r4_election_entries SET entry_votes = entry_votes + %s WHERE entry_id = %s",
            (entry_id,),
        )

        return True
