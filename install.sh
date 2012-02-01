#!/bin/bash

INSTALLDIR=/opt/lyre

if ! [ -e $INSTALLDIR/lyre ]; then
	mkdir -p $INSTALLDIR/lyre
	fi
	
if ! [ -e $INSTALLDIR/run ]; then
	mkdir -p $INSTALLDIR/run
	fi
	
if ! [ -e $INSTALLDIR/log ]; then
	mkdir -p $INSTALLDIR/log
	fi

cp -r lyre/*.py* $INSTALLDIR/lyre
cp *.py $INSTALLDIR
cp initscript /etc/init.d/lyre
/etc/init.d/lyre stop
/etc/init.d/lyre start
