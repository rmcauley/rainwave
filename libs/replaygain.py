import math
import subprocess
from libs import log


def _decode_subprocess_output(output: bytes) -> str | None:
    if output is None:
        return None
    if isinstance(output, str):
        return output
    if isinstance(output, bytes):
        return output.decode(errors="replace")
    return None


def get_gain_for_song(filename: str) -> str:
    # rsgain 3.6 options:
    #   custom       Custom scanning (as opposed to easy which writes tags)
    #   tagmode=s    Scan files but don't write ReplayGain tags
    #   output       Output tab-delimited scan data to stdout
    #   quiet        Don't print scanning status messages.
    stdout: str | None = None
    stderr: str | None = None
    try:
        output = subprocess.run(
            ["rsgain", "custom", "--tagmode=s", "--output", "--quiet", filename],
            capture_output=True,
            check=True,
        )
        stdout = _decode_subprocess_output(output.stdout)
        stderr = _decode_subprocess_output(output.stderr)

        # Sample output from rsgain 3.6 at time of writing (Feb 2026):
        # Filename        Loudness (LUFS) Gain (dB)       Peak     Peak (dB)      Peak Type       Clipping Adjustment?
        # 101 - No Matter the Distance... (Game Opening ver.).mp3 -10.96  -7.04   0.926971        -0.66   Sample  N

        # According to that sample output, we get the 3rd tab from the last line of output.
        # Convert it to float and ensure it's finite so invalid values throw.
        if not stdout:
            raise ValueError("rsgain did not return any stdout.")
        fields = stdout.strip().splitlines()[-1].split("\t")
        if len(fields) < 3:
            raise ValueError(f"rsgain returned unexpected output row: {fields!r}")
        value = float(fields[2].strip())
        if not math.isfinite(value):
            raise ValueError(f"rsgain returned non-finite gain value: {value!r}")

        # Now we need to add " dB" because this is what our previous replaygain solution did.
        return f"{value} dB"
    except subprocess.CalledProcessError as e:
        stdout = _decode_subprocess_output(e.stdout)
        stderr = _decode_subprocess_output(e.stderr)
        log.exception(
            "replaygain",
            f"Error scanning replaygain for {filename}. stdout={stdout!r} stderr={stderr!r}",
            e,
        )
        raise
    except Exception as e:
        log.exception(
            "replaygain",
            f"Error parsing replaygain for {filename}. stdout={stdout!r} stderr={stderr!r}",
            e,
        )
        raise
