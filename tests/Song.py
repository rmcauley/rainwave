import unittest
from rainwave import playlist

class SongReadTest(unittest.TestCase):
	def setUp(self):
		self.song = playlist.Song()
	
	def test_song(self):
		self.song.load_tag_from_file("tests/test1.mp3")
		self.assertEqual(self.song.title, "Test Song 1")
		self.assertEqual(self.song.artist_tag, "Test Artist 1")
		self.assertEqual(self.song.album_tag, "Test Album 1")
		self.assertEqual(self.song.genre_tag, "Test Group 1")
		self.assertEqual(self.song.link_text, "Rainwave")
		self.assertEqual(self.song.link, "rainwave.cc")
