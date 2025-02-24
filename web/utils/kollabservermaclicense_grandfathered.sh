#! /bin/bash
# (Cloud-only)
# Create Kollaborate Server licenses
# $1 = product ID
# $2 = product name
# $2 = email address
# $3 = name
# $4 = encoding licenses
# $5 = output path
# $6 = allowed servers

# Setup variables
#ENCODER="/usr/local/bin/make_license"
ENCODER="/var/ioncube/make_license"
LICENSE_FILE=kollab_server.lnc
PASSPHRASE="dXFYq3IovB3kYJqM60qY"

$ENCODER $7 $8 $9 ${10} --property "product='$1',title='$2',package='-1',email='$3',licenseuser='$4',encoders='$5'" --passphrase $PASSPHRASE -o $6
