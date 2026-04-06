# pyright: reportAttributeAccessIssue=false, reportPrivateUsage=false, reportUnknownLambdaType=false, reportMissingSuperCall=false, reportUninitializedInstanceVariable=false

import asyncio
import sys
from contextlib import asynccontextmanager
from enum import IntEnum
from types import ModuleType
from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock, mock_open, patch


def _install_watchfiles_stub() -> None:
    watchfiles: Any = ModuleType("watchfiles")

    class Change(IntEnum):
        added = 1
        modified = 2
        deleted = 3

    async def awatch(*args: object, **kwargs: object):
        if False:
            yield set()

    watchfiles.Change = Change
    watchfiles.awatch = awatch
    sys.modules["watchfiles"] = watchfiles


_install_watchfiles_stub()

from watchfiles import Change

from scanner.exceptions import NonFatalScannerError
from scanner.file_monitor.file_event_handler import process_change, process_path
from scanner.file_monitor.file_monitor import file_monitor
from scanner.full_art_scan import full_art_update
from scanner.full_scan import full_scan
from scanner.get_tags_from_song import (
    MissingID3TagError,
    TagsFromFile,
    get_tag,
    load_tag_from_file,
)
from scanner.album_art import (
    AlbumArt,
    get_album_art_path,
    process_album_art,
    process_unmatched_art,
    reconcile_album_art,
    unmatched_art,
    write_unmatched_art_log,
)
from scanner.scan_errors import add_scan_error, get_music_scan_errors
from scanner.scan_directory import scan_directory
from scanner.scan_file import scan_file


@asynccontextmanager
async def _cursor_context(cursor: object):
    yield cursor


class _FakeTags:
    def __init__(self, values: dict[str, list[str]]) -> None:
        super().__init__()
        self._values = values

    def getall(self, tag: str) -> list[str]:
        return self._values.get(tag, [])


class _BrokenSongDirs:
    def items(self) -> object:
        raise RuntimeError("boom")


def test_get_tag_returns_last_non_empty_value() -> None:
    tags = _FakeTags({"TIT2": ["  ", "Song Title "]})
    assert get_tag(tags, "TIT2") == "Song Title"
    assert get_tag(tags, "TPE1") is None


def test_load_tag_from_file_success() -> None:
    fake_mp3 = SimpleNamespace(
        tags=_FakeTags(
            {
                "TIT2": ["Song"],
                "TPE1": ["Artist"],
                "TALB": ["Album"],
                "TCON": ["Genre"],
                "COMM": ["Comment"],
                "WXXX": ["https://example.com"],
            }
        ),
        info=SimpleNamespace(length=123.4),
    )
    with (
        patch("scanner.get_tags_from_song.open", mock_open(read_data=b"mp3-bytes")),
        patch("scanner.get_tags_from_song.MP3", return_value=fake_mp3),
    ):
        tags = load_tag_from_file("song.mp3")

    assert tags == TagsFromFile(
        title="Song",
        album="Album",
        artist="Artist",
        genre="Genre",
        comment="Comment",
        url="https://example.com",
        length=123,
    )


def test_load_tag_from_file_missing_title_raises() -> None:
    fake_mp3 = SimpleNamespace(
        tags=_FakeTags({"TPE1": ["Artist"], "TALB": ["Album"]}),
        info=SimpleNamespace(length=123.4),
    )
    with (
        patch("scanner.get_tags_from_song.open", mock_open(read_data=b"mp3-bytes")),
        patch("scanner.get_tags_from_song.MP3", return_value=fake_mp3),
    ):
        try:
            load_tag_from_file("song.mp3")
        except MissingID3TagError as exc:
            assert "no title tag" in str(exc)
        else:
            raise AssertionError("MissingID3TagError was not raised")


