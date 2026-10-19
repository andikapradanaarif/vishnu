#!/bin/sh
# `migrate` dispatches to the migration CLI; anything else is run as given.
# The server applies pending migrations itself on boot, so the CLI is here
# for the operations compose cannot express (down, status).
set -eu

if [ "$#" -eq 0 ]; then
	exec ./vishnu-api
fi

case "$1" in
migrate)
	shift
	exec ./migrate "$@"
	;;
*)
	exec "$@"
	;;
esac
