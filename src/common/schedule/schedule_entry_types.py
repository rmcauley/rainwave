from typing import Literal, TypedDict

ScheduleOneUpProducerType = Literal["OneUpProducer"]
SchedulePVPElectionType = Literal["PVPElection"]
SchedulePowerHourType = Literal["PowerHour"]
SchedulePVPHourType = Literal["PVPHour"]

ScheduleEntryType = (
    ScheduleOneUpProducerType
    | SchedulePVPElectionType
    | SchedulePowerHourType
    | SchedulePVPHourType
)


class ScheduleEntryInsertRow(TypedDict):
    sched_start: int | None
    sched_start_actual: int | None
    sched_end: int | None
    sched_end_actual: int | None
    sched_type: ScheduleEntryType
    sched_name: str | None
    sched_url: str | None
    sid: int
    sched_time: bool
    sched_used: bool
    sched_creator_user_id: int


class ScheduleEntryRow(ScheduleEntryInsertRow):
    sched_id: int