def test_load_tag_from_file_missing_tags_artist_and_album_raise() -> None:
    fake_mp3 = SimpleNamespace(tags=None, info=SimpleNamespace(length=10.0))
    with (
        patch("scanner.get_tags_from_song.open", mock_open(read_data=b"mp3-bytes")),
        patch("scanner.get_tags_from_song.MP3", return_value=fake_mp3),
    ):
        try:
            load_tag_from_file("song.mp3")
        except MissingID3TagError as exc:
            assert "has no tags" in str(exc)
        else:
            raise AssertionError("MissingID3TagError was not raised")

    fake_mp3 = SimpleNamespace(
        tags=_FakeTags({"TIT2": ["Song"], "TALB": ["Album"]}),
        info=SimpleNamespace(length=10.0),
    )
    with (
        patch("scanner.get_tags_from_song.open", mock_open(read_data=b"mp3-bytes")),
        patch("scanner.get_tags_from_song.MP3", return_value=fake_mp3),
    ):
        try:
            load_tag_from_file("song.mp3")
        except MissingID3TagError as exc:
            assert "no artist tag" in str(exc)
        else:
            raise AssertionError("MissingID3TagError was not raised")

    fake_mp3 = SimpleNamespace(
        tags=_FakeTags({"TIT2": ["Song"], "TPE1": ["Artist"]}),
        info=SimpleNamespace(length=10.0),
    )
    with (
        patch("scanner.get_tags_from_song.open", mock_open(read_data=b"mp3-bytes")),
        patch("scanner.get_tags_from_song.MP3", return_value=fake_mp3),
    ):
        try:
            load_tag_from_file("song.mp3")
        except MissingID3TagError as exc:
            assert "no album tag" in str(exc)
        else:
            raise AssertionError("MissingID3TagError was not raised")


def test_file_monitor_processes_changes_from_watchfiles() -> None:
    process_change_mock = AsyncMock()

    async def _fake_awatch(*args: object, **kwargs: object):
        yield {
            (Change.added, "/music/station/newdir"),
            (Change.modified, "/music/station/song.mp3"),
        }

    with (
        patch("scanner.file_monitor.file_monitor.awatch", _fake_awatch),
        patch(
            "scanner.file_monitor.file_monitor.process_change",
            new=process_change_mock,
        ),
        patch(
            "scanner.file_monitor.file_monitor._load_known_directories",
            return_value={"/music/station"},
        ),
    ):
        asyncio.run(file_monitor())

    assert process_change_mock.await_count == 2


def test_file_monitor_logs_shutdown_on_errors() -> None:
    process_change_mock = AsyncMock()

    async def _fake_awatch(*args: object, **kwargs: object):
        yield {(Change.modified, "/music/station/song.mp3")}
        raise RuntimeError("watch failed")

    with (
        patch("scanner.file_monitor.file_monitor.awatch", _fake_awatch),
        patch(
            "scanner.file_monitor.file_monitor.process_change",
            new=process_change_mock,
        ),
        patch(
            "scanner.file_monitor.file_monitor._load_known_directories",
            return_value={"/music/station"},
        ),
        patch("scanner.file_monitor.file_monitor.log.info") as info_log,
    ):
        try:
            asyncio.run(file_monitor())
        except RuntimeError as exc:
            assert str(exc) == "watch failed"
        else:
            raise AssertionError("RuntimeError was not raised")

    assert info_log.call_args_list[0].args == ("scan", "File monitor started.")
    assert info_log.call_args_list[-1].args == ("scan", "File monitor shutdown.")


