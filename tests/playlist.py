import unittest
from rainwave import playlist
from libs import db

class SongReadTest(unittest.TestCase):
	def test_read(self):
		song = playlist.Song()
		song.load_tag_from_file("tests/test1.mp3")
		self.assertEqual(song.title, "Test Song 1")
		self.assertEqual(song.artist_tag, "Test Artist 1")
		self.assertEqual(song.album_tag, "Test Album 1")
		self.assertEqual(song.genre_tag, "Test Group 1")
		self.assertEqual(song.link_text, "Rainwave")
		self.assertEqual(song.link, "rainwave.cc")

	def test_save_and_load(self):
		song_saved = playlist.Song.load_from_file("tests/test1.mp3", [1])
		
		# Test no-sid song loading
		song_loaded = playlist.Song.load_from_id(db.c.fetch_var("SELECT song_id FROM r4_songs WHERE song_filename = 'tests/test1.mp3'"))
		self.assertEqual(song_saved.filename, song_loaded.filename)
		self.assertEqual(song_saved.id, song_loaded.id)
		self.assertEqual(song_saved.title, song_loaded.title)
		self.assertEqual(song_saved.link, song_loaded.link)
		self.assertEqual(song_saved.link_text, song_loaded.link_text)
		self.assertEqual(song_saved.length, song_loaded.length)
		self.assertEqual(song_saved.verified, song_loaded.verified)
		self.assertEqual(song_saved.sids[0], song_loaded.sids[0])
		
		# Tests with sid loaded
		song_loaded = playlist.Song.load_from_id(db.c.fetch_var("SELECT song_id FROM r4_songs WHERE song_filename = 'tests/test1.mp3'"), 1)
		self.assertEqual(song_loaded.sid, 1)
		
		
	def test_update(self):
		song_updated = playlist.Song.load_from_file("tests/test1.mp3", [1])
		
class ArtistTest(unittest.TestCase):
	def test_load(self):
		source = playlist.Artist.load_from_name("Auto Test")
		compare = playlist.Artist.load_from_id(db.c.fetch_var("SELECT artist_id FROM r4_artists WHERE artist_name = 'Auto Test'"))
		
		self.assertEqual(source.id, compare.id)
		self.assertEqual(source.name, "Auto Test")
		self.assertEqual(compare.name, "Auto Test")
		
	def test_multi(self):
		sources = playlist.Artist.load_list_from_tag("Auto Test, Auto Test 2")
		compare_1 = playlist.Artist.load_from_id(db.c.fetch_var("SELECT artist_id FROM r4_artists WHERE artist_name = 'Auto Test'"))
		compare_2 = playlist.Artist.load_from_id(db.c.fetch_var("SELECT artist_id FROM r4_artists WHERE artist_name = 'Auto Test 2'"))
		
		self.assertEqual(sources[0].id, compare_1.id)
		self.assertEqual(sources[0].name, "Auto Test")
		self.assertEqual(compare_1.name, "Auto Test")
		self.assertEqual(sources[1].id, compare_2.id)
		self.assertEqual(sources[1].name, "Auto Test 2")
		self.assertEqual(compare_2.name, "Auto Test 2")

class AlbumTest(unittest.TestCase):
	def test_load(self):
		source = playlist.Album.load_from_name("Auto Test")
		compare = playlist.Album.load_from_id(db.c.fetch_var("SELECT album_id FROM r4_albums WHERE album_name = 'Auto Test'"))
		
		self.assertEqual(source.id, compare.id)
		self.assertEqual(source.name, "Auto Test")
		self.assertEqual(compare.name, "Auto Test")
		
	def test_multi(self):
		sources = playlist.Album.load_list_from_tag("Auto Test, Auto Test 2")
		compare_1 = playlist.Album.load_from_id(db.c.fetch_var("SELECT album_id FROM r4_albums WHERE album_name = 'Auto Test'"))
		compare_2 = playlist.Album.load_from_id(db.c.fetch_var("SELECT album_id FROM r4_albums WHERE album_name = 'Auto Test 2'"))
		
		self.assertEqual(sources[0].id, compare_1.id)
		self.assertEqual(sources[0].name, "Auto Test")
		self.assertEqual(compare_1.name, "Auto Test")
		self.assertEqual(sources[1].id, compare_2.id)
		self.assertEqual(sources[1].name, "Auto Test 2")
		self.assertEqual(compare_2.name, "Auto Test 2")
		
class GroupTest(unittest.TestCase):
	def test_load(self):
		source = playlist.SongGroup.load_from_name("Auto Test")
		compare = playlist.SongGroup.load_from_id(db.c.fetch_var("SELECT group_id FROM r4_groups WHERE group_name = 'Auto Test'"))
		
		self.assertEqual(source.id, compare.id)
		self.assertEqual(source.name, "Auto Test")
		self.assertEqual(compare.name, "Auto Test")
		
	def test_multi(self):
		sources = playlist.SongGroup.load_list_from_tag("Auto Test, Auto Test 2")
		compare_1 = playlist.SongGroup.load_from_id(db.c.fetch_var("SELECT group_id FROM r4_groups WHERE group_name = 'Auto Test'"))
		compare_2 = playlist.SongGroup.load_from_id(db.c.fetch_var("SELECT group_id FROM r4_groups WHERE group_name = 'Auto Test 2'"))
		
		self.assertEqual(sources[0].id, compare_1.id)
		self.assertEqual(sources[0].name, "Auto Test")
		self.assertEqual(compare_1.name, "Auto Test")
		self.assertEqual(sources[1].id, compare_2.id)
		self.assertEqual(sources[1].name, "Auto Test 2")
		self.assertEqual(compare_2.name, "Auto Test 2")