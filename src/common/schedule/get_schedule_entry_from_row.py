from common.schedule.power_hours.power_hour import PowerHour
from common.schedule.schedule_entry_types import ScheduleEntryRow
from common.schedule.schedule_models.schedule_entry_base import ScheduleEntry


def get_schedule_entry_from_row(schedule_entry_row: ScheduleEntryRow) -> ScheduleEntry:
    if schedule_entry_row["sched_type"] == "OneUpProducer":
        return PowerHour(schedule_entry_row["sched_type"], schedule_entry_row)
    elif schedule_entry_row["sched_type"] == "PVPElection":
        return PowerHour(schedule_entry_row["sched_type"], schedule_entry_row)
    raise Exception(f"Unknown schedule entry type {schedule_entry_row['sched_type']}")