def test_file_event_handler_process_change_branches() -> None:
    known_directories = {"/music/station/olddir"}

    with (
        patch(
            "scanner.file_monitor.file_event_handler.os.path.isdir", return_value=True
        ),
        patch(
            "scanner.file_monitor.file_event_handler.remember_directory_tree"
        ) as remember_mock,
        patch(
            "scanner.file_monitor.file_event_handler.process_path", new=AsyncMock()
        ) as process_mock,
    ):
        asyncio.run(
            process_change(Change.added, "/music/station/newdir", known_directories)
        )
    remember_mock.assert_called_once_with("/music/station/newdir", known_directories)
    process_mock.assert_awaited_once_with(
        Change.added, "/music/station/newdir", is_directory=True
    )

    with (
        patch(
            "scanner.file_monitor.file_event_handler.os.path.isdir", return_value=False
        ),
        patch(
            "scanner.file_monitor.file_event_handler.forget_directory_tree"
        ) as forget_mock,
        patch(
            "scanner.file_monitor.file_event_handler.process_path", new=AsyncMock()
        ) as process_mock,
    ):
        asyncio.run(
            process_change(Change.deleted, "/music/station/olddir", known_directories)
        )
    forget_mock.assert_called_once_with("/music/station/olddir", known_directories)
    process_mock.assert_awaited_once_with(
        Change.deleted, "/music/station/olddir", is_directory=True
    )

    with (
        patch(
            "scanner.file_monitor.file_event_handler.os.path.isdir", return_value=False
        ),
        patch("scanner.file_monitor.file_event_handler.is_mp3", return_value=False),
        patch(
            "scanner.file_monitor.file_event_handler.process_path", new=AsyncMock()
        ) as process_mock,
    ):
        asyncio.run(process_change(Change.deleted, "/music/station/readme.txt", set()))
    process_mock.assert_not_called()

    with (
        patch(
            "scanner.file_monitor.file_event_handler.os.path.isdir", return_value=False
        ),
        patch("scanner.file_monitor.file_event_handler.is_mp3", return_value=True),
        patch(
            "scanner.file_monitor.file_event_handler.process_path", new=AsyncMock()
        ) as process_mock,
    ):
        asyncio.run(process_change(Change.modified, "/music/station/song.mp3", set()))
    process_mock.assert_awaited_once_with(
        Change.modified, "/music/station/song.mp3", is_directory=False
    )


def test_file_event_handler_process_async_routes_delete_and_scan() -> None:
    cursor = AsyncMock()
    change = Change.deleted
    path = "/music/station/song.mp3"
    with (
        patch(
            "scanner.file_monitor.file_event_handler.should_ignore_file",
            return_value=False,
        ),
        patch(
            "scanner.file_monitor.file_event_handler.get_cursor",
            side_effect=lambda: _cursor_context(cursor),
        ),
        patch(
            "scanner.file_monitor.file_event_handler.disable_file", new=AsyncMock()
        ) as disable_file_mock,
        patch(
            "scanner.file_monitor.file_event_handler.scan_file", new=AsyncMock()
        ) as scan_file_mock,
        patch(
            "scanner.file_monitor.file_event_handler.scan_directory", new=AsyncMock()
        ) as scan_directory_mock,
        patch(
            "scanner.file_monitor.file_event_handler.add_scan_error", new=AsyncMock()
        ) as add_scan_error_mock,
        patch(
            "scanner.file_monitor.file_event_handler.config.song_dirs",
            {"/music/station/": [1]},
        ),
    ):
        asyncio.run(process_path(change, path, is_directory=False))

    disable_file_mock.assert_awaited_once_with(cursor, path)
    scan_file_mock.assert_not_called()
    scan_directory_mock.assert_not_called()
    add_scan_error_mock.assert_not_called()


def test_file_event_handler_process_async_scans_directory_and_ignores() -> None:
    cursor = AsyncMock()
    path = "/music/station/newdir"
    with (
        patch(
            "scanner.file_monitor.file_event_handler.should_ignore_file",
            return_value=False,
        ),
        patch(
            "scanner.file_monitor.file_event_handler.get_cursor",
            side_effect=lambda: _cursor_context(cursor),
        ),
        patch(
            "scanner.file_monitor.file_event_handler.disable_file", new=AsyncMock()
        ) as disable_file_mock,
        patch(
            "scanner.file_monitor.file_event_handler.scan_file", new=AsyncMock()
        ) as scan_file_mock,
        patch(
            "scanner.file_monitor.file_event_handler.scan_directory", new=AsyncMock()
        ) as scan_directory_mock,
        patch(
            "scanner.file_monitor.file_event_handler.add_scan_error", new=AsyncMock()
        ),
        patch(
            "scanner.file_monitor.file_event_handler.config.song_dirs",
            {"/music/station/": [1]},
        ),
    ):
        asyncio.run(process_path(Change.added, path, is_directory=True))

    scan_directory_mock.assert_awaited_once_with(cursor, path, [1])
    disable_file_mock.assert_not_called()
    scan_file_mock.assert_not_called()


