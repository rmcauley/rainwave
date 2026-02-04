def get_all_groups_list(sid: int) -> list[dict[str, Any]]:
    return db.c.fetch_all(
        "SELECT group_name AS name, r4_groups.group_id AS id "
        "FROM r4_group_sid "
        "JOIN r4_groups USING (group_id) "
        "WHERE sid = %s AND group_display = TRUE "
        "ORDER BY group_name ",
        (sid,),
    )
