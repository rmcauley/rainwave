#!/usr/bin/env bash

log () {
    printf "==> ${1}\n"
}

APTITUDE_UPDATED=/home/vagrant/.aptitude_updated

if [[ ! -e ${APTITUDE_UPDATED} ]]; then
    log "Updating the local apt database..."
    aptitude --quiet=2 update && touch ${APTITUDE_UPDATED}
fi

INSTALLED_PACKAGES=/home/vagrant/.installed_packages
aptitude --disable-columns --display-format "%p" search ?installed > ${INSTALLED_PACKAGES}

CURL_INSTALLED=$(grep "^curl$" ${INSTALLED_PACKAGES})
HTOP_INSTALLED=$(grep "^htop$" ${INSTALLED_PACKAGES})
LIBFREETYPE_INSTALLED=$(grep "^libfreetype6-dev$" ${INSTALLED_PACKAGES})
LIBJPEG_INSTALLED=$(grep "^libjpeg-dev$" ${INSTALLED_PACKAGES})
LIBMEMCACHED_INSTALLED=$(grep "^libmemcached-dev$" ${INSTALLED_PACKAGES})
LIBPCRE_INSTALLED=$(grep "^libpcre3-dev$" ${INSTALLED_PACKAGES})
LIBPQ_INSTALLED=$(grep "^libpq-dev$" ${INSTALLED_PACKAGES})
MEMCACHED_INSTALLED=$(grep "^memcached$" ${INSTALLED_PACKAGES})
PIP_INSTALLED=$(grep "^python-pip$" ${INSTALLED_PACKAGES})
POSTGRESQL_INSTALLED=$(grep "^postgresql$" ${INSTALLED_PACKAGES})
PYTHON_DEV_INSTALLED=$(grep "^python-dev$" ${INSTALLED_PACKAGES})
ZLIB_INSTALLED=$(grep "^zlib1g-dev$" ${INSTALLED_PACKAGES})

if [[ -z ${CURL_INSTALLED} ]]; then
    log "Installing curl..."
    aptitude --assume-yes install curl > /dev/null 2>&1
fi

if [[ -z ${HTOP_INSTALLED} ]]; then
    log "Installing htop..."
    aptitude --assume-yes install htop > /dev/null 2>&1
fi

if [[ -z ${LIBFREETYPE_INSTALLED} ]]; then
    log "Installing libfreetype6-dev..."
    aptitude --assume-yes install libfreetype6-dev > /dev/null 2>&1
fi

if [[ -z ${LIBJPEG_INSTALLED} ]]; then
    log "Installing libjpeg-dev..."
    aptitude --assume-yes install libjpeg-dev > /dev/null 2>&1
fi

if [[ -z ${LIBMEMCACHED_INSTALLED} ]]; then
    log "Installing libmemcached-dev..."
    aptitude --assume-yes install libmemcached-dev > /dev/null 2>&1
fi

if [[ -z ${LIBPCRE_INSTALLED} ]]; then
    log "Installing libpcre3-dev..."
    aptitude --assume-yes install libpcre3-dev > /dev/null 2>&1
fi

if [[ -z ${LIBPQ_INSTALLED} ]]; then
    log "Installing libpq-dev..."
    aptitude --assume-yes install libpq-dev > /dev/null 2>&1
fi

if [[ -z ${MEMCACHED_INSTALLED} ]]; then
    log "Installing memcached..."
    aptitude --assume-yes install memcached > /dev/null 2>&1
fi

if [[ -z ${PIP_INSTALLED} ]]; then
    log "Installing python-pip..."
    aptitude --assume-yes install python-pip > /dev/null 2>&1
    pip install --quiet --upgrade pip
    hash -d pip
    pip install --quiet --upgrade --no-use-wheel setuptools
fi

if [[ -z ${POSTGRESQL_INSTALLED} ]]; then
    log "Installing postgresql..."
    aptitude --assume-yes install postgresql > /dev/null 2>&1
fi

if [[ -z ${PYTHON_DEV_INSTALLED} ]]; then
    log "Installing python-dev..."
    aptitude --assume-yes install python-dev > /dev/null 2>&1
fi

if [[ -z ${ZLIB_INSTALLED} ]]; then
    log "Installing zlib1g-dev..."
    aptitude --assume-yes install zlib1g-dev > /dev/null 2>&1