def test_file_event_handler_process_async_logs_song_dir_and_scan_errors() -> None:
    cursor = AsyncMock()
    path = "/music/station/song.mp3"
    with (
        patch(
            "scanner.file_monitor.file_event_handler.should_ignore_file",
            return_value=False,
        ),
        patch(
            "scanner.file_monitor.file_event_handler.get_cursor",
            side_effect=lambda: _cursor_context(cursor),
        ),
        patch(
            "scanner.file_monitor.file_event_handler.disable_file", new=AsyncMock()
        ) as disable_file_mock,
        patch(
            "scanner.file_monitor.file_event_handler.scan_file",
            new=AsyncMock(side_effect=RuntimeError("scan failed")),
        ),
        patch(
            "scanner.file_monitor.file_event_handler.scan_directory", new=AsyncMock()
        ) as scan_directory_mock,
        patch(
            "scanner.file_monitor.file_event_handler.add_scan_error", new=AsyncMock()
        ) as add_scan_error_mock,
        patch(
            "scanner.file_monitor.file_event_handler.config.song_dirs",
            _BrokenSongDirs(),
        ),
    ):
        asyncio.run(process_path(Change.modified, path, is_directory=False))

    disable_file_mock.assert_awaited_once_with(cursor, path)
    scan_directory_mock.assert_not_called()
    assert add_scan_error_mock.await_count == 1


def test_file_event_handler_process_async_reports_scan_failure() -> None:
    cursor = AsyncMock()
    path = "/music/station/song.mp3"
    with (
        patch(
            "scanner.file_monitor.file_event_handler.should_ignore_file",
            return_value=False,
        ),
        patch(
            "scanner.file_monitor.file_event_handler.get_cursor",
            side_effect=lambda: _cursor_context(cursor),
        ),
        patch(
            "scanner.file_monitor.file_event_handler.disable_file", new=AsyncMock()
        ) as disable_file_mock,
        patch(
            "scanner.file_monitor.file_event_handler.scan_file",
            new=AsyncMock(side_effect=RuntimeError("scan failed")),
        ),
        patch(
            "scanner.file_monitor.file_event_handler.scan_directory", new=AsyncMock()
        ),
        patch(
            "scanner.file_monitor.file_event_handler.add_scan_error", new=AsyncMock()
        ) as add_scan_error_mock,
        patch(
            "scanner.file_monitor.file_event_handler.config.song_dirs",
            {"/music/station/": [1]},
        ),
    ):
        asyncio.run(process_path(Change.modified, path, is_directory=False))

    disable_file_mock.assert_not_called()
    add_scan_error_mock.assert_awaited_once()


