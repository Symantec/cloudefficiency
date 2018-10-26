#!/bin/bash
# secrets
if [ $# -eq 0 ]; then
    echo "Usage: ./publish_ssm_secrets.sh <app_name> [<environment>]"
fi
APP="$1"
ENV="${2:-prod}"
aws ssm put-parameter \
--name /$ENV/$APP/client_id \
--value $client_id \
--type SecureString

aws ssm put-parameter \
--name /$ENV/$APP/client_secret \
--value $client_secret \
--type SecureString

aws ssm put-parameter \
--name /$ENV/$APP/jwt_secrets \
--value $jwt_secrets \
--type SecureString
