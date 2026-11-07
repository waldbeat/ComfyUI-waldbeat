from .nodes import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS
try:  # optional local extras (not part of the public repo)
    from . import chat_nodes as _chat
    NODE_CLASS_MAPPINGS.update(_chat.NODE_CLASS_MAPPINGS)
    NODE_DISPLAY_NAME_MAPPINGS.update(_chat.NODE_DISPLAY_NAME_MAPPINGS)
except ImportError:
    pass
from . import info_routes  # noqa: F401  registers /lsb/* routes

WEB_DIRECTORY = "./web"
__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
