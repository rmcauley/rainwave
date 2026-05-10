from common import config, log
from common.zeromq import zeromq


def main() -> None:
    log.init(f"{config.log_dir}/rw_zmq_proxy.log", config.log_level)
    log.info(
        "start",
        "ZMQ proxy binding publisher URL %s and subscriber URL %s."
        % (config.zeromq_publish_url, config.zeromq_subscribe_url),
    )
    zeromq.run_proxy()


if __name__ == "__main__":
    main()
