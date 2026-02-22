import argparse

from api.server import APIServer

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Rainwave API server.")
    args = parser.parse_args()

    APIServer().start()
