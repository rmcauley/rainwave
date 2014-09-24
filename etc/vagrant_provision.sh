#!/usr/bin/env bash

log () {
    printf "${1}\n"
}

APTITUDE_UPDATED=/home/vagrant/.aptitude_updated

if [[ ! -e ${APTITUDE_UPDATED} ]]; then
    log "Updating the local apt database..."
    aptitude update && touch ${APTITUDE_UPDATED}
fi

aptitude --assume-yes install curl htop libfreetype6-dev libjpeg-dev libmemcached-dev libpcre3-dev libpq-dev memcached python-pip postgresql python-dev zlib1g-dev

pip install --upgrade pip
hash -d pip
pip install --upgrade --no-use-wheel setuptools

# http://codeinthehole.com/writing/how-to-install-pil-on-64-bit-ubuntu-1204/
LIBFREETYPE=/usr/lib/libfreetype.so
LIBJPEG=/usr/lib/libjpeg.so
ZLIB=/usr/lib/libz.so

if [[ ! -e ${LIBFREETYPE} ]]; then
    ln -s /usr/lib/$(uname -i)-linux-gnu/libfreetype.so /usr/lib/
fi

if [[ ! -e ${LIBJPEG} ]]; then
    ln -s /usr/lib/$(uname -i)-linux-gnu/libjpeg.so /usr/lib/
fi

if [[ ! -e ${ZLIB} ]]; then
    ln -s /usr/lib/$(uname -i)-linux-gnu/libz.so /usr/lib/
fi

pip install -r /vagrant/requirements.txt

JQ_INSTALLED=$(which jq)

if [[ -z ${JQ_INSTALLED} ]]; then
    log "Installing jq..."
    curl --silent --url http://stedolan.github.io/jq/download/linux64/jq --output /usr/local/bin/jq
    chmod a+x /usr/local/bin/jq
fi

RW_CONF=/vagrant/etc/rainwave_vagrant.conf
log "Linking Rainwave configuration file to /etc/rainwave.conf..."
ln --force --symbolic "${RW_CONF}" "/etc/rainwave.conf"

RW_MEMCACHE_RATINGS=$(jq -r .memcache_ratings_servers[0] < ${RW_CONF})
log "Starting memcached..."
memcached -u memcache -d -l ${RW_MEMCACHE_RATINGS}

RW_DB_USER=$(jq -r .db_user < ${RW_CONF})
RW_DB_PASS=$(jq -r .db_password < ${RW_CONF})
RW_DB_NAME=$(jq -r .db_name < ${RW_CONF})
DB_ROLE_EXISTS=$(sudo -u postgres -i psql --no-align --tuples-only --command "select 1 from pg_roles where rolname='${RW_DB_USER}'")

if [[ -z ${DB_ROLE_EXISTS} ]]; then
    log "Creating database user..."
    sudo -u postgres -i psql --command "create user ${RW_DB_USER} createdb createuser password '${RW_DB_PASS}';"
fi

DB_EXISTS=$(sudo -u postgres -i psql --no-align --tuples-only --command "select 1 from pg_database where datname='${RW_DB_NAME}'")

if [[ -z ${DB_EXISTS} ]]; then
    log "Creating database schema..."
    sudo -u postgres -i createdb --owner=${RW_DB_USER} ${RW_DB_NAME} "Rainwave 4"
fi

DB_INITIALIZED=$(sudo -u postgres -i psql ${RW_DB_NAME} --no-align --tuples-only --command "select 1 from information_schema.tables where table_name='r4_songs'")

if [[ -z ${DB_INITIALIZED} ]]; then
    log "Initializing the Rainwave database..."
    python /vagrant/db_init.py
fi

RW_PID_DIR=$(jq -r .pid_dir < ${RW_CONF})
if [[ ! -d "${RW_PID_DIR}" ]]; then
    log "Creating ${RW_PID_DIR}"
    mkdir "${RW_PID_DIR}"
fi

RW_LOG_DIR=$(jq -r .log_dir < ${RW_CONF})
if [[ ! -d "${RW_LOG_DIR}" ]]; then
    log "Creating ${RW_LOG_DIR}"
    mkdir "${RW_LOG_DIR}"
fi

MUSIC_SCANNED=/home/vagrant/.music_scanned
if [[ ! -e ${MUSIC_SCANNED} ]]; then
    log "Scanning for music files..."
    python /vagrant/rw_scanner.py --full && touch ${MUSIC_SCANNED}
fi

SUPERVISOR_PID_FILE=/tmp/supervisord.pid
if [[ -e ${SUPERVISOR_PID_FILE} ]]; then
    log "Restarting the Rainwave backend and API servers..."
    SUPERVISOR_PID=$(< ${SUPERVISOR_PID_FILE})
    kill -HUP ${SUPERVISOR_PID}
else
    log "Starting the Rainwave backend and API servers..."
    supervisord --configuration=/vagrant/etc/supervisord.conf
fi

sleep 2
python /vagrant/rw_get_next.py

log "Provisioning complete."
