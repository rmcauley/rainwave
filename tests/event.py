import unittest
from libs import db
from libs import constants
from rainwave import playlist
from rainwave import event
from rainwave.event import Election
from rainwave import user

class ElectionTest(unittest.TestCase):
	def setUp(self):
		self.song1 = playlist.Song.load_from_file("tests/test1.mp3", [1])
		self.song5 = playlist.Song.load_from_file("tests/test5.mp3", [1])
		
	def tearDown(self):
		self.song1.disable()
		self.song5.disable()
		
	def test_fill(self):
		e = Election.create(1)
		e.fill()
		e2 = Election.load_by_id(e.id)
		self.assertEqual(e.id, e2.id)
		e2 = Election.load_by_type(1, "election")
		self.assertEqual(e.id, e2.id)
		e2 = Election.load_unused(1)
		self.assertEqual(e.id, e2.id)
		playlist.remove_all_locks()
		
		e = Election.create(1)
		e.fill(5)
		playlist.remove_all_locks()
		
	def test_check_song_for_conflict(self):
		e = Election.create(1)
		self.assertEqual(False, e._check_song_for_conflict(self.song1))
		
		u = user.User(2)
		u.authorize(1, None, None, True)
		self.assertEqual(1, u.put_in_request_line(1))
		# print self.song5.albums
		# print self.song1.albums
		# TODO: Use proper request class here instead of DB call
		db.c.update("INSERT INTO r4_request_store (user_id, song_id, sid) VALUES (2, %s, 1)", (self.song5.id,))
		self.assertEqual(True, e._check_song_for_conflict(self.song1))
		self.assertEqual(constants.ElecSongTypes.conflict, self.song1)
		self.assertEqual(True, e._check_song_for_conflict(self.song5))
		self.assertEqual(constants.ElecSongTypes.request, self.song1)
		
	def test_start_finish(self):
		e = Election.create(1)
		e.fill()
		req_song = e.songs[0]
		db.c.update("UPDATE r4_election_entries SET entry_type = %s, entry_votes = 3 WHERE song_id = %s", (constants.ElecSongTypes.request, req_song.id))
		win_song = e.songs[1]
		db.c.update("UPDATE r4_election_entries SET entry_votes = 5 WHERE song_id = %s", (win_song.id,))
		e.start_event()
		self.assertEqual(req_song.id, e.songs[0].id)
		self.assertEqual(win_song.id, e.songs[1].id)
		self.assertEqual(win_song.id, e.get_song().id)
		e.finish()
		
	def test_get_request(self):
		db.c.update("DELETE FROM r4_request_store")
		u = user.User(2)
		u.authorize(1, None, None, True)
		u.put_in_request_line(1)
		# TODO: Use proper request class here instead of DB call
		db.c.update("INSERT INTO r4_request_store (user_id, song_id, sid) VALUES (2, %s, 1)", (self.song1.id,))
		
		e = Election.create(1)
		req = e.get_request()
		self.assertNotEqual(None, req)
		self.assertEqual(self.song1.id, req.id)
		
	def test_add_from_queue(self):
		db.c.update("DELETE FROM r4_election_queue")
		event.add_to_election_queue(1, self.song1)
		e = Election.create(1)
		e._add_from_queue()
		self.assertEqual(self.song1.id, e.songs[0].id)
	
	def test_is_request_needed(self):
		# TODO: This
		pass
		# e = Election(1)
		# e.is_request_needed()
		# e.
		
