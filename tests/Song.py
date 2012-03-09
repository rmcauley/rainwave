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
		
		
	# def test_update(self):
	
	# def test_load_from_id(self):
	
	# def test_save(self):
	