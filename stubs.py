# - Read the latest filename from the backend to stdout (can't just be pulled from cache)
# - Backend-to-API caching and communication
# - Refactoring old API
# - Manage the listeners table (purge old listeners) [Orpheus.cpp:177]
# - Update song statistics after playback [PlaylistControl.cpp:741 for ideas]
# - Update ratings after playback [PlaylistControl.cpp:544]
# - Cooldown implementation
# - Station state code
	# - Request gaps
	# - Request sequences
# - Album art
# - Check for deactivating/deleting empty groups
# - Accepting forceoption commands
# - Accepting forceplay commands
# - Request intake
# - Getting is_request state on a song
# - Figuring out if we need requests [ElectionControl.cpp:469]
# - Manage request line [ElectionControl.cpp:632]
# - Update song won statistics? (Schneau had an idea or two here...)
# - Ability to 'pause' radio
# - Listener counts
# - Album cover art