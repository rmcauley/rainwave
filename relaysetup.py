#!/usr/bin/python

"""Sets up a Rainwave relay when run from the command line.

Author: Cory petosky, cory@petosky.net
Version 1
Last updated 09 August 2011

This script attempts 3 things:

 1. Install icecast2 via apt-get.
 2. Generate correct configuration files based on script arguments.
 3. Start icecast2 and give you the info you need to finish your setup with LR.

Requirements:
  * apt-get
  * Python 2.5+
  * a setup that uses /init.d/icecast2 to start

Run `python relaysetup.py --help` for the argument docs.

For the vast majority of setups, you'll need to run this script via sudo. This
is doubly if you're binding to a port < 1024 -- Linux doesn't give those up to
non-admins. The script generates a config that starts as root and then chroots
to the icecast2:icecast user/group, but of course this won't work without sudo.

Please note that I have only tested this on my own servers, and thus this
might be totally unworkable for anybody but me. In particular, if you want to
customize your Icecast deployment in the slightest, this is almost guaranteed
not to work. In that case, just run it with --dry-run and use the generated
config files as a starting point.

Known issues:

Sometimes, on a fast server, running the command while icecast is running
will cause a weird exit status and a script failure. Just run the script again
a couple times until it works.
"""

import random
import optparse
import subprocess
import time

STATIONS = {
    'rainwave': {
        'station_name': 'rainwave',
        'station_short': 'rw',
        'station_num': 1,
        'stream_name': 'Rainwave Video Game Music',
        'stream_description':
            'Vote, rate, and request your favorite video game tunes!',
        'stream_url': 'http://rainwave.cc'},
    'ocremix': {
        'station_name': 'ocremix',
        'station_short': 'oc',
        'station_num': 2,
        'stream_name': 'OverClocked Remix Radio',
        'stream_description':
            'Vote, rate, and request your favorite OverClocked Remixes!',
        'stream_url': 'http://ocr.rainwave.cc'},
    'mixwave': {
        'station_name': 'mixwave',
        'station_short': 'mw',
        'station_num': 3,
        'stream_name': 'Mixwave Video Game Remix Station',
        'stream_description':
            'Vote, rate, and request video game cover bands and remixes!',
        'stream_url': 'http://mix.rainwave.cc'},
	'bitwave': {
		'station_name': 'bitwave',
		'station_short': 'bit',
		'station_num': 4,
		'stream_name': 'Bitwave Video Game Chiptunes',
		'stream_description':
			'Vote, rate, and request video game chiptunes!',
		'stream_url': 'http://bit.rainwave.cc'},
	'omniwave': {
		'station_name': 'omniwave',
		'station_short': 'omni',
		'station_num': 5,
		'stream_name': 'Omniwave Game Soundtracks and Remixes',
		'stream_description':
			'Vote, rate, and request video game chiptunes!',
		'stream_url': 'http://bit.rainwave.cc'}
}

DAEMON_TEMPLATE = """
CONFIGFILE="/etc/icecast2/icecast.xml"
USERID=%s
GROUPID=%s
ENABLE=true
"""

LISTEN_SOCKET_TEMPLATE = """
    <listen-socket>
        <port>%s</port>
    </listen-socket>
"""

STATION_CONFIG_TEMPLATE = """
    <relay>
        <server>rainwave.cc</server>
        <port>8000</port>
        <mount>/%(station_short)srelay.ogg</mount>
        <local-mount>/%(station_name)s.ogg</local-mount>
        <on-demand>0</on-demand>
        <relay-shoutcast-metadata>0</relay-shoutcast-metadata>
    </relay>

    <mount>
        <mount-name>/%(station_name)s.ogg</mount-name>
        <fallback-mount>/offline-%(station_short)s.ogg</fallback-mount>
        <fallback-override>1</fallback-override>
        <public>1</public>
        <max-listeners>%(client_limit)s</max-listeners>
        <authentication type="url">
            <option name="listener_add" value="http://67.213.72.218/sync/%(station_num)s/listener_add"/>
            <option name="listener_remove" value="http://67.213.72.218/sync/%(station_num)s/listener_remove"/>
            <option name="username" value="user"/>
            <option name="password" value="pass"/>
            <option name="auth_header" value="icecast-auth-user: 1"/>
        </authentication>
        <stream-name>%(stream_name)s</stream-name>
        <stream-description>%(stream_description)s</stream-description>
        <stream-url>%(stream_url)s</stream-url>
    </mount>
	
    <relay>
        <server>rainwave.cc</server>
        <port>8000</port>
        <mount>/%(station_short)srelay.mp3</mount>
        <local-mount>/%(station_name)s.mp3</local-mount>
        <on-demand>0</on-demand>
        <relay-shoutcast-metadata>1</relay-shoutcast-metadata>
    </relay>
	
    <mount>
        <mount-name>/%(station_name)s.mp3</mount-name>
        <fallback-mount>/offline-%(station_short)s.mp3</fallback-mount>
        <fallback-override>1</fallback-override>
        <public>1</public>
        <max-listeners>%(client_limit)s</max-listeners>
        <authentication type="url">
            <option name="listener_add" value="http://67.213.72.218/sync/%(station_num)s/listener_add"/>
            <option name="listener_remove" value="http://67.213.72.218/sync/%(station_num)s/listener_remove"/>
            <option name="username" value="user"/>
            <option name="password" value="pass"/>
            <option name="auth_header" value="icecast-auth-user: 1"/>
        </authentication>
        <stream-name>%(stream_name)s</stream-name>
        <stream-description>%(stream_description)s</stream-description>
        <stream-url>%(stream_url)s</stream-url>
    </mount>
"""

