import psycopg2
import psycopg2.extras
import time

from src_backend.config import config
from libs import log


class DatabaseDisconnectedError(Exception):
    pass


class PostgresCursor(psycopg2.extras.RealDictCursor):
    in_tx = False
    auto_retry = True
    disconnected = False

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.in_tx = False
        self.auto_retry = True
        self.disconnected = False

    def execute(self, *args, **kwargs):
        if self.disconnected:
            raise DatabaseDisconnectedError

        try:
            return super().execute(*args, **kwargs)
        except connection_errors as e:
            if self.auto_retry:
                log.exception("psycopg", "Psycopg exception", e)
                close()
                connect(auto_retry=self.auto_retry)
                global c
                return c.execute(*args, **kwargs)
            else:
                raise

    def fetch_var(self, query, params=None):
        self.execute(query, params)
        if self.rowcount <= 0 or not self.rowcount:
            return None
        r = self.fetchone()
        if not r:
            return None
        return r[next(iter(r.keys()))]

    def fetch_row(self, query, params=None):
        self.execute(query, params)
        if self.rowcount <= 0 or not self.rowcount:
            return None
        return self.fetchone()

    def fetch_all(self, query, params=None):
        self.execute(query, params)
        if self.rowcount <= 0 or not self.rowcount:
            return []
        return self.fetchall()

    def fetch_list(self, query, params=None) -> list:
        self.execute(query, params)
        if self.rowcount <= 0 or not self.rowcount:
            return []
        arr = []
        row = self.fetchone()
        if not row:
            return []
        col = next(iter(row.keys()))
        arr.append(row[col])
        for row in self.fetchall():
            arr.append(row[col])
        return arr

    def update(self, query, params=None):
        self.execute(query, params)
        return self.rowcount

    def get_next_id(self, table, column):
        return self.fetch_var(
            "SELECT nextval('" + table + "_" + column + "_seq'::regclass)"
        )

    def create_delete_fk(
        self, linking_table, foreign_table, key, create_idx=True, foreign_key=None
    ):
        if not foreign_key:
            foreign_key = key
        if create_idx:
            self.create_idx(linking_table, key)
        self.execute(
            "ALTER TABLE %s ADD CONSTRAINT %s_%s_fk FOREIGN KEY (%s) REFERENCES %s (%s) ON DELETE CASCADE"
            % (linking_table, linking_table, key, key, foreign_table, foreign_key)
        )

    def create_null_fk(
        self, linking_table, foreign_table, key, create_idx=True, foreign_key=None
    ):
        if not foreign_key:
            foreign_key = key
        if create_idx:
            self.create_idx(linking_table, key)
        self.execute(
            "ALTER TABLE %s ADD CONSTRAINT %s_%s_fk FOREIGN KEY (%s) REFERENCES %s (%s) ON DELETE SET NULL"
            % (linking_table, linking_table, key, key, foreign_table, foreign_key)
        )

    def create_idx(self, table, *args):
        name = "%s_%s_idx" % (table, "_".join(map(str, args)))
        columns = ",".join(map(str, args))
        self.execute("CREATE INDEX %s ON %s (%s)" % (name, table, columns))

    def start_transaction(self):
        if not self.in_tx:
            return
        self.execute("START TRANSACTION")
        self.in_tx = True

    def commit(self):
        if not self.in_tx:
            return
        self.execute("COMMIT")
        self.in_tx = False

    def rollback(self):
        self.execute("ROLLBACK")
        self.in_tx = False


# Ignoring type because we expect a crash if these don't exist anyway.
# App won't run without the cursor and connection established.
c: PostgresCursor = None  # type: ignore
connection: psycopg2.extensions.connection = None  # type: ignore
connection_errors = (psycopg2.OperationalError, psycopg2.InterfaceError)