def test_scan_file_branches() -> None:
    cursor = AsyncMock()

    with (
        patch("scanner.scan_file.is_image", return_value=True),
        patch(
            "scanner.scan_file.process_album_art", new=AsyncMock()
        ) as process_album_art_mock,
    ):
        asyncio.run(scan_file(cursor, "cover.jpg", [1]))
    process_album_art_mock.assert_awaited_once_with(cursor, "cover.jpg", 1)

    with (
        patch("scanner.scan_file.is_image", return_value=False),
        patch("scanner.scan_file.is_mp3", return_value=False),
    ):
        asyncio.run(scan_file(cursor, "notes.txt", [1]))

    cursor.fetch_var = AsyncMock(return_value=111)
    with (
        patch("scanner.scan_file.is_image", return_value=False),
        patch("scanner.scan_file.is_mp3", return_value=True),
        patch("scanner.scan_file.os.stat", return_value=[0, 0, 0, 0, 0, 0, 0, 0, 999]),
        patch(
            "scanner.scan_file.process_unmatched_art", new=AsyncMock()
        ) as process_unmatched_art_mock,
        patch(
            "scanner.scan_file.SongFile.create", new=AsyncMock()
        ) as create_song_file_mock,
    ):
        song_file = AsyncMock()
        create_song_file_mock.return_value = song_file
        asyncio.run(scan_file(cursor, "song.mp3", [1]))
    song_file.upsert.assert_awaited_once_with(cursor, [1], 1)
    process_unmatched_art_mock.assert_awaited_once_with(cursor)


def test_scan_file_mtime_match_and_error_paths() -> None:
    cursor = AsyncMock()
    cursor.fetch_var = AsyncMock(return_value=999)

    with (
        patch("scanner.scan_file.is_image", return_value=False),
        patch("scanner.scan_file.is_mp3", return_value=True),
        patch("scanner.scan_file.os.stat", return_value=[0, 0, 0, 0, 0, 0, 0, 0, 999]),
        patch(
            "scanner.scan_file.process_unmatched_art", new=AsyncMock()
        ) as process_unmatched_art_mock,
        patch("scanner.scan_file.disable_file", new=AsyncMock()) as disable_file_mock,
        patch(
            "scanner.scan_file.add_scan_error", new=AsyncMock()
        ) as add_scan_error_mock,
    ):
        asyncio.run(scan_file(cursor, "song.mp3", [1]))

    cursor.update.assert_awaited_once()
    process_unmatched_art_mock.assert_awaited_once_with(cursor)
    disable_file_mock.assert_not_called()
    add_scan_error_mock.assert_not_called()

    cursor = AsyncMock()
    cursor.fetch_var = AsyncMock(return_value=None)
    with (
        patch("scanner.scan_file.is_image", return_value=False),
        patch("scanner.scan_file.is_mp3", return_value=True),
        patch("scanner.scan_file.os.stat", side_effect=IOError("missing")),
        patch(
            "scanner.scan_file.process_unmatched_art", new=AsyncMock()
        ) as process_unmatched_art_mock,
        patch("scanner.scan_file.disable_file", new=AsyncMock()) as disable_file_mock,
        patch(
            "scanner.scan_file.add_scan_error", new=AsyncMock()
        ) as add_scan_error_mock,
        patch(
            "scanner.scan_file.SongFile.create",
            new=AsyncMock(side_effect=IOError("bad mp3")),
        ),
    ):
        asyncio.run(scan_file(cursor, "song.mp3", [1]))

    assert add_scan_error_mock.await_count == 2
    assert disable_file_mock.await_count == 2
    process_unmatched_art_mock.assert_not_called()

    cursor = AsyncMock()
    cursor.fetch_var = AsyncMock(return_value=None)
    with (
        patch("scanner.scan_file.is_image", return_value=False),
        patch("scanner.scan_file.is_mp3", return_value=True),
        patch("scanner.scan_file.os.stat", return_value=[0, 0, 0, 0, 0, 0, 0, 0, 111]),
        patch(
            "scanner.scan_file.process_unmatched_art",
            new=AsyncMock(side_effect=RuntimeError("post-process failed")),
        ),
        patch("scanner.scan_file.disable_file", new=AsyncMock()) as disable_file_mock,
        patch(
            "scanner.scan_file.add_scan_error", new=AsyncMock()
        ) as add_scan_error_mock,
        patch(
            "scanner.scan_file.SongFile.create", new=AsyncMock(return_value=AsyncMock())
        ),
    ):
        asyncio.run(scan_file(cursor, "song.mp3", [1]))

    add_scan_error_mock.assert_awaited_once()
    disable_file_mock.assert_awaited_once()


