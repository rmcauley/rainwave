import socket
import os, os.path

from libs import config

def _get_socket(sid):
	client = None
	if hasattr(socket,"AF_UNIX") and config.has_station(sid, "liquidsoap_socket_path") and os.path.exists(config.get_station(sid, "liquidsoap_socket_path")):
		client = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
		client.connect(config.get_station(sid, "liquidsoap_socket_path"))
	elif config.has_station(sid, "liquidsoap_telnet_host"):
		client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    	client.settimeout(2)
    	client.connect((config.get_station(sid, "liquidsoap_telnet_host"), config.get_station(sid, "liquidsoap_telnet_port")))
	return client

def _send_command(sid, cmd):
	if not config.has_station(sid, "liquidsoap_socket_path") and not config.has_station(sid, "liquidsoap_telnet_host"):
		return ""

	client = _get_socket(sid)
	if not client:
		return ""

	cmd += "\n"
	client.send(cmd)
	to_ret = client.recv(1024)
	client.send("exit")
	client.close()
	to_ret = to_ret.strip().strip("END").strip()
	return to_ret

# def pause(sid):
# 	return _send_command(sid, "var.set paused = true")

# def unpause(sid):
# 	return _send_command(sid, "var.set paused = false")

def skip(sid):
	return _send_command(sid, "%s(dot)mp3.skip" % config.get_station(sid, "stream_filename"))

def set_password(sid, password):
	return _send_command(sid, "var.set harbor_pw = \"%s\"" % password)

def get_password(sid):
	return _send_command(sid, "var.get harbor_pw")

def kick_dj(sid):
	return _send_command(sid, "dj_harbor.kick")

def test(sid):
	return _send_command(sid, "version")