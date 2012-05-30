import psycopg2
from psycopg2 import extras
import sqlite3
import re

from libs import config
from libs import log
from libs import constants

c = None
connection = None

# NOTE TO ALL:
#
# SQLite is UNUSABLE for production.  It is ONLY meant for testing
# and offers zero data consistency - important values (sequences, etc)
# are reset between startups.

class PostgresCursor(psycopg2.extras.RealDictCursor):
	def fetch_var(self, query, params = None):
		self.execute(query, params)
		if self.rowcount == 0:
			return None
		r = self.fetchone()
		# I realize this is not the most efficient way, but one of the primary
		# uses of the DB is to pipe output directly to JSON as an object/dict.
		# Thus why this class inherits RealDictCursor.
		# Either I can use this small inefficiency here or for fetching rows
		# and entire queries I can convert each row into a dict manually.
		# This has a smaller penalty.
		return r[r.keys()[0]]
	
	def fetch_row(self, query, params = None):
		self.execute(query, params)
		if self.rowcount == 0:
			return None
		return self.fetchone()
		
	def fetch_all(self, query, params = None):
		self.execute(query, params)
		if self.rowcount == 0:
			return None
		return self.fetchall()
		
	def fetch_list(self, query, params = None):
		self.execute(query, params)
		if self.rowcount == 0:
			return []
		arr = []
		row = self.fetchone()
		col = row.keys()[0]
		arr.append(row[col])
		for row in self.fetchmany():
			arr.append(row[col])
		return arr
		
	def update(self, query, params = None):
		self.execute(query, params)
		return self.rowcount
		
	def get_next_id(self, table, column):
		return self.fetch_var("SELECT nextval('" + table + "_" + column + "_seq'::regclass)")
		
	def create_delete_fk(self, linking_table, foreign_table, key):
		self.execute("ALTER TABLE %s ADD CONSTRAINT %s_%s_fk FOREIGN KEY (%s) REFERENCES %s (%s) ON DELETE CASCADE", (linking_table, linking_table, key, key, foreign_table, key))
		
	def create_null_fk(self, linking_table, foreign_table, key):
		self.execute("ALTER TABLE %s ADD CONSTRAINT %s_%s_fk FOREIGN KEY (%s) REFERENCES %s (%s) ON DELETE SET NULL", (linking_table, linking_table, key, key, foreign_table, key))
		
	def create_idx(self, table, column):
		self.execute("CREATE INDEX %s_%s_idx ON %s (%s)", (table, column, table, column))
		
class SQLiteCursor(object):
	def __init__(self, filename):
		self.con = sqlite3.connect(filename, 5, sqlite3.PARSE_DECLTYPES)
		self.con.isolation_level = None
		self.con.row_factory = self._dict_factory
		self.cur = self.con.cursor()
		self.rowcount = 0
		self.print_next = False
		
	def close(self):
		self.cur.close()
		self.con.close()
		
	# This isn't the most efficient.  See Pg's cursor class for explanation
	# why we want pure dicts.  Besides, speed isn't the primary concern
	# for SQLite, which is used for testing, not production.
	def _dict_factory(self, cursor, row):
		d = {}
		for idx, col in enumerate(cursor.description):
			d[col[0]] = row[idx]
		return d
	
	# Speaking of performance, everything gets mangled through this method anyway.
	def _convert_pg_query(self, query, for_print = False):
		if query.find("CREATE TABLE") >= 0:
			query = re.sub("SERIAL\w+PRIMARY KEY", "INTEGER PRIMARY KEY", query)
		if query.find("ADD CONSTRAINT") >= 0:
			return None
		if not for_print:
			query = query.replace("%s", "?")
		query = query.replace("TRUE", "1")
		query = query.replace("FALSE", "0")
		query = query.replace("EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)", "(DATETIME('%s','now'))")
		return query
		
	def fetch_var(self, query, params = None):
		self.execute(query, params)
		# if self.cur.rowcount <= 0:
			# return None
		row = self.cur.fetchone()
		if not row:
			return None
		return row[row.keys()[0]]
		
	def fetch_row(self, query, params = None):
		self.execute(query, params)
		# if self.cur.rowcount <= 0:
			# return None
		return self.cur.fetchone()
	
	def fetch_all(self, query, params = None):
		self.execute(query, params)
		if self.cur.rowcount == 0:
			return []
		return self.cur.fetchall()
		
	def fetch_list(self, query, params = None):
		self.execute(query, params)
		arr = []
		for row in self.cur.fetchall():
			arr.append(row[row.keys()[0]])
		return arr
		
	def update(self, query, params = None):
		self.execute(query, params)
		return self.cur.rowcount
		
	def execute(self, query, params = None):
		if self.print_next:
			self.print_next = False
			if params:
				print self._convert_pg_query(query, True) % params
			else:
				print self._convert_pg_query(query, True)
		query = self._convert_pg_query(query)
		# If the query can't be done or properly to SQLite,
		# silently drop it.  This is mostly for table creation, things like foreign keys.
		if not query:
			return
		if params:
			self.cur.execute(query, params)
		else:
			self.cur.execute(query)
		self.rowcount = self.cur.rowcount
		
	def get_next_id(self, table, column):
		val = self.fetch_var("SELECT MAX(" + column + ") + 1 FROM " + table)
		if not val:
			return 1
		return val
			
	def fetchone(self):
		return self.cur.fetchone()
		
	def fetchall(self):
		return self.cur.fetchall()
		
	def create_delete_fk(self, linking_table, foreign_table, key):
		pass
		
	def create_null_fk(self, linking_table, foreign_table, key):
		pass
		
	def create_idx(self, table, column):
		pass
		
