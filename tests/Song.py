import unittest

class APIStuffTest(unittest.TestCase):
	def test_song(self):
		print "Song!"
		self.assertEqual(1, 1)
		
if __name__ == '__main__':
    unittest.main()