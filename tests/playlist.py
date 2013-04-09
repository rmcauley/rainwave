import unittest
from rainwave import playlist
from libs import db

class SongSelectTest(unittest.TestCase):
	def test_random_select(self):
		playlist.Song.load_from_file("tests/test1.mp3", [1])
		self.assertNotEqual(None, playlist.get_random_song_timed(1, 1))
		self.assertNotEqual(None, playlist.get_random_song(1))
		self.assertNotEqual(None, playlist.get_random_song_ignore_requests(1))
		self.assertNotEqual(None, playlist.get_random_song_ignore_all(1))

class SongTest(unittest.TestCase):
	def _check_associations(self, song, sid):
		self.assertEqual(True, db.c.fetch_var("SELECT song_verified FROM r4_songs WHERE song_id = %s", (song.id,)))
		self.assertEqual(True, db.c.fetch_var("SELECT song_exists FROM r4_song_sid WHERE song_id = %s", (song.id,)))
		
		self.assertEqual(1, db.c.fetch_var("SELECT song_exists FROM r4_song_sid WHERE song_id = %s AND sid = %s", (song.id, sid)))
		self.assertEqual(1, db.c.fetch_var("SELECT COUNT(*) FROM r4_song_album WHERE song_id = %s AND album_id = %s", (song.id, song.albums[0].id)))
		
		self.assertEqual(1, db.c.fetch_var("SELECT song_verified FROM r4_songs WHERE song_id = %s", (song.id,)))
		self.assertEqual(1, db.c.fetch_var("SELECT song_exists FROM r4_song_sid WHERE song_id = %s", (song.id,)))
		self.assertEqual(1, db.c.fetch_var("SELECT COUNT(*) FROM r4_song_artist WHERE song_id = %s", (song.id,)))
		self.assertEqual(1, db.c.fetch_var("SELECT COUNT(*) FROM r4_song_group WHERE song_id = %s", (song.id,)))

		self.assertEqual(1, db.c.fetch_var("SELECT album_exists FROM r4_album_sid WHERE album_id = %s AND sid = %s", (song.albums[0].id, sid)))
		
	def test_read(self):
		song = playlist.Song()
		song.load_tag_from_file("tests/test1.mp3")
		self.assertEqual(song.data['title'], "Test Song 1")
		self.assertEqual(song.artist_tag, "Test Artist 1")
		self.assertEqual(song.album_tag, "Test Album 1")
		self.assertEqual(song.genre_tag, "Test Group 1")
		self.assertEqual(song.data['link_text'], "Rainwave")
		self.assertEqual(song.data['link'], "rainwave.cc")

	def test_save_and_load(self):
		song_saved = playlist.Song.load_from_file("tests/test1.mp3", [1])
		self._check_associations(song_saved, 1)

		# Test no-sid song loading
		song_loaded = playlist.Song.load_from_id(db.c.fetch_var("SELECT song_id FROM r4_songs WHERE song_filename = 'tests/test1.mp3'"))
		self.assertEqual(song_saved.filename, song_loaded.filename)
		self.assertEqual(song_saved.id, song_loaded.id)
		self.assertEqual(song_saved.data['title'], song_loaded.data['title'])
		self.assertEqual(song_saved.data['link'], song_loaded.data['link'])
		self.assertEqual(song_saved.data['link_text'], song_loaded.data['link_text'])
		self.assertEqual(song_saved.data['length'], song_loaded.data['length'])
		self.assertEqual(song_saved.verified, song_loaded.verified)
		self.assertEqual(song_saved.data['sids'][0], song_loaded.data['sids'][0])
		self._check_associations(song_loaded, 1)
		
		# Tests with sid loaded
		song_loaded = playlist.Song.load_from_id(db.c.fetch_var("SELECT song_id FROM r4_songs WHERE song_filename = 'tests/test1.mp3'"), 1)
		self.assertEqual(song_loaded.sid, 1)
		self._check_associations(song_loaded, 1)
		
	def test_update(self):
		song_updated = playlist.Song.load_from_file("tests/test1.mp3", [1])
		self._check_associations(song_updated, 1)
	
	def test_disable(self):
		s = playlist.Song.load_from_file("tests/test1.mp3", [1])
		songs = db.c.fetch_list("SELECT song_id FROM r4_song_album WHERE album_id = %s", (s.albums[0].id,))
		for id in songs:
		    playlist.Song.load_from_id(id).disable()
		
		self.assertEqual(0, db.c.fetch_var("SELECT song_verified FROM r4_songs WHERE song_id = %s", (s.id,)))
		self.assertEqual(0, db.c.fetch_var("SELECT song_exists FROM r4_song_sid WHERE song_id = %s", (s.id,)))
		self.assertEqual(0, db.c.fetch_var("SELECT album_exists FROM r4_album_sid WHERE album_id = %s", (s.albums[0].id,)))
		#self.assertEqual(1, db.c.fetch_var("SELECT COUNT(*) FROM r4_song_artist WHERE song_id = %s", (s.id,)))
		#self.assertEqual(1, db.c.fetch_var("SELECT COUNT(*) FROM r4_song_group WHERE song_id = %s", (s.id,)))
		#self.assertEqual(1, db.c.fetch_var("SELECT COUNT(*) FROM r4_song_album WHERE song_id = %s", (s.id,)))
		
		#s = playlist.Song.load_from_file("tests/test1.mp3", [1])
		#self._check_associations(s, 1)
		#self.assertEqual(1, db.c.fetch_var("SELECT COUNT(*) FROM r4_song_artist WHERE song_id = %s", (s.id,)))
		#self.assertEqual(1, db.c.fetch_var("SELECT COUNT(*) FROM r4_song_group WHERE song_id = %s", (s.id,)))
		#self.assertEqual(1, db.c.fetch_var("SELECT COUNT(*) FROM r4_song_album WHERE song_id = %s", (s.id,)))
		
	def test_nontag_metadata(self):
		s = playlist.Song.load_from_file("tests/test1.mp3", [1])
		s.remove_nontag_metadata()
		self.assertEqual(1, db.c.fetch_var("SELECT album_is_tag FROM r4_song_album WHERE album_id = %s AND song_id = %s", (s.albums[0].id, s.id)))
		
		s.add_group("Non-Tag Group")
		self.assertEqual(1, db.c.fetch_var("SELECT COUNT(*) FROM r4_groups WHERE group_name = 'Non-Tag Group'"))
		self.assertEqual(2, db.c.fetch_var("SELECT COUNT(*) FROM r4_song_group WHERE song_id = %s", (s.id,)))
		s.remove_group("Non-Tag Group")
		self.assertEqual(0, db.c.fetch_var("SELECT COUNT(*) FROM r4_groups WHERE group_name = 'Non-Tag Group'"))
		self.assertEqual(1, db.c.fetch_var("SELECT COUNT(*) FROM r4_song_group WHERE song_id = %s", (s.id,)))
		
		s.add_album("Test Album 1")
		self.assertEqual(1, db.c.fetch_var("SELECT COUNT(*) FROM r4_song_album WHERE song_id = %s", (s.id,)))
		self.assertEqual(1, db.c.fetch_var("SELECT album_is_tag FROM r4_song_album WHERE album_id = %s AND song_id = %s", (s.albums[0].id, s.id)))
		
		s.add_album("Non-Tag Album")
		album_id = db.c.fetch_var("SELECT album_id FROM r4_albums WHERE album_name = 'Non-Tag Album'")
		self.assertEqual(2, db.c.fetch_var("SELECT COUNT(*) FROM r4_song_album WHERE song_id = %s", (s.id,)))
		self.assertEqual(0, db.c.fetch_var("SELECT album_is_tag FROM r4_song_album WHERE album_id = %s AND song_id = %s", (album_id, s.id)))
		
		loaded = playlist.Song.load_from_file("tests/test1.mp3", [1])
		self.assertEqual(2, len(loaded.albums))
		self.assertEqual(True, loaded.albums[0].is_tag)
		self.assertEqual(False, loaded.albums[1].is_tag)
		self.assertEqual(2, db.c.fetch_var("SELECT COUNT(*) FROM r4_song_album WHERE song_id = %s", (loaded.id,)))
		self.assertEqual(0, db.c.fetch_var("SELECT album_is_tag FROM r4_song_album WHERE album_id = %s AND song_id = %s", (album_id, s.id)))
		self.assertEqual(1, db.c.fetch_var("SELECT album_is_tag FROM r4_song_album WHERE album_id = %s AND song_id = %s", (s.albums[0].id, loaded.id)))
		loaded.disable()
		self.assertEqual(2, db.c.fetch_var("SELECT COUNT(*) FROM r4_song_album WHERE song_id = %s", (loaded.id,)))
		self.assertEqual(0, db.c.fetch_var("SELECT album_is_tag FROM r4_song_album WHERE album_id = %s AND song_id = %s", (album_id, s.id)))
		self.assertEqual(1, db.c.fetch_var("SELECT album_is_tag FROM r4_song_album WHERE album_id = %s AND song_id = %s", (s.albums[0].id, loaded.id)))
		self.assertEqual(0, db.c.fetch_var("SELECT album_exists FROM r4_album_sid WHERE album_id = %s AND sid = %s", (loaded.albums[0].id, 1)))
		self.assertEqual(0, db.c.fetch_var("SELECT album_exists FROM r4_album_sid WHERE album_id = %s AND sid = %s", (loaded.albums[1].id, 1)))
		loaded = playlist.Song.load_from_file("tests/test1.mp3", [1])
		self.assertEqual(1, db.c.fetch_var("SELECT album_exists FROM r4_album_sid WHERE album_id = %s AND sid = %s", (loaded.albums[0].id, 1)))
		self.assertEqual(1, db.c.fetch_var("SELECT album_exists FROM r4_album_sid WHERE album_id = %s AND sid = %s", (loaded.albums[1].id, 1)))
		loaded.remove_album("Non-Tag Album")
		
