from __future__ import annotations

import os
from datetime import datetime
from pathlib import Path

from api import fieldtypes
from common.libs.filetools import check_file_is_in_directory, which
from scanner.is_image import is_image
from scanner.is_mp3 import is_mp3
from scanner.should_ignore_file import should_ignore_file


def test_fieldtypes_cover_string_numeric_bool_and_lists() -> None:
    assert fieldtypes.string(" hello ") == "hello"
    assert fieldtypes.string(b" hello ") == "hello"
    assert fieldtypes.string(bytearray(b"world")) == "world"
    assert fieldtypes.string(b"\xff") is None
    assert fieldtypes.string("") is None

    assert fieldtypes.numeric(4) == 4
    assert fieldtypes.numeric(4.5) == 4.5
    assert fieldtypes.numeric(b"12") == "12"
    assert fieldtypes.numeric("-12.5") == "-12.5"
    assert fieldtypes.numeric("abc") is None
    assert fieldtypes.numeric(None) is None

    assert fieldtypes.integer(4) == 4
    assert fieldtypes.integer(4.9) == 4
    assert fieldtypes.integer("7") == 7
    assert fieldtypes.integer("x") is None
    assert fieldtypes.positive_integer("3") == 3
    assert fieldtypes.positive_integer("0") is None
    assert fieldtypes.zero_or_greater_integer("0") == 0
    assert fieldtypes.zero_or_greater_integer("-1") is None

    assert fieldtypes.float_num("3.5") == 3.5
    assert fieldtypes.float_num("abc") is None
    assert fieldtypes.rating("3.5") == 3.5
    assert fieldtypes.rating("0.5") is None
    assert fieldtypes.rating("3.7") is None

    assert fieldtypes.boolean(True) is True
    assert fieldtypes.boolean(False) is False
    assert fieldtypes.boolean("true") is True
    assert fieldtypes.boolean("False") is False
    assert fieldtypes.boolean("nope") is None

    assert fieldtypes.integer_list([1, 2, 3]) == [1, 2, 3]
    assert fieldtypes.integer_list("1,2,3") == [1, 2, 3]
    assert fieldtypes.integer_list(b"1,2,3") == [1, 2, 3]
    assert fieldtypes.integer_list(["1", "2"]) is None
    assert fieldtypes.integer_list("1,a") is None
    assert fieldtypes.integer_list(None) is None

    assert fieldtypes.string_list(["a", "b"]) == ["a", "b"]
    assert fieldtypes.string_list("a,b") == ["a", "b"]
    assert fieldtypes.string_list([1, 2]) is None
    assert fieldtypes.string_list(1) is None


def test_fieldtypes_cover_ip_dates_sid_and_relay() -> None:
    assert fieldtypes.ip_address("127.0.0.1") == "127.0.0.1"
    assert fieldtypes.ip_address("::1") == "::1"
    assert fieldtypes.ip_address("not-an-ip") is None

    assert fieldtypes.valid_relay("127.0.0.1") == "sample"
    assert fieldtypes.valid_relay("not-a-relay") is None
    assert fieldtypes.valid_relay(None) is None

    assert fieldtypes.sid(1) == 1
    assert fieldtypes.sid("1") == 1
    assert fieldtypes.sid(0) is None
    assert fieldtypes.sid(999) is None

    parsed = fieldtypes.date("2024-02-03")
    assert parsed == datetime(2024, 2, 3)
    assert fieldtypes.date(b"2024-02-03") == datetime(2024, 2, 3)
    assert fieldtypes.date("2024/02/03") is None
    assert fieldtypes.date_as_epoch("2024-02-03") is not None
    assert fieldtypes.date_as_epoch("bad-date") is None


def test_filetools_and_scanner_file_classifiers(tmp_path: Path) -> None:
    bin_dir = tmp_path / "bin"
    bin_dir.mkdir()
    exe = bin_dir / "tool"
    exe.write_text("#!/bin/sh\nexit 0\n")
    exe.chmod(0o755)

    old_path = os.environ.get("PATH", "")
    os.environ["PATH"] = str(bin_dir)
    try:
        assert which("tool") == str(exe)
        assert which(str(exe)) == str(exe)
        assert which("missing-tool") is None
    finally:
        os.environ["PATH"] = old_path

    nested = tmp_path / "nested"
    nested.mkdir()
    inside = nested / "inside.txt"
    inside.write_text("x")
    outside = tmp_path / "outside.txt"
    outside.write_text("y")
    assert check_file_is_in_directory(str(inside), str(nested)) is True
    assert check_file_is_in_directory(str(outside), str(nested)) is False

    assert should_ignore_file("foo.tmp") is True
    assert should_ignore_file("foo.filepart") is True
    assert should_ignore_file("foo.mp3") is False

    image_file = tmp_path / "cover.jpg"
    image_file.write_bytes(b"jpg")
    mp3_file = tmp_path / "track.mp3"
    mp3_file.write_bytes(b"id3")
    ignored_file = tmp_path / "partial.filepart"
    ignored_file.write_bytes(b"x")

    assert is_image(str(image_file)) is True
    assert is_image(str(mp3_file)) is False
    assert is_image(str(ignored_file)) is False

    assert is_mp3(str(mp3_file)) is True
    assert is_mp3(str(image_file)) is False
    assert is_mp3(str(ignored_file)) is False
