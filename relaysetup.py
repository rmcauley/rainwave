#!/usr/bin/python

"""Sets up a Rainwave relay when run from the command line.

Original Author: Cory petosky, cory@petosky.net

This script attempts 3 things:

 1. Generate correct configuration files based on script arguments.
 2. Give you the info you need to finish your setup with LR.

Has been modified from the original to:
 1. Only print to stdout
 2. Not try and install anything
 3. Not try and start any initscripts
 4. Updated for more recent configurations of Rainwave
 5. Removed everything but the <mount> and <alias> parts of the config
"""

STATIONS = {
	'game': {
		'station_source_relay': 'rwrelay.mp3',
		'station_mount': 'game.mp3',
		'station_alias': 'rainwave.mp3',
		'station_num': 1,
		'stream_name': 'Rainwave Game Music',
		'stream_description':
			'Vote, rate, and request your favorite video game music!',
		'stream_url': 'http://game.rainwave.cc'},
    'ocremix': {
        'station_source_relay': 'ocrelay.mp3',
		'station_mount': 'ocremix.mp3',
		'station_alias': None,
        'station_short': 'oc',
        'station_num': 2,
        'stream_name': 'OverClocked Remix Radio',
        'stream_description':
            'Vote, rate, and request your favorite OverClocked Remixes!',
        'stream_url': 'http://ocr.rainwave.cc'},
    'covers': {
        'station_source_relay': 'mwrelay.mp3',
		'station_mount': 'covers.mp3',
		'station_alias': 'mixwave.mp3',
        'station_num': 3,
        'stream_name': 'Rainwave Covers',
        'stream_description':
            'Vote, rate, and request video game cover bands and remixes!',
        'stream_url': 'http://covers.rainwave.cc'},
	'chip': {
		'station_source_relay': 'bitrelay.mp3',
		'station_mount': 'chiptune.mp3',
		'station_alias': 'bitwave.mp3',
		'station_num': 4,
		'stream_name': 'Rainwave Chiptunes',
		'stream_description':
			'Vote, rate, and request video game chiptunes!',
		'stream_url': 'http://chip.rainwave.cc'},
	'all': {
		'station_source_relay': 'omnirelay.mp3',
		'station_mount': 'all.mp3',
		'station_alias': 'omniwave.mp3',
		'station_num': 5,
		'stream_name': 'Rainwave All',
		'stream_description':
			'Vote, rate, and request video game music!',
		'stream_url': 'http://all.rainwave.cc'}
}

STATION_CONFIG_TEMPLATE = """
    <relay>
        <server>rainwave.cc</server>
        <port>8000</port>
        <mount>/%(station_source_relay)s</mount>
        <local-mount>/%(station_mount)s</local-mount>
        <on-demand>0</on-demand>
        <relay-shoutcast-metadata>0</relay-shoutcast-metadata>
    </relay>

    <mount>
        <mount-name>/%(station_mount)s</mount-name>
        <!-- <fallback-mount>/offline-%(station_mount)s</fallback-mount>
        <fallback-override>1</fallback-override> -->
        <public>1</public>
        <!-- <max-listeners>(client_limit)s</max-listeners> -->
        <authentication type="url">
            <option name="listener_add" value="http://rainwave.cc/sync/%(station_num)s/listener_add"/>
            <option name="listener_remove" value="http://rainwave.cc/sync/%(station_num)s/listener_remove"/>
            <option name="username" value="user"/>
            <option name="password" value="pass"/>
            <option name="auth_header" value="icecast-auth-user: 1"/>
        </authentication>
        <stream-name>%(stream_name)s</stream-name>
        <stream-description>%(stream_description)s</stream-description>
        <stream-url>%(stream_url)s</stream-url>
    </mount>
"""

print 'ICECAST MOUNT INFO - Paste into icecast.xml'
print '------------------------------------------------------------'
for s in STATIONS:
	print STATION_CONFIG_TEMPLATE % STATIONS[s]
print '------------------------------------------------------------'
print
print 'ALIAS INFO - Paste into icecast.xml, <path> section'
print '------------------------------------------------------------'
for s in STATIONS:
	if STATIONS[s]['station_alias']:
		print "      <alias source=\"/%s\" dest=\"/%s\"/>" % (STATIONS[s]['station_alias'], STATIONS[s]['station_mount'])
print '------------------------------------------------------------'
print 'Make sure you talk to LR and give him:'
print '  1. The IP address of your Icecast server.'
print '  2. The admin login to your Icecast relay.'
print 
print 'Make sure your Icecast config has <burst-on-connect> set to 0.'
print 'No other special attention is required.'
