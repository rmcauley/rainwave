import unittest
from rainwave import user
from libs import db

class AnonymousUserAuth(unittest.TestCase):
	def setUp(self):
		self.user = user.User(1)
	
	def test_id(self):
		self.assertEqual(1, self.user.data['user_id'])
		self.assertEqual(1, self.user.id)
		
	def test_authorize(self):
		self.user.authorize(1, "127.0.0.1", "TESTKEY")
		self.assertEqual(self.user.authorized, True)

	def test_authorize_failure(self):
		self.user.authorize(1, "127.0.0.1", "BADKEY")
		self.assertEqual(self.user.authorized, False)
		self.user.authorize(1, "127.0.0.2", "TESTKEY")
		self.assertEqual(self.user.authorized, False)
		
class RegisteredUserAuth(unittest.TestCase):
	def setUp(self):
		self.user = user.User(2)
	
	def test_id(self):
		self.assertEqual(2, self.user.id)
		
	def test_authorize(self):
		self.user.authorize(1, "127.0.0.1", "TESTKEY")
		self.assertEqual(self.user.authorized, True)
		self.assertEqual(2, self.user.data['user_id'])
		self.user.authorize(1, "127.0.0.2", "TESTKEY")
		self.assertEqual(self.user.authorized, True)

	def test_authorize_failure(self):
		self.user.authorize(1, "127.0.0.1", "BADKEY")
		self.assertEqual(self.user.authorized, False)
		
	def test_request_line(self):
		self.assertEqual(self.user.put_in_request_line(1), True)
		self.assertEqual(self.user.remove_from_request_line(), True)
		self.assertEqual(self.user.put_in_request_line(1), True)
		self.assertEqual(self.user.put_in_request_line(2), True)
		self.assertEqual(self.user.remove_from_request_line(), True)
		
class AnonymousUserRefresh(unittest.TestCase):
	def setUp(self):
		self.user = user.User(1)
		self.user.authorize(0, "127.0.0.1", "TESTKEY")
	
	def test_auto_sid(self):
		self.assertEqual(self.user.data['sid'], 5)
	
	def test_tune_in(self):
		self.assertEqual(self.user.data['tuned_in'], False)