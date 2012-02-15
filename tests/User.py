import unittest
from rainwave import user

class AnonymousUserTest(unittest.TestCase):
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
		
class RegisteredUserTest(unittest.TestCase):
	def setUp(self):
		self.user = user.User(2)
	
	def test_id(self):
		self.assertEqual(2, self.user.data['user_id'])
		self.assertEqual(2, self.user.id)
		
	def test_authorize(self):
		self.user.authorize(1, "127.0.0.1", "TESTKEY")
		self.assertEqual(self.user.authorized, True)

	def test_authorize_failure(self):
		self.user.authorize(1, "127.0.0.1", "BADKEY")
		self.assertEqual(self.user.authorized, False)
		self.user.authorize(1, "127.0.0.2", "TESTKEY")
		self.assertEqual(self.user.authorized, False)