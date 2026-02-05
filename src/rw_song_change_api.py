import argparse

from song_change_api.server import SongChangeApiServer

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Rainwave song change API server.")
    args = parser.parse_args()

    SongChangeApiServer().start()
