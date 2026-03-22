import importlib
import pkgutil

_loaded = False


def load_all_routes() -> None:
    global _loaded
    if _loaded:
        return

    for module_info in pkgutil.walk_packages(__path__, prefix=__name__ + "."):
        importlib.import_module(module_info.name)

    _loaded = True