def test_scan_directory_existing_and_missing_paths() -> None:
    cursor = AsyncMock()
    cursor.fetch_list = AsyncMock(side_effect=[[11], [22]])

    with (
        patch("scanner.scan_directory.os.stat", return_value=object()),
        patch(
            "scanner.scan_directory.os.walk", return_value=[("/music", [], ["a.mp3"])]
        ),
        patch("scanner.scan_directory.scan_file", new=AsyncMock()) as scan_file_mock,
        patch(
            "scanner.scan_directory.disable_song", new=AsyncMock()
        ) as disable_song_mock,
    ):
        asyncio.run(scan_directory(cursor, "/music", [1]))

    scan_file_mock.assert_awaited_once_with(cursor, "/music/a.mp3", [1])
    disable_song_mock.assert_awaited_once_with(cursor, 22)

    cursor.fetch_list = AsyncMock(side_effect=[[], [33]])
    with (
        patch("scanner.scan_directory.os.stat", side_effect=OSError("missing")),
        patch("scanner.scan_directory.scan_file", new=AsyncMock()) as scan_file_mock,
        patch(
            "scanner.scan_directory.disable_song", new=AsyncMock()
        ) as disable_song_mock,
    ):
        asyncio.run(scan_directory(cursor, "/missing", [1]))

    scan_file_mock.assert_not_called()
    disable_song_mock.assert_awaited_once_with(cursor, 33)


def test_full_scan_and_full_art_update() -> None:
    tx_cursor = AsyncMock()
    read_cursor = AsyncMock()
    tx_cursor.fetch_list = AsyncMock(return_value=[7, 8])

    with (
        patch(
            "scanner.full_scan.get_tx_cursor",
            side_effect=lambda: _cursor_context(tx_cursor),
        ),
        patch(
            "scanner.full_scan.scan_all_directories", new=AsyncMock()
        ) as scan_all_directories_mock,
        patch("scanner.full_scan.disable_song", new=AsyncMock()) as disable_song_mock,
        patch(
            "scanner.full_scan.process_unmatched_art", new=AsyncMock()
        ) as process_unmatched_art_mock,
        patch("scanner.full_scan.write_unmatched_art_log") as write_unmatched_art_log,
    ):
        asyncio.run(full_scan(True))

    tx_cursor.update.assert_any_await("UPDATE r4_songs SET song_file_mtime = 0")
    scan_all_directories_mock.assert_awaited_once_with(tx_cursor, art_only=False)
    assert disable_song_mock.await_count == 2
    process_unmatched_art_mock.assert_awaited_once_with(tx_cursor)
    write_unmatched_art_log.assert_called_once()

    with (
        patch(
            "scanner.full_art_scan.get_cursor",
            side_effect=lambda: _cursor_context(read_cursor),
        ),
        patch(
            "scanner.full_art_scan.scan_all_directories", new=AsyncMock()
        ) as scan_all_directories_mock,
        patch(
            "scanner.full_art_scan.process_unmatched_art", new=AsyncMock()
        ) as process_unmatched_art_mock,
        patch(
            "scanner.full_art_scan.write_unmatched_art_log"
        ) as write_unmatched_art_log,
    ):
        asyncio.run(full_art_update())

    scan_all_directories_mock.assert_awaited_once_with(read_cursor, art_only=True)
    process_unmatched_art_mock.assert_awaited_once_with(read_cursor)
    write_unmatched_art_log.assert_called_once()


