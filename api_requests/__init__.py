# Yes, yes, frowned upon, but believe me it's the easiest way.
# Since requests are registered by using decorators, having an __all__
# means registering all modules with the API is super easy as a result
# but ONLY IF IT IS DESIRED. (such as runtests.py and api.py)

import os
import glob
__all__ = [ os.path.basename(f)[:-3] for f in glob.glob(os.path.dirname(__file__)+"/*.py")]
