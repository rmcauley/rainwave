# This entire module is hastily thrown together and discards many of the standard API features
# such as locale translation, obeying HTML standards, and many times the disconnection between
# data, presentation, and so on.  It's for admins.  Not users.  QA and snazzy interfaces need not apply.
# It only needs to work.

import os
import glob
__all__ = [ os.path.basename(f)[:-3] for f in glob.glob(os.path.dirname(__file__)+"/*.py")]