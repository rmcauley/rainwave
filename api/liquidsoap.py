import socket
import os, os.path

from api.exceptions import APIException
from libs import config

def _send_command(sid, cmd):
	if not config.has_station(sid, "liquidsoap_socket_path"):
		return ""
	cmd += "\n"
	socket_path = config.get_station(sid, "liquidsoap_socket_path")
	if os.path.exists(socket_path):
		client = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
		client.connect(socket_path)
		client.send(cmd)
		to_ret = client.recv(1024)
		client.send("exit")
		client.close()
		to_ret = to_ret.strip().strip("END").strip()
		return to_ret
	else:
		raise APIException("internal_error", "Could not connect to Liquidsoap. (station %s)" % sid)

# def pause(sid):
# 	return _send_command(sid, "var.set paused = true")

# def unpause(sid):
# 	return _send_command(sid, "var.set paused = false")

def skip(sid):
	return _send_command(sid, "%s(dot)mp3.skip" % config.get_station(sid, "stream_filename"))

def set_password(sid, password):
	return _send_command(sid, "var.set harbor_pw = \"%s\"" % password)

def get_password(sid, password):
	return _send_command(sid, "var.get harbor_pw")

def kick_dj(sid):
	return _send_command(sid, "dj_harbor.kick")

def test(sid):
	return _send_command(sid, "version")