def test_album_art_helpers_and_reconcile() -> None:
    assert get_album_art_path(2, 5).endswith("2_5_320.jpg")

    cursor = AsyncMock()
    cursor.fetch_list = AsyncMock(return_value=[1, 2])
    with (
        patch("scanner.album_art.config.album_art_order", {1: [3, 1], 2: [2]}),
        patch(
            "scanner.album_art.os.path.exists",
            side_effect=lambda path: path.endswith("1_7_320.jpg")
            or path.endswith("2_7_320.jpg"),
        ),
    ):
        asyncio.run(reconcile_album_art(cursor, 7))

    assert cursor.update.await_count == 2

    cursor = AsyncMock()
    cursor.fetch_list = AsyncMock(return_value=[1])
    with (
        patch("scanner.album_art.config.album_art_order", {1: [3, 1]}),
        patch("scanner.album_art.os.path.exists", return_value=False),
    ):
        asyncio.run(reconcile_album_art(cursor, 7))
    cursor.update.assert_not_called()


def test_write_unmatched_art_log_and_process_unmatched_art() -> None:
    unmatched_art.clear()
    unmatched_art.extend([AlbumArt("a.jpg", 1), AlbumArt("b.jpg", 2)])

    with (
        patch("scanner.album_art.config.log_dir", "/tmp"),
        patch("scanner.album_art.open", mock_open()) as open_mock,
    ):
        write_unmatched_art_log()

    handle = open_mock()
    handle.write.assert_any_call("a.jpg")
    handle.write.assert_any_call("b.jpg")

    cursor = AsyncMock()
    with patch(
        "scanner.album_art.process_album_art", new=AsyncMock()
    ) as process_album_art_mock:
        asyncio.run(process_unmatched_art(cursor))

    assert process_album_art_mock.await_count == 2
    unmatched_art.clear()

    with patch("scanner.album_art.config.log_dir", None):
        write_unmatched_art_log()


def test_process_album_art_success_and_error_paths() -> None:
    class FakeImage:
        def __init__(self) -> None:
            self.mode = "RGBA"
            self.size = (800, 300)

        def convert(self, mode: str) -> "FakeImage":
            self.mode = mode
            return self

        def thumbnail(self, size: tuple[int, int], resample: object) -> None:
            self.size = (640, 240)

        def save(self, path: str) -> None:
            self.saved_path = path

        def __enter__(self) -> "FakeImage":
            return self

        def __exit__(self, exc_type: object, exc: object, tb: object) -> None:
            return None

    cursor = AsyncMock()
    cursor.fetch_list = AsyncMock(return_value=[9])
    fake_image = FakeImage()
    unmatched_art.clear()
    with (
        patch("scanner.album_art.Image.open", return_value=fake_image),
        patch(
            "scanner.album_art.reconcile_album_art", new=AsyncMock()
        ) as reconcile_mock,
        patch(
            "scanner.album_art.add_scan_error", new=AsyncMock()
        ) as add_scan_error_mock,
    ):
        asyncio.run(process_album_art(cursor, "/music/station/cover.png", 1))

    reconcile_mock.assert_awaited_once_with(cursor, 9)
    add_scan_error_mock.assert_awaited_once()
    unmatched_art.clear()

    class SmallRgbImage:
        def __init__(self) -> None:
            self.mode = "RGB"
            self.size = (320, 320)

        def save(self, path: str) -> None:
            self.saved_path = path

        def __enter__(self) -> "SmallRgbImage":
            return self

        def __exit__(self, exc_type: object, exc: object, tb: object) -> None:
            return None

    cursor = AsyncMock()
    cursor.fetch_list = AsyncMock(return_value=[5])
    with (
        patch("scanner.album_art.Image.open", return_value=SmallRgbImage()),
        patch(
            "scanner.album_art.reconcile_album_art", new=AsyncMock()
        ) as reconcile_mock,
        patch(
            "scanner.album_art.add_scan_error", new=AsyncMock()
        ) as add_scan_error_mock,
    ):
        asyncio.run(process_album_art(cursor, "/music/station/exact.png", 1))
    reconcile_mock.assert_awaited_once_with(cursor, 5)
    add_scan_error_mock.assert_not_called()

    cursor = AsyncMock()
    cursor.fetch_list = AsyncMock(return_value=[])
    with (
        patch("scanner.album_art.Image.open", side_effect=IOError("bad art")),
        patch(
            "scanner.album_art.add_scan_error", new=AsyncMock()
        ) as add_scan_error_mock,
    ):
        asyncio.run(process_album_art(cursor, "/music/station/bad.png", 1))
    add_scan_error_mock.assert_awaited_once()
    assert unmatched_art and unmatched_art[0].filename == "/music/station/bad.png"

    unmatched_art.clear()
    cursor = AsyncMock()
    cursor.fetch_list = AsyncMock(return_value=[1])
    with (
        patch("scanner.album_art.Image.open", side_effect=RuntimeError("boom")),
        patch(
            "scanner.album_art.add_scan_error", new=AsyncMock()
        ) as add_scan_error_mock,
    ):
        asyncio.run(process_album_art(cursor, "/music/station/fail.png", 1))
    add_scan_error_mock.assert_awaited_once()


