from psycopg import sql
from .cursor import RainwaveCursor, get_cursor


async def create_index(cursor: RainwaveCursor, table: str, columns: list[str]) -> None:
    name = "%s_%s_idx" % (table, "_".join(columns))
    await cursor.update("CREATE INDEX %s ON %s (%s)", (name, table, ",".join(columns)))


async def create_delete_fk(
    cursor: RainwaveCursor,
    linking_table: str,
    foreign_table: str,
    key: str,
    create_idx: bool = True,
    foreign_key: str | None = None,
) -> None:
    if not foreign_key:
        foreign_key = key
    if create_idx:
        await create_index(cursor, linking_table, [key])
    constraint_name = sql.Identifier(f"{linking_table}_{key}_fk")
    query = sql.SQL(
        "ALTER TABLE {linking_table} ADD CONSTRAINT {constraint_name} FOREIGN KEY ({key}) REFERENCES {foreign_table} ({foreign_key}) ON DELETE CASCADE"
    ).format(
        linking_table=linking_table,
        constraint_name=constraint_name,
        key=key,
        foreign_table=foreign_table,
        foreign_key=foreign_key,
    )
    await cursor.update(query)


async def create_null_fk(
    cursor: RainwaveCursor,
    linking_table: str,
    foreign_table: str,
    key: str,
    create_idx: bool = True,
    foreign_key: str | None = None,
) -> None:
    if not foreign_key:
        foreign_key = key
    if create_idx:
        await create_index(cursor, linking_table, [key])
    constraint_name = sql.Identifier(f"{linking_table}_{key}_fk")
    query = sql.SQL(
        "ALTER TABLE {linking_table} ADD CONSTRAINT {constraint_name} FOREIGN KEY ({key}) REFERENCES {foreign_table} ({foreign_key}) ON DELETE SET NULL"
    ).format(
        linking_table=linking_table,
        constraint_name=constraint_name,
        key=key,
        foreign_table=foreign_table,
        foreign_key=foreign_key,
    )
    await cursor.update(query)


