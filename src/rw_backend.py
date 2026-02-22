import argparse

from backend.server import SongChangeApiServer

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Rainwave song change API server.")
    args = parser.parse_args()

    SongChangeApiServer().start()