fi

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

INSTALLED_PIP_PACKAGES=/home/vagrant/.installed_pip_packages
pip list | cut -d " " -f 1 > ${INSTALLED_PIP_PACKAGES}

JSMIN_INSTALLED=$(grep "^jsmin$" ${INSTALLED_PIP_PACKAGES})
MUTAGEN_INSTALLED=$(grep "^mutagen$" ${INSTALLED_PIP_PACKAGES})
PILLOW_INSTALLED=$(grep "^Pillow$" ${INSTALLED_PIP_PACKAGES})
PSUTIL_INSTALLED=$(grep "^psutil$" ${INSTALLED_PIP_PACKAGES})
PSYCOPG2_INSTALLED=$(grep "^psycopg2$" ${INSTALLED_PIP_PACKAGES})
PYINOTIFY_INSTALLED=$(grep "^pyinotify$" ${INSTALLED_PIP_PACKAGES})
PYLIBMC_INSTALLED=$(grep "^pylibmc$" ${INSTALLED_PIP_PACKAGES})
PYSCSS_INSTALLED=$(grep "^pyScss$" ${INSTALLED_PIP_PACKAGES})
PYTZ_INSTALLED=$(grep "^pytz$" ${INSTALLED_PIP_PACKAGES})
SUPERVISOR_INSTALLED=$(grep "^supervisor$" ${INSTALLED_PIP_PACKAGES})
TORNADO_INSTALLED=$(grep "^tornado$" ${INSTALLED_PIP_PACKAGES})
UNIDECODE_INSTALLED=$(grep "^Unidecode$" ${INSTALLED_PIP_PACKAGES})
WATCHDOG_INSTALLED=$(grep "^watchdog$" ${INSTALLED_PIP_PACKAGES})

if [[ -z ${JSMIN_INSTALLED} ]]; then
    log "Installing jsmin..."
    pip install --quiet jsmin
fi

if [[ -z ${MUTAGEN_INSTALLED} ]]; then
    log "Installing mutagen..."
    pip install --quiet mutagen
fi

if [[ -z ${PILLOW_INSTALLED} ]]; then
    log "Installing Pillow..."
    pip install --quiet Pillow
fi

if [[ -z ${PSUTIL_INSTALLED} ]]; then
    log "Installing psutil..."
    pip install --quiet psutil
fi

if [[ -z ${PSYCOPG2_INSTALLED} ]]; then
    log "Installing psycopg2..."
    pip install --quiet psycopg2
fi

if [[ -z ${PYINOTIFY_INSTALLED} ]]; then
    log "Installing pyinotify..."
    pip install --quiet pyinotify
fi

if [[ -z ${PYLIBMC_INSTALLED} ]]; then
    log "Installing pylibmc..."
    pip install --quiet pylibmc
fi

if [[ -z ${PYSCSS_INSTALLED} ]]; then
    log "Installing pyScss..."
    pip install --quiet pyScss
fi

if [[ -z ${PYTZ_INSTALLED} ]]; then
    log "Installing pytz..."
    pip install --quiet pytz
fi

if [[ -z ${SUPERVISOR_INSTALLED} ]]; then
    log "Installing supervisor..."
    pip install --quiet supervisor
fi

if [[ -z ${TORNADO_INSTALLED} ]]; then
    log "Installing tornado..."
    pip install --quiet tornado
fi

if [[ -z ${UNIDECODE_INSTALLED} ]]; then
    log "Installing Unidecode..."
    pip install --quiet Unidecode
fi

if [[ -z ${WATCHDOG_INSTALLED} ]]; then
    log "Installing watchdog..."
    pip install --quiet watchdog
fi

JQ_INSTALLED=$(which jq)

if [[ -z ${JQ_INSTALLED} ]]; then
    log "Installing jq..."
    curl --silent --url http://stedolan.github.io/jq/download/linux64/jq --output /usr/local/bin/jq
    chmod a+x /usr/local/bin/jq
fi

RW_CONF=/vagrant/etc/vagrant.conf
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
    sudo -u postgres -i psql --quiet --command "create user ${RW_DB_USER} createdb createuser password '${RW_DB_PASS}';"
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
python /vagrant/rw_get_next.py > /dev/null

log "Provisioning complete."
