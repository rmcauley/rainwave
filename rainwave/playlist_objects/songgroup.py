from time import time as timestamp

from libs import db
from libs import log
from libs import config

from rainwave.playlist_objects.metadata import AssociatedMetadata
from rainwave.playlist_objects.metadata import make_searchable_string

class SongGroup(AssociatedMetadata):
	select_by_name_query = "SELECT group_id AS id, group_name AS name, group_name_searchable AS name_searchable, group_elec_block AS elec_block, group_cool_time AS cool_time FROM r4_groups WHERE group_name = %s"
	select_by_id_query = "SELECT group_id AS id, group_name AS name, group_name_searchable AS name_searchable, group_elec_block AS elec_block, group_cool_time AS cool_time FROM r4_groups WHERE group_id = %s"
	select_by_song_id_query = "SELECT r4_groups.group_id AS id, r4_groups.group_name AS name, r4_groups.group_name_searchable AS name_searchable, group_elec_block AS elec_block, group_cool_time AS cool_time, group_is_tag AS is_tag FROM r4_song_group JOIN r4_groups USING (group_id) WHERE song_id = %s ORDER BY group_name"
	disassociate_song_id_query = "DELETE FROM r4_song_group WHERE song_id = %s AND group_id = %s"
	associate_song_id_query = "INSERT INTO r4_song_group (song_id, group_id, group_is_tag) VALUES (%s, %s, %s)"
	has_song_id_query = "SELECT COUNT(song_id) FROM r4_song_group WHERE song_id = %s AND group_id = %s"
	check_self_size_query = "SELECT COUNT(song_id) FROM r4_song_group JOIN r4_songs USING (song_id) WHERE group_id = %s AND song_verified = TRUE"
	delete_self_query = "DELETE FROM r4_groups WHERE group_id = %s"

	#pylint: disable=W0212,W0221
	@classmethod
	def load_list_from_song_id(klass, song_id, sid=None):
		if not sid:
			return super(SongGroup, klass).load_list_from_song_id(song_id)

		rows = db.c.fetch_all(
			"SELECT r4_groups.group_id AS id, r4_groups.group_name AS name, r4_groups.group_name_searchable AS name_searchable, group_elec_block AS elec_block, group_cool_time AS cool_time, group_is_tag AS is_tag "
			"FROM r4_song_sid "
				"JOIN r4_song_group USING (song_id) "
				"JOIN r4_group_sid ON (r4_song_group.group_id = r4_group_sid.group_id AND r4_group_sid.sid = %s AND r4_group_sid.group_display = TRUE) "
				"JOIN r4_groups ON (r4_group_sid.group_id = r4_groups.group_id) "
			"WHERE r4_song_sid.song_id = %s AND r4_song_sid.sid = %s AND song_exists = TRUE "
			"ORDER BY r4_groups.group_name"
			,(sid, song_id, sid)
		)
		instances = []
		for row in rows:
			instance = klass()
			instance._assign_from_dict(row)
			instances.append(instance)
		return instances
	#pylint: enable=W0212,W0221

	def associate_song_id(self, song_id, is_tag = None):
		super(SongGroup, self).associate_song_id(song_id, is_tag)
		self.reconcile_sids()

	def reconcile_sids(self):
		new_sids_all = db.c.fetch_all(
			"SELECT sid, COUNT(DISTINCT album_id) "
			"FROM r4_song_group "
				"JOIN r4_song_sid USING (song_id) "
				"JOIN r4_songs USING (song_id) "
			"WHERE group_id = %s AND song_exists = TRUE AND song_verified = TRUE "
			"GROUP BY sid "
			"HAVING COUNT(DISTINCT album_id) > 1"
			,(self.id,))
		new_sids = [ row['sid'] for row in new_sids_all ]
		for sid in config.station_ids:
			existing = db.c.fetch_row("SELECT group_display FROM r4_group_sid WHERE group_id = %s AND sid = %s", (self.id, sid))
			if existing:
				if sid in new_sids:
					db.c.update("UPDATE r4_group_sid SET group_display = TRUE WHERE group_id = %s", (self.id,))
				else:
					db.c.update("UPDATE r4_group_sid SET group_display = FALSE WHERE group_id = %s", (self.id,))
			elif sid in new_sids:
				db.c.update("INSERT INTO r4_group_sid (group_id, sid, group_display) VALUES (%s, %s, TRUE)", (self.id, sid))

	def _insert_into_db(self):
		self.id = db.c.get_next_id("r4_groups", "group_id")
		return db.c.update("INSERT INTO r4_groups (group_id, group_name, group_name_searchable) VALUES (%s, %s, %s)", (self.id, self.data['name'], make_searchable_string(self.data['name'])))

	def _update_db(self):
		return db.c.update("UPDATE r4_groups SET group_name = %s, group_name_searchable = %s WHERE group_id = %s", (self.data['name'], make_searchable_string(self.data['name']), self.id))

	def _start_cooldown_db(self, sid, cool_time):
		if config.has_station(sid, "cooldown_enable_for_categories") and not config.get_station(sid, "cooldown_enable_for_categories"):
			return

		cool_end = int(cool_time + timestamp())
		log.debug("cooldown", "Group ID %s Station ID %s cool_time period: %s" % (self.id, sid, cool_time))
		# Make sure to update both the if and else SQL statements if doing any updates
		if db.c.allows_join_on_update:
			db.c.update("UPDATE r4_song_sid SET song_cool = TRUE, song_cool_end = %s "
						"FROM r4_song_group "
						"WHERE r4_song_sid.song_id = r4_song_group.song_id AND r4_song_group.group_id = %s "
							"AND r4_song_sid.sid = %s AND r4_song_sid.song_exists = TRUE AND r4_song_sid.song_cool_end <= %s ",
						(cool_end, self.id, sid, cool_end))
			request_only_end = cool_end + 300
			db.c.update("UPDATE r4_song_sid SET song_request_only = TRUE, song_request_only_end = %s "
						"FROM r4_song_group "
						"WHERE r4_song_sid.song_id = r4_song_group.song_id AND r4_song_group.group_id = %s "
							"AND r4_song_sid.sid = %s AND r4_song_sid.song_exists = TRUE AND r4_song_sid.song_cool_end <= %s "
							"AND song_request_only_end IS NOT NULL",
						(request_only_end, self.id, sid, cool_end))
		else:
			song_ids = db.c.fetch_list(
				"SELECT song_id "
				"FROM r4_song_group JOIN r4_song_sid USING (song_id) "
				"WHERE r4_song_group.group_id = %s AND r4_song_sid.sid = %s AND r4_song_sid.song_exists = TRUE AND r4_song_sid.song_cool_end < %s",
				(self.id, sid, timestamp() - cool_time))
			for song_id in song_ids:
				db.c.update("UPDATE r4_song_sid SET song_cool = TRUE, song_cool_end = %s WHERE song_id = %s AND sid = %s", (cool_end, song_id, sid))

	def _start_election_block_db(self, sid, num_elections):
		if db.c.allows_join_on_update:
			# refer to song.set_election_block for base SQL
			db.c.update("UPDATE r4_song_sid "
						"SET song_elec_blocked = TRUE, song_elec_blocked_by = %s, song_elec_blocked_num = %s "
						"FROM r4_song_group "
						"WHERE r4_song_sid.song_id = r4_song_group.song_id AND "
						"r4_song_group.group_id = %s AND r4_song_sid.sid = %s AND song_elec_blocked_num < %s",
						('group', num_elections, self.id, sid, num_elections))
		# Disabled for SQLite to prevent circular module referencing
		# else:
		# 	table = db.c.fetch_all("SELECT r4_song_group.song_id FROM r4_song_group JOIN r4_song_sid ON (r4_song_group.song_id = r4_song_sid.song_id AND r4_song_sid.sid = %s) WHERE group_id = %s", (self.id, sid))
		# 	for row in table:
		# 		song = Song()
		# 		song.id = row['song_id']
		# 		song.set_election_block(sid, 'group', num_elections)

	def set_elec_block(self, num_elections):
		db.c.update("UPDATE r4_groups SET group_elec_block = %s WHERE group_id = %s", (num_elections, self.id))

	def set_cooldown(self, cooldown):
		db.c.update("UPDATE r4_groups SET group_cool_time = %s WHERE group_id = %s", (cooldown, self.id))

	def load_songs_from_sid(self, sid, user_id):
		all_songs = db.c.fetch_all(
			"SELECT r4_song_group.song_id AS id, song_title AS title, "
			 	"CAST(ROUND(CAST(song_rating AS NUMERIC), 1) AS REAL) AS rating, "
				"TRUE AS requestable, "
				"song_length AS length, "
				"song_disc_number AS disc_number, "
				"song_track_number AS track_number, "
				"song_cool AS cool, "
				"song_cool_end AS cool_end, "
				"song_url as url, song_link_text as link_text, "
				"song_artist_parseable AS artist_parseable, "
				"COALESCE(song_rating_user, 0) AS rating_user, "
				"COALESCE(song_fave, FALSE) AS fave, "
				"album_name, r4_albums.album_id, album_year "
			"FROM r4_song_group "
				"JOIN r4_song_sid ON (r4_song_group.song_id = r4_song_sid.song_id AND r4_song_sid.sid = %s) "
				"JOIN r4_songs ON (r4_song_group.song_id = r4_songs.song_id) "
				"JOIN r4_albums USING (album_id) "
				"LEFT JOIN r4_album_sid ON (r4_albums.album_id = r4_album_sid.album_id AND r4_album_sid.sid = %s) "
				"LEFT JOIN r4_song_ratings ON (r4_song_group.song_id = r4_song_ratings.song_id AND r4_song_ratings.user_id = %s) "
			"WHERE r4_song_group.group_id = %s AND r4_songs.song_verified = TRUE AND r4_song_sid.song_exists = TRUE "
			"ORDER BY album_year NULLS FIRST, album_name, song_disc_number NULLS FIRST, song_track_number NULLS FIRST, song_title",
			(sid, sid, user_id, self.id))
		# And of course, now we have to burn extra CPU cycles to make sure the right album name is used and that we present the data
		# in the same format seen everywhere else on the API.  Still, much faster then loading individual song objects.
		self.data['all_songs_for_sid'] = {}
		requestable = True if user_id > 1 else False
		for song in all_songs:
			song['requestable'] = requestable and song['requestable']
			if not song['album_id'] in self.data['all_songs_for_sid']:
				self.data['all_songs_for_sid'][song['album_id']] = []
			self.data['all_songs_for_sid'][song['album_id']].append(song)
			song['albums'] = [ { "name": song.pop('album_name'), "id": song.pop('album_id'), "year": song.pop('album_year') } ]