def connect(auto_retry=True, retry_only_this_time=False):
    global connection
    global c

    if connection and c and not c.closed:
        return True

    name = config.get("db_name")
    host = config.get("db_host")
    port = config.get("db_port")
    user = config.get("db_user")
    password = config.get("db_password")

    psycopg2.extensions.register_type(psycopg2.extensions.UNICODE)
    psycopg2.extensions.register_type(psycopg2.extensions.UNICODEARRAY)
    base_connstr = "sslmode=disable "
    if host:
        base_connstr += "host=%s " % host
    if port:
        base_connstr += "port=%s " % port
    if user:
        base_connstr += "user=%s " % user
    if password:
        base_connstr += "password=%s " % password
    connected = False
    while not connected:
        try:
            connection = psycopg2.connect(
                base_connstr + ("dbname=%s" % name), connect_timeout=1
            )
            connection.set_isolation_level(
                psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT
            )
            connection.autocommit = True
            c = connection.cursor(cursor_factory=PostgresCursor)
            c.auto_retry = auto_retry
            connected = True
        except connection_errors as e:
            log.exception("psycopg", "Psycopg2 exception", e)
            if auto_retry or retry_only_this_time:
                time.sleep(1)
            else:
                raise
    return True


def close():
    global connection
    global c

    if c:
        # forgot to commit?  too bad.
        if c.in_tx:
            log.critical("txopen", "Forgot to close a transaction!  Rolling back!")
            c.rollback()
        c.close()
    if connection:
        connection.close()
    c = None  # type: ignore
    connection = None  # type: ignore

    return True


def connection_keepalive():
    if c.disconnected:
        connect(auto_retry=False)

    try:
        c.fetch_var("SELECT 1")
    except connection_errors:
        c.disconnected = True
        connect(auto_retry=False)