def open():
	global connection
	global c
	
	if c:
		close()
	
	type = config.get("db_type")
	name = config.get("db_name")
	host = config.get("db_host")
	port = config.get("db_port")
	user = config.get("db_user")
	password = config.get("db_password")
	
	if type == "postgres":
		psycopg2.extensions.register_type(psycopg2.extensions.UNICODE)
		psycopg2.extensions.register_type(psycopg2.extensions.UNICODEARRAY)
		connstr = "sslmode=disable dbname=%s" % name
		if host:
			connstr += "host=%s " % host
		if port:
			connstr += "port=%s " % port
		if user:
			connstr += "user=%s " % user
		if password:
			connstr += "password=%s " % password
		connection = psycopg2.connect(connstr)
		connection.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT)
		c = self.con.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
	elif type == "sqlite":
		log.debug("dbopen", "Opening SQLite DB %s" % name)
		c = SQLiteCursor(name)
	else:
		log.critical("dbopen", "Invalid DB type %s!" % type)
		return False

	return True
		
def close():
	global connection
	global c
	
	if connection:
		connection.close()
	c.close()
	
	connection = False
	c = False
	
	return True
	
def create_tables():
	if config.test_mode:
		_create_test_tables()

	c.update(" \
		CREATE TABLE r4_songs ( \
			song_id					SERIAL		PRIMARY KEY, \
			song_verified			BOOLEAN		DEFAULT TRUE, \
			song_scanned			BOOLEAN		DEFAULT TRUE, \
			song_filename			TEXT		, \
			song_title				TEXT		, \
			song_link				TEXT		, \
			song_link_text			TEXT		, \
			song_length				SMALLINT	, \
			song_added_on			INTEGER		DEFAULT EXTRACT(EPOCH FROM CURRENT_TIMESTAMP), \
			song_rating				REAL		DEFAULT 0, \
			song_rating_count		INTEGER		DEFAULT 0, \
			song_cool_multiply		REAL		DEFAULT 1, \
			song_cool_override		INTEGER		, \
			song_origin_sid			SMALLINT	NOT NULL, \
			song_artist_tag			TEXT		\
		)")
	c.create_idx("r4_songs", "song_verified")
	
	c.update(" \
		CREATE TABLE r4_song_sid ( \
			song_id					INTEGER		NOT NULL, \
			sid						SMALLINT	NOT NULL, \
			song_cool				BOOLEAN		DEFAULT FALSE, \
			song_cool_end			INTEGER		, \
			song_elec_appearances	INTEGER		DEFAULT 0, \
			song_elec_last			INTEGER		DEFAULT 0, \
			song_elec_blocked		BOOLEAN 	DEFAULT FALSE, \
			song_elec_blocked_num	SMALLINT	DEFAULT 0, \
			song_elec_blocked_by	VARCHAR(10)	, \
			song_vote_share			REAL		, \
			song_vote_total			INTEGER		, \
			song_request_total		INTEGER		DEFAULT 0, \
			song_played_last		INTEGER		, \
			song_exists				BOOLEAN		DEFAULT TRUE, \
			song_request_only		BOOLEAN		DEFAULT FALSE \
		)")
	c.create_idx("r4_song_sid", "sid")
	c.create_idx("r4_song_sid", "song_id")
	c.create_idx("r4_song_sid", "song_cool")
	c.create_idx("r4_song_sid", "song_elec_blocked")
	c.create_idx("r4_song_sid", "song_exists")
	c.create_idx("r4_song_sid", "song_request_only")
	c.create_delete_fk("r4_song_sid", "r4_songs", "song_id")
	
	c.update(" \
		CREATE TABLE r4_song_ratings ( \
			song_id					INTEGER		NOT NULL, \
			user_id					INTEGER		NOT NULL, \
			song_rating				REAL		, \
			song_rated_at			INTEGER		, \
			song_rated_at_rank		INTEGER		, \
			song_rated_at_count		INTEGER		\
		)")
	c.create_idx("r4_song_ratings", "song_id")
	c.create_idx("r4_song_ratings", "user_id")
	c.create_delete_fk("r4_song_ratings", "r4_songs", "song_id")
	c.create_delete_fk("r4_song_ratings", "phpbb_users", "user_id")
	
	c.update(" \
		CREATE TABLE r4_albums ( \
			album_id				SERIAL		PRIMARY KEY, \
			album_name				TEXT		, \
			album_rating			REAL		DEFAULT 0, \
			album_rating_count		INTEGER		DEFAULT 0, \
			album_added_on			INTEGER		DEFAULT EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) \
		)")
	
	c.update(" \
		CREATE TABLE r4_album_sid ( \
			album_exists			BOOLEAN		DEFAULT TRUE, \
			album_id				INTEGER		NOT NULL, \
			sid						SMALLINT	NOT NULL, \
			album_played_last		INTEGER		DEFAULT 0, \
			album_played_times		INTEGER		DEFAULT 0, \
			album_request_count		INTEGER		DEFAULT 0, \
			album_cool_lowest		INTEGER		DEFAULT 0, \
			album_cool_multiply		REAL		DEFAULT 1, \
			album_cool_override		INTEGER		, \
			album_updated			INTEGER		DEFAULT 0, \
			album_elec_last			INTEGER		DEFAULT 0, \
			album_elec_appearances	INTEGER		DEFAULT 0, \
			album_vote_share		REAL		DEFAULT 0, \
			album_vote_total		INTEGER		DEFAULT 0\
		)")
	c.create_idx("r4_album_sid", "album_verified")
	c.create_idx("r4_album_sid", "sid")
	c.create_idx("r4_album_sid", "album_id")
	c.create_delete_fk("r4_album_sid", "r4_albums", "album_id")
	
	c.update(" \
		CREATE TABLE r4_album_ratings ( \
			album_id				INTEGER		NOT NULL, \
			user_id					INTEGER		NOT NULL, \
			album_rating			REAL		\
		)")
	c.create_idx("r4_album_ratings", "album_id")
	c.create_idx("r4_album_ratings", "user_id")
	c.create_delete_fk("r4_album_ratings", "r4_albums", "album_id")
	c.create_delete_fk("r4_album_ratings", "phpbb_users", "user_id")
	
	c.update(" \
		CREATE TABLE r4_song_album ( \
			album_id				INTEGER		NOT NULL, \
			song_id					INTEGER		NOT NULL, \
			album_is_tag			BOOLEAN		DEFAULT TRUE, \
			sid						SMALLINT	NOT NULL \
		)")
	c.create_idx("r4_song_album", "album_id")
	c.create_idx("r4_song_album", "song_id")
	c.create_delete_fk("r4_song_album", "r4_albums", "album_id")
	c.create_delete_fk("r4_song_album", "r4_songs", "song_id")
	
	c.update(" \
		CREATE TABLE r4_artists		( \
			artist_id				SERIAL		NOT NULL, \
			artist_name				TEXT		\
		)")
	
	c.update(" \
		CREATE TABLE r4_song_artist	( \
			song_id					INTEGER		NOT NULL, \
			artist_id				INTEGER		NOT NULL, \
			artist_is_tag			BOOLEAN		DEFAULT TRUE \
		)")
	c.create_idx("r4_song_artist", "song_id")
	c.create_idx("r4_song_artist", "artist_id")
	c.create_delete_fk("r4_song_artist", "r4_songs", "song_id")
	c.create_delete_fk("r4_song_artist", "r4_artists", "artist_id")
	
	c.update(" \
		CREATE TABLE r4_groups ( \
			group_id				SERIAL		PRIMARY KEY, \
			group_name				TEXT		, \
			group_elec_block		SMALLINT	DEFAULT 5 \
		)")

	c.update(" \
		CREATE TABLE r4_song_group ( \
			song_id					INTEGER		NOT NULL, \
			group_id				INTEGER		NOT NULL, \
			group_is_tag			BOOLEAN		DEFAULT TRUE \
		)")
	c.create_idx("r4_songs_in_groups", "song_id")
	c.create_idx("r4_songs_in_groups", "group_id")
	c.create_delete_fk("r4_songs_in_groups", "r4_songs", "song_id")
	c.create_delete_fk("r4_songs_in_groups", "r4_song_groups", "group_id")
	
	c.update(" \
		CREATE TABLE r4_schedule ( \
			sched_id				SERIAL		PRIMARY KEY, \
			sched_start				INTEGER		, \
			sched_start_actual		INTEGER		, \
			sched_end				INTEGER		, \
			sched_end_actual		INTEGER		, \
			sched_type				VARCHAR(10)	, \
			sched_name				TEXT		, \
			sid						SMALLINT	NOT NULL, \
			sched_public			BOOLEAN		DEFAULT TRUE, \
			sched_timed				BOOLEAN		DEFAULT TRUE, \
			sched_url				TEXT		, \
			sched_in_progress		BOOLEAN		DEFAULT FALSE, \
			sched_used				BOOLEAN		DEFAULT FALSE \
		)")
	c.create_idx("r4_schedule", "sched_in_progress")
	c.create_idx("r4_schedule", "sched_public")
	c.create_idx("r4_schedule", "sched_started")
	
	c.update(" \
		CREATE TABLE r4_elections ( \
			elec_id					SERIAL		PRIMARY KEY, \
			elec_used				BOOLEAN		DEFAULT FALSE, \
			elec_in_progress		BOOLEAN		DEFAULT FALSE, \
			elec_start_actual		INTEGER		, \
			elec_type				VARCHAR(10)	, \
			sid						SMALLINT	NOT NULL \
		)")
	c.create_idx("r4_elections", "elec_used")
	c.create_idx("r4_elections", "sid")
	
	c.update(" \
		CREATE TABLE r4_election_entries ( \
			entry_id				SERIAL		PRIMARY KEY, \
			song_id					INTEGER		NOT NULL, \
			elec_id					INTEGER		NOT NULL, \
			entry_type				SMALLINT	DEFAULT %s, \
			entry_position			SMALLINT	, \
			entry_votes				SMALLINT	DEFAULT 0 \
		)" % constants.ElecSongTypes.normal)
	c.create_idx("r4_election_entries", "song_id")
	c.create_idx("r4_election_entries", "elec_id")
	c.create_delete_fk("r4_election_entries", "r4_songs", "song_id")
	c.create_delete_fk("r4_election_entries", "r4_elections", "elec_id")
	
	c.update(" \
		CREATE TABLE r4_election_queue ( \
			elecq_id				SERIAL		PRIMARY KEY, \
			song_id					INTEGER		, \
			sid						SMALLINT	NOT NULL \
		)")
	c.create_idx("r4_election_queue", "song_id")
	c.create_delete_fk("r4_election_queue", "r4_songs", "song_id")
	
	c.update(" \
		CREATE TABLE r4_1ups ( \
			sched_id				INTEGER		NOT NULL, \
			song_id					INTEGER		NOT NULL \
		)")
	c.create_idx("r4_1ups", "sched_id")
	c.create_idx("r4_1ups", "song_id")
	c.create_delete_fk("r4_1ups", "r4_schedule", "sched_id")
	c.create_delete_fk("r4_1ups", "r4_songs", "song_id")
	
	c.update(" \
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
			user_id					INTEGER		DEFAULT 1 \
		)")
	c.create_idx("r4_listeners", "sid")
	c.create_idx("r4_listeners", "user_id")
	c.create_delete_fk("r4_listeners", "phpbb_users", "user_id")
	
	c.update(" \
		CREATE TABLE r4_listener_counts ( \
			lc_time					INTEGER		DEFAULT EXTRACT(EPOCH FROM CURRENT_TIMESTAMP), \
			sid						SMALLINT	NOT NULL, \
			lc_guests				SMALLINT	, \
			lc_users				SMALLINT	, \
			lc_users_active			SMALLINT	, \
			lc_guests_active		SMALLINT	\
		)")
	c.create_idx("r4_listener_counts", "lc_time")
	c.create_idx("r4_listener_counts", "sid")
	
	c.update(" \
		CREATE TABLE r4_donations ( \
			donation_id				SERIAL		PRIMARY KEY, \
			user_id					INTEGER		, \
			donation_amount			REAL		, \
			donation_message		TEXT		, \
			donation_private		BOOLEAN		DEFAULT TRUE \
		)")
	
	c.update(" \
		CREATE TABLE r4_request_store ( \
			reqstor_id				SERIAL		PRIMARY KEY, \
			reqstor_order			SMALLINT	, \
			user_id					INTEGER		NOT NULL, \
			song_id					INTEGER		NOT NULL, \
			sid						SMALLINT	NOT NULL \
		)")
	c.create_idx("r4_request_lists", "user_id")
	c.create_idx("r4_request_lists", "song_id")
	c.create_delete_fk("r4_request_lists", "phpbb_users", "user_id")
	c.create_delete_fk("r4_request_lists", "r4_songs", "song_id")
	
	c.update(" \
		CREATE TABLE r4_request_line ( \
			user_id					INTEGER		NOT NULL, \
			sid						SMALLINT	NOT NULL, \
			line_wait_start			INTEGER		DEFAULT EXTRACT(EPOCH FROM CURRENT_TIMESTAMP), \
			line_expiry_tune_in		INTEGER		, \
			line_expiry_election	INTEGER		, \
			line_top_song_id		INTEGER		\
		)")
	c.create_idx("r4_request_queue", "user_id")
	c.create_idx("r4_request_queue", "sid")
	c.create_idx("r4_request_queue", "requestq_wait_start")
	c.create_delete_fk("r4_request_queue", "phpbb_users", "user_id")

	c.update(" \
		CREATE TABLE r4_request_history ( \
			request_id				SERIAL		PRIMARY KEY, \
			user_id					INTEGER		NOT NULL, \
			song_id					INTEGER		NOT NULL, \
			request_fulfilled_at	INTEGER		DEFAULT EXTRACT(EPOCH FROM CURRENT_TIMESTAMP), \
			request_wait_time		INTEGER		, \
			request_queue_size		INTEGER		, \
			request_at_rank			INTEGER		, \
			request_at_count		INTEGER		\
		)")
	c.create_idx("r4_request_history", "user_id")
	c.create_idx("r4_request_history", "song_id")
	c.create_null_fk("r4_request_history", "r4_songs", "song_id")
	c.create_delete_fk("r4_request_history", "phpbb_users", "user_id")
	
	c.update(" \
		CREATE TABLE r4_vote_history ( \
			vote_id					SERIAL		PRIMARY KEY, \
			vote_time				INTEGER		DEFAULT EXTRACT(EPOCH FROM CURRENT_TIMESTAMP), \
			elec_id					INTEGER		, \
			user_id					INTEGER		NOT NULL, \
			song_id					INTEGER		NOT NULL, \
			vote_at_rank			INTEGER		, \
			vote_at_count			INTEGER		, \
			entry_id				INTEGER		\
		)")
	c.create_idx("r4_vote_history", "sched_id")
	c.create_idx("r4_vote_history", "user_id")
	c.create_idx("r4_vote_history", "song_id")
	c.create_idx("r4_vote_history", "entry_id")
	c.create_null_fk("r4_vote_history", "r4_election_entries", "entry_id")
	c.create_null_fk("r4_vote_history", "r4_elections", "elec_id")
	c.create_null_fk("r4_vote_history", "r4_songs", "song_id")
	c.create_delete_fk("r4_vote_history", "phpbb_users", "user_id")
	
	c.update(" \
		CREATE TABLE r4_album_faves ( \
			album_id				INTEGER		NOT NULL, \
			user_id					INTEGER		NOT NULL \
		)")
	c.create_idx("r4_album_favs", "album_id")
	c.create_idx("r4_album_favs", "user_id")
	c.create_delete_fk("r4_album_favs", "r4_albums", "album_id")
	c.create_delete_fk("r4_album_favs", "phpbb_users", "user_id")
	
	c.update(" \
		CREATE TABLE r4_song_faves ( \
			song_id					INTEGER		NOT NULL, \
			user_id					INTEGER		NOT NULL \
		)")
	c.create_idx("r4_song_favs", "song_id")
	c.create_idx("r4_song_favs", "user_id")
	c.create_delete_fk("r4_song_favs", "r4_songs", "song_id")
	c.create_delete_fk("r4_song_favs", "phpbb_users", "user_id")
	
	c.update(" \
		CREATE TABLE r4_api_keys ( \
			api_id					SERIAL		PRIMARY KEY, \
			user_id					INTEGER		NOT NULL, \
			api_ip					TEXT		, \
			api_key					VARCHAR(10) , \
			api_is_rainwave			BOOLEAN		DEFAULT FALSE, \
			api_expiry				INTEGER		\
		)")
	c.create_idx("r4_api_keys", "user_id")
	c.create_idx("r4_api_keys", "api_ip")
	c.create_delete_fk("r4_api_keys", "phpbb_users", "user_id")
	
	c.update(" \
		CREATE TABLE r4_oneup_lists ( \
			oneuplist_id			SERIAL		PRIMARY KEY, \
			sched_id				INTEGER		\
		)")
	c.create_idx("r4_oneup_lists", "sched_id")
	c.create_delete_fk("r4_oneup_lists", "r4_schedule", "sched_id")
	
	c.update(" \
		CREATE TABLE r4_oneup_list_content ( \
			oneuplist_id			INTEGER		NOT NULL, \
			song_id					INTEGER		NOT NULL, \
			oneup_position			SMALLINT	\
		)")
	c.create_idx("r4_oneup_list_content", "song_id")
	c.create_delete_fk("r4_oneup_list_content", "r4_oneup_lists", "oneuplist_id")
	
	if config.test_mode:
		_fill_test_tables()
	
