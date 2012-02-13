try:
	from setuptools import setup
except ImportError:
	from distutils.core import setup

config = {
		'description': 'Rainwave Backend',
		'author': 'Robert McAuley',
		'url': 'http://github.com/LiquidRain/rwbackend',
		'download_url': 'http://github.com/LiquidRain/rwbackend',
		'author_email': 'rmcauley@rainwave.cc',
		'version': '0.1',
		'install_requires': ['nose'],
		'packages': ['rainwave'],
		'scripts': [],
		'name': 'rwbackend'
	}

setup(**config)