SECURITY_NORMAL = """
    <security>
        <chroot>0</chroot>
    </security>
"""

SECURITY_ROOT = """
    <security>
        <chroot>1</chroot>
        <changeowner>
            <user>icecast2</user>
            <group>icecast</group>
        </changeowner>
    </security>
"""

CONFIG_TEMPLATE = """
<icecast>
    <limits>
        <clients>%(client_limit)s</clients>
        <sources>10</sources>
        <threadpool>5</threadpool>
        <queue-size>524288</queue-size>
        <client-timeout>30</client-timeout>
        <header-timeout>15</header-timeout>
        <source-timeout>10</source-timeout>
        <burst-on-connect>1</burst-on-connect>
        <burst-size>65535</burst-size>
    </limits>

    <authentication>
        <source-password>%(rand_pass)s</source-password>
        <relay-password>%(rand_pass)s</relay-password>
        <admin-user>admin</admin-user>
        <admin-password>%(rand_pass)s</admin-password>
    </authentication>

    <hostname>%(hostname)s</hostname>
    %(listen_sockets)s
    %(station_configs)s
    <fileserve>1</fileserve>

    <paths>
        <basedir>/</basedir>
        <logdir>/var/log/icecast2</logdir>
        <webroot>/usr/share/icecast2/web</webroot>
        <adminroot>/usr/share/icecast2/admin</adminroot>
        <alias source="/" dest="/status.xsl"/>
    </paths>

    <logging>
        <accesslog>access.log</accesslog>
        <errorlog>error.log</errorlog>
        <loglevel>3</loglevel>
        <logsize>10000</logsize>
    </logging>
    %(security)s
</icecast>
"""

COMPLETE_TEMPLATE = """
Complete.
Give LiquidRain:
  * your IP address
  * your hostname: %(hostname)s
  * this password: %(password)s

If you made a configuration mistake, just re-run this setup script.
Note that this will generate and save a new password; either update the
configs manually or pass `--password=<current password>` to the script.
"""

def make_listen_sockets(ports):
    return ''.join(LISTEN_SOCKET_TEMPLATE % port for port in ports)


def make_station_config(station_name, limit):
    template_args = STATIONS[station_name]
    template_args['client_limit'] = limit
    return STATION_CONFIG_TEMPLATE % template_args


def make_station_configs(station, limit):
    if station == 'all':
        stations = STATIONS.iterkeys()
    else:
        stations = [station]
    return ''.join(make_station_config(s, limit) for s in stations)


def make_rand_pass():
    pass_chars = 'abcdefghjkmnpqrstuvwxyz1234567890!@#$^'
    rand_pass = ''
    for x in xrange(16):
       rand_pass += random.choice(pass_chars)
    return rand_pass


def do_it(station, limit, hostname, ports, password=None, dry_run=False):
    if not dry_run:
        subprocess.check_call(['apt-get install icecast2 ices2'], shell=True)
        subprocess.check_call(['/etc/init.d/icecast2 stop'], shell=True)

    template_args = {}
    template_args['client_limit'] = limit
    template_args['hostname'] = hostname
    template_args['listen_sockets'] = make_listen_sockets(ports)
    template_args['station_configs'] = make_station_configs(station, limit)
    template_args['rand_pass'] = password or make_rand_pass()

    # Gotta start servers as root and then chroot on protected ports.
    if min(ports) <= 1024:
        template_args['security'] = SECURITY_ROOT
        daemon_file_text = DAEMON_TEMPLATE % ('root', 'root')
    else:
        template_args['security'] = SECURITY_NORMAL
        daemon_file_text = DAEMON_TEMPLATE % ('icecast2', 'icecast')

    if not dry_run:
        config_file = open('/etc/icecast2/icecast.xml', 'w')
        config_file.write(CONFIG_TEMPLATE % template_args)
        config_file.close()

        daemon_file = open('/etc/default/icecast2', 'w')
        daemon_file.write(daemon_file_text)
        daemon_file.close()

        print 'Waiting to start icecast...'
        time.sleep(1)
        subprocess.check_call(['/etc/init.d/icecast2 start'], shell=True)
    else:
        print 'ICECAST CONFIG FILE'
        print '------------------------------------------------------------'
        print CONFIG_TEMPLATE % template_args
        print
        print
        print
        print 'DAEMON CONFIG FILE'
        print '------------------------------------------------------------'
        print daemon_file_text


    print
    print
    print COMPLETE_TEMPLATE  % {
            'password': template_args['rand_pass'],
            'hostname': template_args['hostname']}

if __name__ == '__main__':
    parser = optparse.OptionParser()
    parser.add_option(
            '-s', '--station', default='all', type='choice',
            choices=STATIONS.keys() + ['all'],
            help='the station relay to set up')
    parser.add_option(
            '-l', '--limit', default=100, type='int',
            help='max connected clients (across all stations)')
    parser.add_option(
            '-n', '--hostname', default='localhost',
            help='hostname of this relay')
    parser.add_option(
            '-p', '--port', type='int', action='append', dest='ports',
            help='port to listen on; provide multiple times for many ports')
    parser.add_option(
            '-x', '--password',
            help='user a specific connect password (advanced)')
    parser.add_option(
            '-d', '--dry-run', default=False, action='store_true',
            help="just print the output, don't actually do anything")
    (options, args) = parser.parse_args()
    if not options.ports:
        options.ports = [8000]
    
    do_it(
            options.station, options.limit, options.hostname, options.ports,
            options.password, options.dry_run)