def _create_test_tables():
	c.update(" \
		CREATE TABLE phpbb_users( \
			user_id					SERIAL		DEFAULT (EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) + 86400), \
			radio_winningvotes		INT			DEFAULT 0, \
			radio_losingvotes		INT			DEFAULT 0, \
			radio_winningrequests	INT			DEFAULT 0, \
			radio_losingrequests	INT			DEFAULT 0, \
			radio_lastnews			INT			DEFAULT 0, \
			radio_listen_key		TEXT		DEFAULT 'TESTKEY', \
			group_id				INT			DEFAULT 1, \
			username				TEXT 		DEFAULT 'Test', \
			user_new_privmsg		INT			DEFAULT 0, \
			user_avatar				TEXT		DEFAULT '', \
			user_avatar_type		INT			DEFAULT 0 \
		)")

def _fill_test_tables():
	# Anonymous user
	c.update("INSERT INTO phpbb_users (user_id, username) VALUES (1, 'Anonymous')")
	c.update("INSERT INTO r4_api_keys (user_id, api_key, api_is_rainwave, api_ip) VALUES (1, 'TESTKEY', TRUE, '127.0.0.1')")
	
	# User ID 2: site admin
	c.update("INSERT INTO phpbb_users (user_id, username, group_id) VALUES (2, 'Test', 5)")
	c.update("INSERT INTO r4_api_keys (user_id, api_key, api_is_rainwave) VALUES (2, 'TESTKEY', TRUE)")
	