def create_tables():
    trgrm_exists = c.fetch_var(
        "SELECT extname FROM pg_extension WHERE extname = 'pg_trgm'"
    )
    if not trgrm_exists or not trgrm_exists == "pg_trgm":
        try:
            c.update("CREATE EXTENSION pg_trgm")
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
    first_exists = c.fetch_var("SELECT proname FROM pg_proc WHERE proname = 'first'")
    if not first_exists or first_exists != "first":
        c.update(
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

    last_exists = c.fetch_var("SELECT proname FROM pg_proc WHERE proname = 'last'")
    if not last_exists or last_exists != "last":
        c.update(
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

    c.update(
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
    c.update("ALTER TABLE phpbb_users ADD radio_totalvotes		INTEGER		DEFAULT 0")
    c.update("ALTER TABLE phpbb_users ADD radio_totalmindchange	INTEGER		DEFAULT 0")
    c.update("ALTER TABLE phpbb_users ADD radio_totalratings	INTEGER		DEFAULT 0")
    c.update("ALTER TABLE phpbb_users ADD radio_totalrequests	INTEGER		DEFAULT 0")
    c.update("ALTER TABLE phpbb_users ADD radio_winningvotes	INTEGER		DEFAULT 0")
    c.update("ALTER TABLE phpbb_users ADD radio_losingvotes		INTEGER		DEFAULT 0")
    c.update("ALTER TABLE phpbb_users ADD radio_winningrequests	INTEGER		DEFAULT 0")
    c.update("ALTER TABLE phpbb_users ADD radio_losingrequests	INTEGER		DEFAULT 0")
    c.update("ALTER TABLE phpbb_users ADD radio_last_active		INTEGER		DEFAULT 0")
    c.update("ALTER TABLE phpbb_users ADD radio_listenkey		TEXT		DEFAULT 'TESTKEY'")
    c.update("ALTER TABLE phpbb_users ADD radio_inactive		BOOLEAN		DEFAULT TRUE")
    c.update("ALTER TABLE phpbb_users ADD radio_requests_paused	BOOLEAN		DEFAULT FALSE")
    c.update("ALTER TABLE phpbb_users ADD radio_username		TEXT		DEFAULT ''")
    c.update("ALTER TABLE phpbb_users ADD discord_user_id		TEXT		DEFAULT ''")

    c.update(
        "CREATE TABLE phpbb_sessions("
        "session_user_id		INT,"
        "session_id				TEXT,"
        "session_last_visit		INT,"
        "session_page			TEXT)"
    )

    c.update("CREATE TABLE phpbb_session_keys(key_id TEXT, user_id INT)")

    c.update("CREATE TABLE phpbb_ranks(rank_id SERIAL PRIMARY KEY, rank_title TEXT)")

    c.update(
        " \
		CREATE TABLE r4_albums ( \
			album_id				SERIAL		PRIMARY KEY, \
			album_name				TEXT		, \
			album_name_searchable	TEXT 		NOT NULL, \
			album_year				SMALLINT, \
			album_added_on			INTEGER		DEFAULT EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) \
		)"
    )
    c.update(
        "CREATE INDEX album_name_trgm_gin ON r4_albums USING GIN(album_name_searchable gin_trgm_ops)"
    )

    c.update(
        " \
		CREATE TABLE r4_songs ( \
			song_id						SERIAL		PRIMARY KEY, \
			album_id 					INTEGER, \
			song_origin_sid				SMALLINT	NOT NULL, \
			song_verified				BOOLEAN		DEFAULT TRUE, \
			song_scanned				BOOLEAN		DEFAULT TRUE, \
			song_filename				TEXT		, \
			song_title					TEXT		, \
			song_title_searchable		TEXT		NOT NULL, \
			song_artist_tag				TEXT		, \
			song_url					TEXT		, \
			song_link_text				TEXT		, \
			song_length					SMALLINT	, \
			song_track_number			SMALLINT	, \
			song_disc_number			SMALLINT	, \
			song_year				SMALLINT	, \
			song_added_on				INTEGER		DEFAULT EXTRACT(EPOCH FROM CURRENT_TIMESTAMP), \
			song_rating					REAL		DEFAULT 0, \
			song_rating_count			INTEGER		DEFAULT 0, \
			song_fave_count				INTEGER		DEFAULT 0, \
			song_request_count			INT			DEFAULT 0, \
			song_cool_multiply			REAL		DEFAULT 1, \
			song_cool_override			INTEGER		, \
			song_file_mtime				INTEGER		, \
			song_replay_gain			TEXT 		, \
			song_vote_count				INTEGER		DEFAULT 0, \
			song_votes_seen				INTEGER		DEFAULT 0, \
			song_vote_share				REAL 		, \
			song_artist_parseable		TEXT \
 		)"
    )
    c.create_idx("r4_songs", "song_verified")
    c.create_idx("r4_songs", "song_rating")
    c.create_idx("r4_songs", "song_request_count")
    c.create_null_fk("r4_songs", "r4_albums", "album_id")
    c.update(
        "CREATE INDEX song_title_trgm_gin ON r4_songs USING GIN(song_title_searchable gin_trgm_ops)"
    )

    c.update(
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
    # c.create_idx("r4_song_sid", "song_id")	# handled by create_delete_fk
    c.create_idx("r4_song_sid", "sid")
    c.create_idx("r4_song_sid", "song_cool")
    c.create_idx("r4_song_sid", "song_elec_blocked")
    c.create_idx("r4_song_sid", "song_exists")
    c.create_idx("r4_song_sid", "song_request_only")
    c.create_delete_fk("r4_song_sid", "r4_songs", "song_id")

    c.update(
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
    # c.create_idx("r4_song_ratings", "user_id", "song_id") Should be handled by primary key
    c.create_idx("r4_song_ratings", "song_fave")
    c.create_delete_fk("r4_song_ratings", "r4_songs", "song_id")
    c.create_delete_fk("r4_song_ratings", "phpbb_users", "user_id")

    c.update(
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
			PRIMARY KEY (album_id, sid) \
		)"
    )
    c.create_idx("r4_album_sid", "album_rating")
    c.create_idx("r4_album_sid", "album_request_count")
    c.create_idx("r4_album_sid", "album_exists")
    c.create_idx("r4_album_sid", "sid")
    c.create_idx("r4_album_sid", "album_requests_pending")
    c.create_idx("r4_album_sid", "album_exists", "sid")
    c.create_delete_fk("r4_album_sid", "r4_albums", "album_id")

    c.update(
        " \
		CREATE TABLE r4_album_ratings ( \
			album_id				INTEGER		NOT NULL, \
			sid 					SMALLINT	NOT NULL, \
			user_id					INTEGER		NOT NULL, \
			album_rating_user		REAL		, \
			album_rating_complete	BOOLEAN		DEFAULT FALSE,  \
            PRIMARY KEY (user_id, album_id, sid) \
            ) "
    )
    c.create_idx(
        "r4_album_ratings", "user_id", "album_id", "sid"
    )  # Should be handled by primary key.
    c.create_idx("r4_album_ratings", "album_id", "sid")
    c.create_delete_fk("r4_album_ratings", "r4_albums", "album_id", create_idx=False)
    c.create_delete_fk("r4_album_ratings", "phpbb_users", "user_id", create_idx=False)

    c.update(
        " \
        CREATE TABLE r4_album_faves ( \
            album_id				INTEGER		NOT NULL, \
            user_id					INTEGER		NOT NULL, \
            album_fave				BOOLEAN, \
            PRIMARY KEY (user_id, album_id) \
        )"
    )
    c.create_idx(
        "r4_album_faves", "user_id", "album_id"
    )  # Should be handled by primary key.
    c.create_idx("r4_album_faves", "album_fave")
    c.create_delete_fk("r4_album_faves", "r4_albums", "album_id", create_idx=False)
    c.create_delete_fk("r4_album_faves", "phpbb_users", "user_id", create_idx=False)

    c.update(
        " \
		CREATE TABLE r4_artists		( \
			artist_id				SERIAL		PRIMARY KEY, \
			artist_name				TEXT		, \
			artist_name_searchable	TEXT 		NOT NULL \
		)"
    )
    c.update(
        "CREATE INDEX artist_name_trgm_gin ON r4_artists USING GIN(artist_name_searchable gin_trgm_ops)"
    )

    c.update(
        " \
		CREATE TABLE r4_song_artist	( \
			song_id					INTEGER		NOT NULL, \
			artist_id				INTEGER		NOT NULL, \
			artist_order			SMALLINT    DEFAULT 0, \
			artist_is_tag			BOOLEAN		DEFAULT TRUE, \
			PRIMARY KEY (artist_id, song_id) \
		)"
    )
    # c.create_idx("r4_song_artist", "song_id")		# handled by create_delete_fk
    # c.create_idx("r4_song_artist", "artist_id")
    c.create_delete_fk("r4_song_artist", "r4_songs", "song_id")
    c.create_delete_fk("r4_song_artist", "r4_artists", "artist_id")

    c.update(
        " \
		CREATE TABLE r4_groups ( \
			group_id				SERIAL		PRIMARY KEY, \
			group_name				TEXT		, \
			group_name_searchable	TEXT 		NOT NULL, \
			group_elec_block		SMALLINT, \
			group_cool_time			SMALLINT	DEFAULT 900 \
		)"
    )

    c.update(
        " \
		CREATE TABLE r4_song_group ( \
			song_id					INTEGER		NOT NULL, \
			group_id				INTEGER		NOT NULL, \
			group_is_tag			BOOLEAN		DEFAULT TRUE, \
			PRIMARY KEY (group_id, song_id) \
		)"
    )
    # c.create_idx("r4_song_group", "song_id")		# handled by create_delete_fk
    # c.create_idx("r4_song_group", "group_id")
    c.create_delete_fk("r4_song_group", "r4_songs", "song_id")
    c.create_delete_fk("r4_song_group", "r4_groups", "group_id")

    _create_group_sid_table()

    c.update(
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
			sched_dj_user_id        INT         , \
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
    c.create_idx("r4_schedule", "sched_used")
    c.create_idx("r4_schedule", "sched_in_progress")
    c.create_idx("r4_schedule", "sched_public")
    c.create_idx("r4_schedule", "sched_start_actual")
    c.create_delete_fk(
        "r4_schedule",
        "phpbb_users",
        "sched_dj_user_id",
        foreign_key="user_id",
        create_idx=False,
    )

    c.update(
        " \
		CREATE TABLE r4_elections ( \
			elec_id					INTEGER		PRIMARY KEY, \
			elec_used				BOOLEAN		DEFAULT FALSE, \
			elec_in_progress		BOOLEAN		DEFAULT FALSE, \
			elec_start_actual		INTEGER		, \
			elec_type				TEXT		, \
			elec_priority			BOOLEAN		DEFAULT FALSE, \
			sid						SMALLINT	NOT NULL, \
			sched_id 				INT 		 \
		)"
    )
    c.update(
        "ALTER TABLE r4_elections ALTER COLUMN elec_id SET DEFAULT nextval('r4_schedule_sched_id_seq')"
    )
    c.create_idx("r4_elections", "elec_id")
    c.create_idx("r4_elections", "elec_used")
    c.create_idx("r4_elections", "sid")
    c.create_delete_fk("r4_elections", "r4_schedule", "sched_id")

    c.update(
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
    # c.create_idx("r4_election_entries", "song_id")	# handled by create_delete_fk
    # c.create_idx("r4_election_entries", "elec_id")
    c.create_delete_fk("r4_election_entries", "r4_songs", "song_id")
    c.create_delete_fk("r4_election_entries", "r4_elections", "elec_id")

    c.update(
        " \
		CREATE TABLE r4_one_ups ( \
			one_up_id				INTEGER		NOT NULL, \
			sched_id				INTEGER		NOT NULL, \
			song_id					INTEGER		NOT NULL, \
			one_up_order			SMALLINT	, \
			one_up_used				BOOLEAN		DEFAULT FALSE, \
			one_up_queued			BOOLEAN		DEFAULT FALSE, \
			one_up_sid				SMALLINT	NOT NULL \
		)"
    )
    c.update(
        "ALTER TABLE r4_one_ups ALTER COLUMN one_up_id SET DEFAULT nextval('r4_schedule_sched_id_seq')"
    )
    # c.create_idx("r4_one_ups", "sched_id")		# handled by create_delete_fk
    # c.create_idx("r4_one_ups", "song_id")
    c.create_delete_fk("r4_one_ups", "r4_schedule", "sched_id")
    c.create_delete_fk("r4_one_ups", "r4_songs", "song_id")

    c.update(
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
    c.create_idx("r4_listeners", "sid")
    # c.create_idx("r4_listeners", "user_id")		# handled by create_delete_fk
    c.create_delete_fk("r4_listeners", "phpbb_users", "user_id")

    c.update(
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
    c.create_idx("r4_listener_counts", "lc_time")
    c.create_idx("r4_listener_counts", "sid")

    c.update(
        " \
		CREATE TABLE r4_donations ( \
			donation_id				SERIAL		PRIMARY KEY, \
			user_id					INTEGER		, \
			donation_amount			REAL		, \
			donation_message		TEXT		, \
			donation_private		BOOLEAN		DEFAULT TRUE \
		)"
    )

    c.update(
        " \
		CREATE TABLE r4_request_store ( \
			reqstor_id				SERIAL		PRIMARY KEY, \
			reqstor_order			SMALLINT	DEFAULT 32766, \
			user_id					INTEGER		NOT NULL, \
			song_id					INTEGER		NOT NULL, \
			sid 					SMALLINT	NOT NULL \
		)"
    )
    # c.create_idx("r4_request_store", "user_id")		# handled by create_delete_fk
    # c.create_idx("r4_request_store", "song_id")
    c.create_delete_fk("r4_request_store", "phpbb_users", "user_id")
    c.create_delete_fk("r4_request_store", "r4_songs", "song_id")

    c.update(
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
    # c.create_idx("r4_request_line", "user_id")		# handled by create_delete_fk
    c.create_idx("r4_request_line", "sid")
    c.create_idx("r4_request_line", "line_wait_start")
    c.create_delete_fk("r4_request_line", "phpbb_users", "user_id")
    c.update(
        "ALTER TABLE r4_request_line ADD CONSTRAINT unique_user_id UNIQUE (user_id)"
    )

    c.update(
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
    # c.create_idx("r4_request_history", "user_id")		# handled by create_delete_fk
    # c.create_idx("r4_request_history", "song_id")
    c.create_delete_fk("r4_request_history", "r4_songs", "song_id")
    c.create_delete_fk("r4_request_history", "phpbb_users", "user_id")

    c.update(
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
    # c.create_idx("r4_vote_history", "user_id")		# handled by create_delete_fk
    # c.create_idx("r4_vote_history", "song_id")
    # c.create_idx("r4_vote_history", "entry_id")
    c.create_idx("r4_vote_history", "sid")
    c.create_null_fk("r4_vote_history", "r4_election_entries", "entry_id")
    c.create_null_fk("r4_vote_history", "r4_elections", "elec_id")
    c.create_delete_fk("r4_vote_history", "r4_songs", "song_id")
    c.create_delete_fk("r4_vote_history", "phpbb_users", "user_id")

    c.update(
        " \
		CREATE TABLE r4_vote_history_archived ( \
			vote_id					SERIAL		PRIMARY KEY, \
			vote_time				INTEGER		DEFAULT EXTRACT(EPOCH FROM CURRENT_TIMESTAMP), \
			elec_id					INTEGER		, \
			user_id					INTEGER		NOT NULL, \
			song_id					INTEGER		NOT NULL, \
			vote_at_rank				INTEGER		, \
			vote_at_count				INTEGER		, \
			entry_id				INTEGER		\
		)"
    )
    c.create_null_fk("r4_vote_history_archived", "r4_election_entries", "entry_id")
    c.create_null_fk("r4_vote_history_archived", "r4_elections", "elec_id")
    c.create_null_fk("r4_vote_history_archived", "r4_songs", "song_id")
    c.create_delete_fk("r4_vote_history_archived", "phpbb_users", "user_id")

    c.update(
        " \
		CREATE TABLE r4_api_keys ( \
			api_id					SERIAL		PRIMARY KEY, \
			user_id					INTEGER		NOT NULL, \
			api_key					VARCHAR(10) , \
			api_expiry				INTEGER		, \
			api_key_listen_key      TEXT        \
		)"
    )
    # c.create_idx("r4_api_keys", "user_id")		# handled by create_delete_fk
    c.create_idx("r4_api_keys", "api_key")
    c.create_delete_fk("r4_api_keys", "phpbb_users", "user_id")

    c.update(
        " \
		CREATE TABLE r4_song_history ( \
			songhist_id				SERIAL		PRIMARY KEY, \
			songhist_time			INTEGER		DEFAULT EXTRACT(EPOCH FROM CURRENT_TIMESTAMP), \
			sid						SMALLINT	NOT NULL, \
			song_id					INTEGER		NOT NULL \
		)"
    )
    c.create_idx("r4_song_history", "sid")
    c.create_delete_fk("r4_song_history", "r4_songs", "song_id")

    c.commit()


def _create_group_sid_table():
    c.update(
        " \
		CREATE TABLE r4_group_sid( \
			group_id 				INT, \
			sid 					SMALLINT	NOT NULL, \
			group_display			BOOLEAN		DEFAULT FALSE \
		)"
    )
    c.create_idx("r4_group_sid", "group_display")
    c.create_delete_fk("r4_group_sid", "r4_groups", "group_id")