class ArtistTest(unittest.TestCase):
	def test_load(self):
		source = playlist.Artist.load_from_name("Auto Test")
		compare = playlist.Artist.load_from_id(db.c.fetch_var("SELECT artist_id FROM r4_artists WHERE artist_name = 'Auto Test'"))
		
		self.assertEqual(source.id, compare.id)
		self.assertEqual(source.data['name'], "Auto Test")
		self.assertEqual(compare.data['name'], "Auto Test")
		
	def test_multi(self):
		sources = playlist.Artist.load_list_from_tag("Auto Test, Auto Test 2")
		compare_1 = playlist.Artist.load_from_id(db.c.fetch_var("SELECT artist_id FROM r4_artists WHERE artist_name = 'Auto Test'"))
		compare_2 = playlist.Artist.load_from_id(db.c.fetch_var("SELECT artist_id FROM r4_artists WHERE artist_name = 'Auto Test 2'"))
		
		self.assertEqual(sources[0].id, compare_1.id)
		self.assertEqual(sources[0].data['name'], "Auto Test")
		self.assertEqual(compare_1.data['name'], "Auto Test")
		self.assertEqual(sources[1].id, compare_2.id)
		self.assertEqual(sources[1].data['name'], "Auto Test 2")
		self.assertEqual(compare_2.data['name'], "Auto Test 2")

