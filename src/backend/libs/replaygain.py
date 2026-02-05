import subprocess


from src.backend import config

ref_level = 89


def get_gain_for_song(file: str) -> str:
    if not config.enable_replaygain:
        return "0.0 dB"

    output = subprocess.run(
        ["replaygain", "-d", f"-r {ref_level}", f"{file}"],
        capture_output=True,
        check=True,
    )
    gain_line = next(
        line for line in output.stdout.decode().split("\\n") if "dB" in line
    )
    gain = gain_line.split(":")[-1].strip()
    return gain