async def create_tables() -> None:
    async with get_cursor() as cursor:
        trgrm_exists = await cursor.fetch_var(
            "SELECT extname FROM pg_extension WHERE extname = 'pg_trgm'", var_type=str
        )
        if not trgrm_exists or not trgrm_exists == "pg_trgm":
            try:
                await cursor.update("CREATE EXTENSION pg_trgm")
            except:
                print("Could not create trigram extension.")
                print(
                    "Please run 'CREATE EXTENSION pg_trgm;' as a superuser on the database."
                )
                print(
                    "You may also need to install the Postgres Contributions package. (postgres-contrib)"
                )
                raise

        # From: https://wiki.postgresql.org/wiki/First_%28aggregate%29
        # Used in rainwave/playlist.py
        first_exists = await cursor.fetch_var(
            "SELECT proname FROM pg_proc WHERE proname = 'first'", var_type=str
        )
        if not first_exists or first_exists != "first":
            await cursor.update(
                """
                -- Create a function that always returns the first non-NULL item
                CREATE OR REPLACE FUNCTION public.first_agg ( anyelement, anyelement )
                RETURNS anyelement LANGUAGE SQL IMMUTABLE STRICT AS $$
                        SELECT $1;
                $$;

                -- And then wrap an aggregate around it
                CREATE AGGREGATE public.FIRST (
                        sfunc    = public.first_agg,
                        basetype = anyelement,
                        stype    = anyelement
                );
            """
            )

        last_exists = await cursor.fetch_var(
            "SELECT proname FROM pg_proc WHERE proname = 'last'", var_type=str
        )
        if not last_exists or last_exists != "last":
            await cursor.update(
                """
                -- Create a function that always returns the last non-NULL item
                CREATE OR REPLACE FUNCTION public.last_agg ( anyelement, anyelement )
                RETURNS anyelement LANGUAGE SQL IMMUTABLE STRICT AS $$
                        SELECT $2;
                $$;

                -- And then wrap an aggregate around it
                CREATE AGGREGATE public.LAST (
                        sfunc    = public.last_agg,
                        basetype = anyelement,
                        stype    = anyelement
                );
            """
            )

        await cursor.update(
            " \
            CREATE TABLE phpbb_users( \
                user_id					SERIAL		PRIMARY KEY, \
                group_id				INT			DEFAULT 1, \
                username				TEXT 		DEFAULT 'Test', \
                user_new_privmsg		INT			DEFAULT 0, \
                user_avatar				TEXT		DEFAULT '', \
                user_avatar_type		TEXT	    , \
                user_colour             TEXT        DEFAULT 'FFFFFF', \
                user_rank               INT 	    DEFAULT 0, \
                user_regdate            INT         DEFAULT 0, \
                user_password           TEXT \
            )"
        )
        await cursor.update(
            "ALTER TABLE phpbb_users ADD radio_totalvotes		INTEGER		DEFAULT 0"
        )
        await cursor.update(
            "ALTER TABLE phpbb_users ADD radio_totalmindchange	INTEGER		DEFAULT 0"
        )
        await cursor.update(
            "ALTER TABLE phpbb_users ADD radio_totalratings	INTEGER		DEFAULT 0"
        )
        await cursor.update(
            "ALTER TABLE phpbb_users ADD radio_totalrequests	INTEGER		DEFAULT 0"
        )
        await cursor.update(
            "ALTER TABLE phpbb_users ADD radio_winningvotes	INTEGER		DEFAULT 0"
        )
        await cursor.update(
            "ALTER TABLE phpbb_users ADD radio_losingvotes		INTEGER		DEFAULT 0"
        )
        await cursor.update(
            "ALTER TABLE phpbb_users ADD radio_winningrequests	INTEGER		DEFAULT 0"
        )
        await cursor.update(
            "ALTER TABLE phpbb_users ADD radio_losingrequests	INTEGER		DEFAULT 0"
        )
        await cursor.update(
            "ALTER TABLE phpbb_users ADD radio_last_active		INTEGER		DEFAULT 0"
        )
        await cursor.update(
            "ALTER TABLE phpbb_users ADD radio_listenkey		TEXT		DEFAULT 'TESTKEY'"
        )
        await cursor.update(
            "ALTER TABLE phpbb_users ADD radio_inactive		BOOLEAN		DEFAULT TRUE"
        )
        await cursor.update(
            "ALTER TABLE phpbb_users ADD radio_requests_paused	BOOLEAN		DEFAULT FALSE"
        )
        await cursor.update(
            "ALTER TABLE phpbb_users ADD radio_username		TEXT		DEFAULT ''"
        )
        await cursor.update(
            "ALTER TABLE phpbb_users ADD discord_user_id		TEXT		DEFAULT ''"
        )

        await cursor.update(
            "CREATE TABLE phpbb_ranks(rank_id SERIAL PRIMARY KEY, rank_title TEXT)"
        )

        await cursor.update(
            " \
            CREATE TABLE r4_albums ( \
                album_id				SERIAL		PRIMARY KEY, \
                album_name				TEXT		NOT NULL, \
                album_name_searchable	TEXT 		NOT NULL, \
                album_added_on			INTEGER		DEFAULT EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) \
            )"
        )
        await cursor.update(
            "CREATE UNIQUE INDEX album_name_unique ON r4_albums (album_name)"
        )
        await cursor.update(
            "CREATE INDEX album_name_trgm_gin ON r4_albums USING GIN(album_name_searchable gin_trgm_ops)"
        )

        await cursor.update(
            " \
            CREATE TABLE r4_songs ( \
                song_id						SERIAL		PRIMARY KEY, \
                album_id 					INTEGER, \
                song_origin_sid				SMALLINT	NOT NULL, \
                song_verified				BOOLEAN		DEFAULT TRUE, \
                song_scanned				BOOLEAN		DEFAULT TRUE, \
                song_filename				TEXT		NOT NULL, \
                song_title					TEXT		NOT NULL, \
                song_title_searchable		TEXT		NOT NULL, \
                song_artist_tag				TEXT		, \
                song_url					TEXT		, \
                song_link_text				TEXT		, \
                song_length					SMALLINT	NOT NULL, \
                song_track_number			SMALLINT	, \
                song_disc_number			SMALLINT	, \
                song_year				    SMALLINT	, \
                song_added_on				INTEGER		DEFAULT EXTRACT(EPOCH FROM CURRENT_TIMESTAMP), \
                song_rating					REAL		DEFAULT 0, \
                song_rating_count			INTEGER		DEFAULT 0, \
                song_fave_count				INTEGER		DEFAULT 0, \
                song_request_count			INT			DEFAULT 0, \
                song_cool_multiply			REAL		DEFAULT 1, \
                song_cool_override			INTEGER		, \
                song_file_mtime				INTEGER		NOT NULL, \
                song_replay_gain			TEXT 		, \
                song_vote_count				INTEGER		DEFAULT 0, \
                song_votes_seen				INTEGER		DEFAULT 0, \
                song_vote_share				REAL 		, \
                song_artist_parseable		TEXT \
            )"
        )
        await create_index(cursor, "r4_songs", ["song_verified"])
        await create_index(cursor, "r4_songs", ["song_rating"])
        await create_null_fk(cursor, "r4_songs", "r4_albums", "album_id")
        await cursor.update(
            "CREATE INDEX song_title_trgm_gin ON r4_songs USING GIN(song_title_searchable gin_trgm_ops)"
        )
        await cursor.update(
            "CREATE UNIQUE INDEX song_filename_unique ON r4_songs (song_filename)"
        )

        await cursor.update(
            " \
            CREATE TABLE r4_song_sid ( \
                song_id						INTEGER		NOT NULL, \
                sid							SMALLINT	NOT NULL, \
                song_cool					BOOLEAN		DEFAULT FALSE, \
                song_cool_end				INTEGER		DEFAULT 0, \
                song_elec_appearances		INTEGER		DEFAULT 0, \
                song_elec_last				INTEGER		DEFAULT 0, \
                song_elec_blocked			BOOLEAN 	DEFAULT FALSE, \
                song_elec_blocked_num		SMALLINT	DEFAULT 0, \
                song_elec_blocked_by		TEXT		, \
                song_played_last			INTEGER		, \
                song_exists					BOOLEAN		DEFAULT TRUE, \
                song_request_only			BOOLEAN		DEFAULT FALSE, \
                song_request_only_end		INTEGER		DEFAULT 0, \
                PRIMARY KEY (song_id, sid) \
            )"
        )

        await create_index(cursor, "r4_song_sid", ["sid"])
        await create_index(cursor, "r4_song_sid", ["song_cool"])
        await create_index(cursor, "r4_song_sid", ["song_elec_blocked"])
        await create_index(cursor, "r4_song_sid", ["song_exists"])
        await create_index(cursor, "r4_song_sid", ["song_request_only"])
        await create_delete_fk(cursor, "r4_song_sid", "r4_songs", "song_id")

        await cursor.update(
            " \
            CREATE TABLE r4_song_ratings ( \
                song_id					INTEGER		NOT NULL, \
                user_id					INTEGER		NOT NULL, \
                song_rating_user			REAL		, \
                song_rated_at				INTEGER		, \
                song_rated_at_rank			INTEGER		, \
                song_rated_at_count			INTEGER		, \
                song_fave				BOOLEAN, \
                PRIMARY KEY (user_id, song_id) \
            )"
        )

        await create_index(cursor, "r4_song_ratings", ["song_fave"])
        await create_delete_fk(cursor, "r4_song_ratings", "r4_songs", "song_id")
        await create_delete_fk(cursor, "r4_song_ratings", "phpbb_users", "user_id")

        await cursor.update(
            " \
            CREATE TABLE r4_album_sid ( \
                album_exists				BOOLEAN		DEFAULT TRUE, \
                album_id					INTEGER		NOT NULL, \
                sid							SMALLINT	NOT NULL, \
                album_song_count			SMALLINT	DEFAULT 0, \
                album_played_last			INTEGER		DEFAULT 0, \
                album_requests_pending		BOOLEAN, \
                album_cool					BOOLEAN		DEFAULT FALSE, \
                album_cool_multiply			REAL		DEFAULT 1, \
                album_cool_override			INTEGER		, \
                album_cool_lowest			INTEGER		DEFAULT 0, \
                album_updated				INTEGER		DEFAULT 0, \
                album_elec_last				INTEGER		DEFAULT 0, \
                album_rating				REAL		NOT NULL DEFAULT 0, \
                album_rating_count			INTEGER		DEFAULT 0, \
                album_request_count			INTEGER		DEFAULT 0, \
                album_fave_count			INTEGER		DEFAULT 0, \
                album_vote_count			INTEGER		DEFAULT 0, \
                album_votes_seen			INTEGER		DEFAULT 0, \
                album_vote_share			REAL 		,\
                album_newest_song_time		INTEGER		DEFAULT 0, \
                album_art_url               TEXT, \
                PRIMARY KEY (album_id, sid) \
            )"
        )
        await create_index(cursor, "r4_album_sid", ["album_rating"])
        await create_index(cursor, "r4_album_sid", ["album_request_count"])
        await create_index(cursor, "r4_album_sid", ["album_exists"])
        await create_index(cursor, "r4_album_sid", ["sid"])
        await create_index(cursor, "r4_album_sid", ["album_requests_pending"])
        await create_index(cursor, "r4_album_sid", ["album_exists", "sid"])
        await create_delete_fk(cursor, "r4_album_sid", "r4_albums", "album_id")

        await cursor.update(
            """
            ALTER TABLE r4_album_sid
            ADD COLUMN album_updated_at TIMESTAMP NOT NULL DEFAULT NOW();

            CREATE OR REPLACE FUNCTION set_album_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
            NEW.album_updated_at = NOW();
            RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            CREATE TRIGGER r4_album_sid_set_updated_at
            BEFORE UPDATE ON r4_album_sid
            FOR EACH ROW
            EXECUTE FUNCTION set_album_updated_at();
        """
        )

        await cursor.update(
            " \
            CREATE TABLE r4_album_ratings ( \
                album_id				INTEGER		NOT NULL, \
                sid 					SMALLINT	NOT NULL, \
                user_id					INTEGER		NOT NULL, \
                album_rating_user		REAL		, \
                album_rating_complete	BOOLEAN		DEFAULT FALSE \
                ) PRIMARY KEY (user_id, album_id, sid) "
        )
        await create_index(cursor, "r4_album_ratings", ["album_id", "sid"])
        await create_delete_fk(
            cursor, "r4_album_ratings", "r4_albums", "album_id", create_idx=False
        )
        await create_delete_fk(
            cursor, "r4_album_ratings", "phpbb_users", "user_id", create_idx=False
        )

        await cursor.update(
            " \
            CREATE TABLE r4_album_faves ( \
                album_id				INTEGER		NOT NULL, \
                user_id					INTEGER		NOT NULL, \
                album_fave				BOOLEAN \
            ) PRIMARY KEY (user_id, album_id, sid) "
        )
        await create_index(cursor, "r4_album_faves", ["album_fave"])
        await create_delete_fk(
            cursor, "r4_album_faves", "r4_albums", "album_id", create_idx=False
        )
        await create_delete_fk(
            cursor, "r4_album_faves", "phpbb_users", "user_id", create_idx=False
        )

        await cursor.update(
            " \
            CREATE TABLE r4_artists		( \
                artist_id				SERIAL		PRIMARY KEY, \
                artist_name				TEXT		, \
                artist_name_searchable	TEXT 		NOT NULL \
            )"
        )
        await cursor.update(
            "CREATE UNIQUE INDEX artist_name_unique ON r4_artists (artist_name)"
        )
        await cursor.update(
            "CREATE INDEX artist_name_trgm_gin ON r4_artists USING GIN(artist_name_searchable gin_trgm_ops)"
        )

        await cursor.update(
            " \
            CREATE TABLE r4_song_artist	( \
                song_id					INTEGER		NOT NULL, \
                artist_id				INTEGER		NOT NULL, \
                artist_order			SMALLINT    DEFAULT 0, \
                PRIMARY KEY (artist_id, song_id) \
            )"
        )

        await create_delete_fk(cursor, "r4_song_artist", "r4_songs", "song_id")
        await create_delete_fk(cursor, "r4_song_artist", "r4_artists", "artist_id")

        await cursor.update(
            " \
            CREATE TABLE r4_groups ( \
                group_id				SERIAL		PRIMARY KEY, \
                group_name				TEXT		, \
                group_name_searchable	TEXT 		NOT NULL, \
                group_elec_block		SMALLINT, \
                group_cool_time			SMALLINT	DEFAULT 900 \
            )"
        )

        await cursor.update(
            "CREATE UNIQUE INDEX group_name_unique ON r4_groups (group_name)"
        )

        await cursor.update(
            " \
            CREATE TABLE r4_song_group ( \
                song_id					INTEGER		NOT NULL, \
                group_id				INTEGER		NOT NULL, \
                PRIMARY KEY (group_id, song_id) \
            )"
        )

        await create_delete_fk(cursor, "r4_song_group", "r4_songs", "song_id")
        await create_delete_fk(cursor, "r4_song_group", "r4_groups", "group_id")

        await cursor.update(
            " \
            CREATE TABLE r4_group_sid( \
                group_id 				INT, \
                sid 					SMALLINT	NOT NULL, \
                group_display			BOOLEAN		DEFAULT FALSE \
            )"
        )
        await create_index(cursor, "r4_group_sid", ["group_display"])
        await create_delete_fk(cursor, "r4_group_sid", "r4_groups", "group_id")
        await cursor.update(
            "CREATE UNIQUE INDEX r4_group_sid_unique ON r4_group_sid (group_id, sid)"
        )

        await cursor.update(
            " \
            CREATE TABLE r4_schedule ( \
                sched_id				SERIAL		PRIMARY KEY, \
                sched_start				INTEGER		, \
                sched_start_actual		INTEGER		, \
                sched_end				INTEGER		, \
                sched_end_actual		INTEGER		, \
                sched_type				TEXT		, \
                sched_name				TEXT		, \
                sched_url				TEXT 		, \
                sid						SMALLINT	NOT NULL, \
                sched_public			BOOLEAN		DEFAULT TRUE, \
                sched_timed				BOOLEAN		DEFAULT TRUE, \
                sched_in_progress		BOOLEAN		DEFAULT FALSE, \
                sched_used				BOOLEAN		DEFAULT FALSE, \
                sched_use_crossfade		BOOLEAN		DEFAULT TRUE, \
                sched_use_tag_suffix	BOOLEAN		DEFAULT TRUE, \
                sched_creator_user_id	INT \
            )"
        )
        await create_index(cursor, "r4_schedule", ["sched_used"])
        await create_index(cursor, "r4_schedule", ["sched_in_progress"])
        await create_index(cursor, "r4_schedule", ["sched_public"])
        await create_index(cursor, "r4_schedule", ["sched_start_actual"])

        await cursor.update("CREATE SEQUENCE r4_timeline_id_seq")

        await cursor.update(
            " \
            CREATE TABLE r4_elections ( \
                elec_id					BIGINT		PRIMARY KEY, \
                elec_used				BOOLEAN		DEFAULT FALSE, \
                elec_in_progress		BOOLEAN		DEFAULT FALSE, \
                elec_start_actual		INTEGER		, \
                elec_type				TEXT		, \
                elec_priority			BOOLEAN		DEFAULT FALSE, \
                sid						SMALLINT	NOT NULL, \
                sched_id 				INT 		 \
            )"
        )
        await cursor.update(
            "ALTER TABLE r4_elections ALTER COLUMN elec_id SET DEFAULT nextval('r4_timeline_id_seq')"
        )
        await create_index(cursor, "r4_elections", ["elec_id"])
        await create_index(cursor, "r4_elections", ["elec_used"])
        await create_index(cursor, "r4_elections", ["sid"])
        await create_delete_fk(cursor, "r4_elections", "r4_schedule", "sched_id")

        await cursor.update(
            " \
            CREATE TABLE r4_election_entries ( \
                entry_id				SERIAL		PRIMARY KEY, \
                song_id					INTEGER		NOT NULL, \
                elec_id					INTEGER		NOT NULL, \
                entry_type				SMALLINT	DEFAULT 2, \
                entry_position			SMALLINT	, \
                entry_votes				SMALLINT	DEFAULT 0 \
            )"
        )

        await create_delete_fk(cursor, "r4_election_entries", "r4_songs", "song_id")
        await create_delete_fk(cursor, "r4_election_entries", "r4_elections", "elec_id")

        await cursor.update(
            " \
            CREATE TABLE r4_one_ups ( \
                one_up_id				BIGINT		PRIMARY KEY, \
                sched_id				INTEGER		NOT NULL, \
                song_id					INTEGER		NOT NULL, \
                one_up_order			SMALLINT	, \
                one_up_used				BOOLEAN		DEFAULT FALSE, \
                one_up_queued			BOOLEAN		DEFAULT FALSE, \
                one_up_sid				SMALLINT	NOT NULL \
            )"
        )
        await cursor.update(
            "ALTER TABLE r4_one_ups ALTER COLUMN one_up_id SET DEFAULT nextval('r4_timeline_id_seq')"
        )

        await create_delete_fk(cursor, "r4_one_ups", "r4_schedule", "sched_id")
        await create_delete_fk(cursor, "r4_one_ups", "r4_songs", "song_id")

        await cursor.update(
            " \
            CREATE TABLE r4_listeners ( \
                listener_id				SERIAL		PRIMARY KEY, \
                sid						SMALLINT	NOT NULL, \
                listener_ip				TEXT		, \
                listener_relay			TEXT		, \
                listener_agent			TEXT		, \
                listener_icecast_id		INTEGER		NOT NULL, \
                listener_lock			BOOLEAN		DEFAULT FALSE, \
                listener_lock_sid		SMALLINT	, \
                listener_lock_counter	SMALLINT	DEFAULT 0, \
                listener_purge			BOOLEAN		DEFAULT FALSE, \
                listener_voted_entry	INTEGER		, \
                listener_key            TEXT        , \
                user_id					INTEGER		DEFAULT 1 \
            )"
        )
        await create_index(cursor, "r4_listeners", ["sid"])

        await create_delete_fk(cursor, "r4_listeners", "phpbb_users", "user_id")

        await cursor.update(
            " \
            CREATE TABLE r4_listener_counts ( \
                lc_time					INTEGER		DEFAULT EXTRACT(EPOCH FROM CURRENT_TIMESTAMP), \
                sid						SMALLINT	NOT NULL, \
                lc_guests				SMALLINT	, \
                lc_users				SMALLINT	, \
                lc_users_active				SMALLINT	, \
                lc_guests_active			SMALLINT	\
            )"
        )
        await create_index(cursor, "r4_listener_counts", ["lc_time"])
        await create_index(cursor, "r4_listener_counts", ["sid"])

        await cursor.update(
            " \
            CREATE TABLE r4_donations ( \
                donation_id				SERIAL		PRIMARY KEY, \
                user_id					INTEGER		, \
                donation_amount			REAL		, \
                donation_message		TEXT		, \
                donation_private		BOOLEAN		DEFAULT TRUE \
            )"
        )

        await cursor.update(
            " \
            CREATE TABLE r4_request_store ( \
                reqstor_id				SERIAL		PRIMARY KEY, \
                reqstor_order			SMALLINT	DEFAULT 32766, \
                user_id					INTEGER		NOT NULL, \
                song_id					INTEGER		NOT NULL, \
                sid 					SMALLINT	NOT NULL \
            )"
        )

        await create_delete_fk(cursor, "r4_request_store", "phpbb_users", "user_id")
        await create_delete_fk(cursor, "r4_request_store", "r4_songs", "song_id")

        await cursor.update(
            " \
            CREATE TABLE r4_request_line ( \
                user_id					INTEGER		NOT NULL, \
                sid					SMALLINT	NOT NULL, \
                line_wait_start				INTEGER		DEFAULT EXTRACT(EPOCH FROM CURRENT_TIMESTAMP), \
                line_expiry_tune_in			INTEGER		, \
                line_expiry_election			INTEGER , \
                line_has_had_valid              BOOLEAN DEFAULT FALSE \
            )"
        )

        await create_index(cursor, "r4_request_line", ["sid"])
        await create_index(cursor, "r4_request_line", ["line_wait_start"])
        await create_delete_fk(cursor, "r4_request_line", "phpbb_users", "user_id")
        await cursor.update(
            "ALTER TABLE r4_request_line ADD CONSTRAINT unique_user_id UNIQUE (user_id)"
        )

        await cursor.update(
            " \
            CREATE TABLE r4_request_history ( \
                request_id				SERIAL		PRIMARY KEY, \
                user_id					INTEGER		NOT NULL, \
                song_id					INTEGER		NOT NULL, \
                request_fulfilled_at			INTEGER		DEFAULT EXTRACT(EPOCH FROM CURRENT_TIMESTAMP), \
                request_wait_time			INTEGER		, \
                request_line_size			INTEGER		, \
                request_at_count			INTEGER		, \
                sid                         SMALLINT    \
            )"
        )

        await create_delete_fk(cursor, "r4_request_history", "r4_songs", "song_id")
        await create_delete_fk(cursor, "r4_request_history", "phpbb_users", "user_id")

        await cursor.update(
            " \
            CREATE TABLE r4_vote_history ( \
                vote_id					SERIAL		PRIMARY KEY, \
                vote_time				INTEGER		DEFAULT EXTRACT(EPOCH FROM CURRENT_TIMESTAMP), \
                elec_id					INTEGER		, \
                user_id					INTEGER		NOT NULL, \
                song_id					INTEGER		NOT NULL, \
                vote_at_rank			INTEGER		, \
                vote_at_count			INTEGER		, \
                entry_id				INTEGER		, \
                sid  					SMALLINT \
            )"
        )

        await create_index(cursor, "r4_vote_history", ["sid"])
        await create_null_fk(
            cursor, "r4_vote_history", "r4_election_entries", "entry_id"
        )
        await create_null_fk(cursor, "r4_vote_history", "r4_elections", "elec_id")
        await create_delete_fk(cursor, "r4_vote_history", "r4_songs", "song_id")
        await create_delete_fk(cursor, "r4_vote_history", "phpbb_users", "user_id")

        await cursor.update(
            " \
            CREATE TABLE r4_api_keys ( \
                api_id					SERIAL		PRIMARY KEY, \
                user_id					INTEGER		NOT NULL, \
                api_key					VARCHAR(10) , \
                api_expiry				INTEGER		, \
                api_key_listen_key      TEXT        \
            )"
        )

        await create_index(cursor, "r4_api_keys", ["api_key"])
        await create_delete_fk(cursor, "r4_api_keys", "phpbb_users", "user_id")

        await cursor.update(
            " \
            CREATE TABLE r4_song_history ( \
                songhist_id				SERIAL		PRIMARY KEY, \
                songhist_time			INTEGER		DEFAULT EXTRACT(EPOCH FROM CURRENT_TIMESTAMP), \
                sid						SMALLINT	NOT NULL, \
                song_id					INTEGER		NOT NULL \
            )"
        )
        await create_index(cursor, "r4_song_history", ["sid"])
        await create_delete_fk(cursor, "r4_song_history", "r4_songs", "song_id")
