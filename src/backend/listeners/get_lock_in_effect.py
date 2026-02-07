def get_lock_in_effect(
    current_sid: int, lock: bool | None, lock_sid: int | None, lock_counter: int | None
) -> bool:
    return (
        lock == True
        and lock_sid is not None
        and lock_counter is not None
        and current_sid != lock_sid
        and lock_counter > 0
    )