def test_scan_errors_nonfatal_fatal_and_trim() -> None:
    with (
        patch("scanner.scan_errors.cache_get", new=AsyncMock(return_value=[])),
        patch("scanner.scan_errors.cache_set", new=AsyncMock()) as cache_set_mock,
        patch("scanner.scan_errors.log.warn") as warn_mock,
        patch("scanner.scan_errors.log.exception") as exception_mock,
    ):
        asyncio.run(add_scan_error("warn.mp3", NonFatalScannerError("small"), None))

    warn_mock.assert_called_once()
    exception_mock.assert_not_called()
    assert cache_set_mock.await_args is not None
    stored_errors = cache_set_mock.await_args.args[1]
    assert stored_errors[0]["file"] == "warn.mp3"
    assert stored_errors[0]["traceback"] == ""

    full_exc = (RuntimeError, RuntimeError("boom"), None)
    with (
        patch("scanner.scan_errors.cache_get", new=AsyncMock(return_value=[])),
        patch("scanner.scan_errors.cache_set", new=AsyncMock()) as cache_set_mock,
        patch("scanner.scan_errors.log.exception") as exception_mock,
    ):
        asyncio.run(add_scan_error("fatal.mp3", RuntimeError("boom"), full_exc))

    exception_mock.assert_called_once()
    assert cache_set_mock.await_args is not None
    stored_errors = cache_set_mock.await_args.args[1]
    assert stored_errors[0]["file"] == "fatal.mp3"
    assert stored_errors[0]["traceback"] != ""

    with (
        patch("scanner.scan_errors.cache_get", new=AsyncMock(return_value=[])),
        patch("scanner.scan_errors.cache_set", new=AsyncMock()) as cache_set_mock,
        patch("scanner.scan_errors.log.exception") as exception_mock,
    ):
        try:
            raise RuntimeError("boom")
        except RuntimeError as exc:
            asyncio.run(add_scan_error("fatal-no-full.mp3", exc))

    exception_mock.assert_called_once()
    assert cache_set_mock.await_args is not None
    stored_errors = cache_set_mock.await_args.args[1]
    assert stored_errors[0]["file"] == "fatal-no-full.mp3"
    assert stored_errors[0]["traceback"] != ""

    existing_errors = [
        {"time": 1, "file": str(i), "type": "E", "error": "x", "traceback": ""}
        for i in range(100)
    ]
    with (
        patch(
            "scanner.scan_errors.cache_get", new=AsyncMock(return_value=existing_errors)
        ),
        patch("scanner.scan_errors.cache_set", new=AsyncMock()) as cache_set_mock,
        patch("scanner.scan_errors.log.warn"),
    ):
        asyncio.run(add_scan_error("new.mp3", NonFatalScannerError("warn"), None))

    assert cache_set_mock.await_args is not None
    stored_errors = cache_set_mock.await_args.args[1]
    assert len(stored_errors) == 100
    assert stored_errors[0]["file"] == "new.mp3"

    with patch("scanner.scan_errors.cache_get", new=AsyncMock(return_value=None)):
        assert asyncio.run(get_music_scan_errors()) == []
