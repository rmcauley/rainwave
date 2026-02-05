from backend import config
import web_api.web
from web_api.urls import handle_url
from routes.admin_web.index import AlbumList
from routes.admin_web.index import SongList


@handle_url("/admin/tools/song_request_only")
class SongRequestOnlyTool(web_api.web.HTMLRequest):
    admin_required = True

    def get(self):
        self.write(
            self.render_string(
                "bare_header.html",
                title="%s Request Only Tool" % config.station_id_friendly[self.sid],
            )
        )
        self.write(
            "<h2>%s Request Only Tool</h2>" % config.station_id_friendly[self.sid]
        )
        self.write(
            "<script>\nif (window.top.current_station != window.top.current_restriction) {\n document.body.style.background = '#660000';\n document.write('Match your selected station to \"with songs from\" or Rob will be angry with you.'); }\n</script>"
        )
        self.write("<script>\nwindow.top.refresh_all_screens = true;\n</script>")
        self.write(self.render_string("basic_footer.html"))


@handle_url("/admin/album_list/song_request_only")
class SongRequestOnlyAlbumList(AlbumList):
    pass


@handle_url("/admin/song_list/song_request_only")
class SongRequestOnlyList(SongList):
    def render_row_special(self, row):
        if row["request_only_end"] == None:
            self.write(
                "<td style='background: #880000;'><a onclick=\"window.top.call_api('admin/set_song_request_only', { 'song_id': %s, 'request_only': false })\">DISABLE</a>"
                % (row["id"])
            )
        else:
            self.write(
                "<td><a onclick=\"window.top.call_api('admin/set_song_request_only', { 'song_id': %s, 'request_only': true })\">enable</a>"
                % (row["id"],)
            )
