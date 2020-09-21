try:
    import ujson as json
except ImportError:
    import json

import tornado.web

from api.web import HTMLRequest
from api.urls import handle_url
from libs import config


@handle_url("/manifest.json")
class ManifestJSON(HTMLRequest):
    help_hidden = True
    sid_required = False
    auth_required = False
    allow_get = True

    def get(self):
        if not self.sid in config.station_ids:
            raise tornado.web.HTTPError(404)
        self.set_header("Content-Type", "application/x-web-app-manifest+json")
        m = {
            "lang": self.locale.code[:2],
            "short_name": config.station_id_friendly[self.sid],
            "name": "Rainwave %s" % config.station_id_friendly[self.sid],
            "description": self.locale.translate(
                "station_description_id_%s" % self.sid
            ),
            "launch_path": "/",
            "start_url": "/",
            "developer": {"name": "Rainwave", "url": "https://rainwave.cc"},
            "fullscreen": True,
            "orientation": "portrait",
            "display": "standalone",
            "theme_color": "#1978B7",
            "background_color": "#000",
            "splash_screens": [
                {"src": "/static/images4/logo_white.png", "sizes": "512x512"}
            ],
            "icons": [
                {
                    "src": "/static/images4/android/32.png",
                    "sizes": "32x32",
                    "type": "image/png",
                },
                {
                    "src": "/static/images4/android/48.png",
                    "sizes": "48x48",
                    "type": "image/png",
                },
                {
                    "src": "/static/images4/android/128.png",
                    "sizes": "128x128",
                    "type": "image/png",
                },
                {
                    "src": "/static/images4/android/256.png",
                    "sizes": "256x256",
                    "type": "image/png",
                },
                {
                    "src": "/static/images4/android/384.png",
                    "sizes": "384x384",
                    "type": "image/png",
                },
                {
                    "src": "/static/images4/android/512.png",
                    "sizes": "512x512",
                    "type": "image/png",
                },
            ],
        }
        self.write(json.dumps(m, ensure_ascii=False))
