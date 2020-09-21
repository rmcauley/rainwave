from gi.repository import GLib
from rgain3 import rgcalc, util
from rgain3.script import init_gstreamer

from libs import config

ref_level = 89
init_gstreamer()


# mostly copy/pasted from rgain3 source
# adapted for Rainwave usage
def get_gain_for_song(file):
    if config.has("disable_replaygain"):
        return "0.0 dB"

    exceptions = []

    # handlers
    def on_finished(evsrc, trackdata, albumdata):
        loop.quit()

    def on_error(evsrc, exc):
        exceptions.append(exc)
        loop.quit()

    rg = rgcalc.ReplayGain([file], True, ref_level)
    with util.gobject_signals(
        rg,
        ("all-finished", on_finished),
        ("error", on_error),
    ):
        loop = GLib.MainLoop()
        rg.start()
        loop.run()

    if exceptions:
        raise exceptions[0]

    return "%0.2f dB" % rg.track_data.popitem()[1].gain
    
