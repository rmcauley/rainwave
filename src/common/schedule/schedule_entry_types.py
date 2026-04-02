from typing import Literal, TypedDict

ScheduleOneUpProducerType = Literal["OneUpProducer"]
SchedulePVPElectionType = Literal["PVPElection"]

ScheduleEntryType = ScheduleOneUpProducerType | SchedulePVPElectionType


class ScheduleEntryInsertRow(TypedDict):
    sched_start: int | None
    sched_end: int | None
    sched_type: ScheduleEntryType
    sched_name: str | None
    sched_url: str | None
    sid: int
    sched_timed: bool
    sched_creator_user_id: int | None
    sched_is_auto_ph: bool | None


class ScheduleEntryRow(ScheduleEntryInsertRow):
    sched_id: int
    sched_start_actual: int | None
    sched_end_actual: int | None
    sched_used: bool