class AlbumTest(unittest.TestCase):
	def test_load(self):
		source = playlist.Album.load_from_name("Auto Test")
		compare = playlist.Album.load_from_id(db.c.fetch_var("SELECT album_id FROM r4_albums WHERE album_name = 'Auto Test'"))
		
		self.assertEqual(source.id, compare.id)
		self.assertEqual(source.data['name'], "Auto Test")
		self.assertEqual(compare.data['name'], "Auto Test")
		
	def test_multi(self):
		sources = playlist.Album.load_list_from_tag("Auto Test, Auto Test 2")
		compare_1 = playlist.Album.load_from_id(db.c.fetch_var("SELECT album_id FROM r4_albums WHERE album_name = 'Auto Test'"))
		compare_2 = playlist.Album.load_from_id(db.c.fetch_var("SELECT album_id FROM r4_albums WHERE album_name = 'Auto Test 2'"))
		
		self.assertEqual(sources[0].id, compare_1.id)
		self.assertEqual(sources[0].data['name'], "Auto Test")
		self.assertEqual(compare_1.data['name'], "Auto Test")
		self.assertEqual(sources[1].id, compare_2.id)
		self.assertEqual(sources[1].data['name'], "Auto Test 2")
		self.assertEqual(compare_2.data['name'], "Auto Test 2")
		
class GroupTest(unittest.TestCase):
	def test_load(self):
		source = playlist.SongGroup.load_from_name("Auto Test")
		compare = playlist.SongGroup.load_from_id(db.c.fetch_var("SELECT group_id FROM r4_groups WHERE group_name = 'Auto Test'"))
		
		self.assertEqual(source.id, compare.id)
		self.assertEqual(source.data['name'], "Auto Test")
		self.assertEqual(compare.data['name'], "Auto Test")
		
	def test_multi(self):
		sources = playlist.SongGroup.load_list_from_tag("Auto Test, Auto Test 2")
		compare_1 = playlist.SongGroup.load_from_id(db.c.fetch_var("SELECT group_id FROM r4_groups WHERE group_name = 'Auto Test'"))
		compare_2 = playlist.SongGroup.load_from_id(db.c.fetch_var("SELECT group_id FROM r4_groups WHERE group_name = 'Auto Test 2'"))
		
		self.assertEqual(sources[0].id, compare_1.id)
		self.assertEqual(sources[0].data['name'], "Auto Test")
		self.assertEqual(compare_1.data['name'], "Auto Test")
		self.assertEqual(sources[1].id, compare_2.id)
		self.assertEqual(sources[1].data['name'], "Auto Test 2")
		self.assertEqual(compare_2.data['name'], "Auto Test 2")