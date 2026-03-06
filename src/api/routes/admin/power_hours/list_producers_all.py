@handle_api_url("admin/list_producers_all")
class ListProducersAll(APIHandler):
    return_name = "producers"
    admin_required = True
    sid_required = False

    def post(self):
        self.append(
            self.return_name,
            await cursor.fetch_all(
                """
                SELECT
                    sched_type as type,
                    sched_id AS id,
                    sched_name AS name,
                    sched_start AS start,
                    sched_end AS end,
                    sched_url AS url,
                    sid,
                    ROUND((sched_end - sched_start) / 60) AS sched_length_minutes,
                    COALESCE(radio_username, username) AS username
                FROM r4_schedule
                    LEFT JOIN phpbb_users ON (
                        sched_dj_user_id = user_id
                    )
                WHERE sched_used = FALSE
                    AND sched_start >= %s
                ORDER BY sched_start
""",
                (timestamp(),),
            ),
        )

        self.append(
            self.return_name + "_past",
            await cursor.fetch_all(
                """
                SELECT
                    sched_type as type,
                    sched_id AS id,
                    sched_name AS name,
                    sched_start AS start,
                    sched_end AS end,
                    sched_url AS url,
                    sid,
                    ROUND((sched_end - sched_start) / 60) AS sched_length_minutes,
                    COALESCE(radio_username, username) AS username
                FROM r4_schedule
                    LEFT JOIN phpbb_users ON (
                        sched_dj_user_id = user_id
                    )
                WHERE sched_type != 'PVPElectionProducer'
                    AND sched_start > %s
                    AND sched_start < %s
                ORDER BY sched_start DESC
""",
                (timestamp() - (86400 * 26), timestamp()),
            ),
        )
