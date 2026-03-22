import typing

from api import fieldtypes, rainwave_dto
from api.exceptions import APIException
from api.handle_url import handle_api_url
from api.rainwave_return_key_to_open_api import RainwaveResponseKey

from api.handler_classes.auth_required_handler import AuthRequiredAPIHandler
from api.websocket.live_voting.live_voting import live_voting_broadcast_service
from common.cache.station_cache import cache_get_station
from common.db.cursor import get_cursor
from common.schedule.election.election import Election
from common.schedule.election.submit_vote import submit_vote
from common.schedule.timeline_types import TimelineOnStation
from common.schedule.update_live_voting import update_live_voting_cache


@handle_api_url("vote")
class SubmitVote(AuthRequiredAPIHandler):
    @property
    def return_name(self) -> RainwaveResponseKey:
        return "vote_result"

    sid_required = True
    tunein_required = True
    description = "Vote for a candidate in an election.  Cannot cancel/delete a vote.  If user has already voted, the vote will be changed to the submitted song."
    fields = {"entry_id": (fieldtypes.integer, True)}
    sync_across_sessions = True

    async def post(self):
        input = self.get_validated_input(rainwave_dto.Api4VotePostRequest)
        lock_count = 0
        voted = False
        elec_id = None
        timeline = typing.cast(
            TimelineOnStation | None, await cache_get_station(self.sid, "timeline")
        )
        if not timeline:
            raise APIException(
                "server_just_started",
                "Rainwave is Rebooting, Please Try Again in a Few Minutes",
                http_code=500,
            )

        for timeline_entry in timeline.upnext:
            lock_count += 1
            if isinstance(timeline_entry, Election):
                for entry in timeline_entry.entries:
                    if entry["entry_id"] == input.entry_id:
                        elec_id = timeline_entry.id
                        voted = await submit_vote(
                            self.user,
                            timeline_entry,
                            entry["entry_id"],
                            entry["song_id"],
                            lock_count,
                        )

            if not self.user.private_data["perks"]:
                break
        if voted and elec_id:
            self.response["vote_result"] = {
                "elec_id": elec_id,
                "entry_id": input.entry_id,
                "success": True,
                "text": self.locale.translate("vote_submitted"),
                "tl_key": "vote_submitted",
            }

            async with get_cursor() as cursor:
                live_voting = await update_live_voting_cache(cursor, self.sid, elec_id)
                if self.websocket_handling:
                    self.response["live_voting"] = live_voting
                live_voting_broadcast_service.publish_live_voting_updated(
                    self.sid,
                    self.websocket_uuid if self.websocket_handling else None,
                )
        else:
            self.response["vote_result"] = {
                "tl_key": "cannot_vote_for_this_now",
                "text": self.locale.translate("cannot_vote_for_this_now"),
                "success": False,
                "elec_id": elec_id,
                "entry_id": input.entry_id,
            }
