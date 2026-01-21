from src_backend.config import config
import api_web.web
from api_web.urls import handle_url
from routes.admin_web.index import AlbumList
from routes.admin_web.index import SongList


@handle_url("/admin/tools/cooldown")
class CooldownTool(api_web.web.HTMLRequest):
    admin_required = True

    def get(self):
        self.write(
            self.render_string(
                "bare_header.html",
                title="%s Cooldown Tool" % config.station_id_friendly[self.sid],
            )
        )
        self.write("<script>\nwindow.top.refresh_all_screens = true;\n</script>")
        self.write("<h2>%s Cooldown Tool</h2>" % config.station_id_friendly[self.sid])
        self.write(
            "<script>\nif (window.top.current_station != window.top.current_restriction) {\n document.body.style.background = '#660000';\n document.write('Match your selected station to \"with songs from\" or Rob will be angry with you.'); }\n</script>"
        )
        self.write(self.render_string("basic_footer.html"))


@handle_url("/admin/album_list/cooldown")
class CooldownAlbumList(AlbumList):
    def render_row_special(self, row):
        if row["cool_override"] == None:
            row["cool_override"] = ""
        self.write(
            "<td>x<input type='text' id='multiply_%s' style='width: 3em;' value='%s'></td>"
            % (row["id"], row["cool_multiply"])
        )
        self.write(
            "<td><input type='text' id='override_%s' style='width: 7em;' value='%s'></td>"
            % (row["id"], row["cool_override"])
        )
        self.write(
            "<td><a onclick=\"window.top.call_api('admin/set_album_cooldown', "
            "{ 'album_id': %s, 'multiply': document.getElementById('multiply_%s').value, 'override': document.getElementById('override_%s').value })\">Update</a>"
            "</td>" % (row["id"], row["id"], row["id"])
        )
        self.write(
            "<td><a onclick=\"window.top.call_api('admin/reset_album_cooldown', { 'album_id': %s })\">Reset</a>"
            % row["id"]
        )
        self.write(self.render_string("basic_footer.html"))


@handle_url("/admin/song_list/cooldown")
class CooldownSongList(SongList):
    def render_row_special(self, row):
        if row["cool_override"] == None:
            row["cool_override"] = ""
        self.write(
            "<td>x<input type='text' id='multiply_%s' style='width: 3em;' value='%s'></td>"
            % (row["id"], row["cool_multiply"])
        )
        self.write(
            "<td><input type='text' id='override_%s' style='width: 7em;' value='%s'></td>"
            % (row["id"], row["cool_override"])
        )
        self.write(
            "<td><a onclick=\"window.top.call_api('admin/set_song_cooldown', "
            "{ 'song_id': %s, 'multiply': document.getElementById('multiply_%s').value, 'override': document.getElementById('override_%s').value })\">Update</a>"
            "</td>" % (row["id"], row["id"], row["id"])
        )
        self.write(
            "<td><a onclick=\"window.top.call_api('admin/reset_song_cooldown', { 'song_id': %s })\">Reset</a>"
            % row["id"]
        )
        self.write(self.render_string("basic_footer.html"))
