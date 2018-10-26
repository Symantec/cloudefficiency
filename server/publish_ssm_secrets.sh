# secrets
ENV=${ENV:-'prod'}
aws ssm put-parameter \
--name /$ENV/cloudefficiency/client_id \
--value $client_id \
--type SecureString

aws ssm put-parameter \
--name /$ENV/cloudefficiency/client_secret \
--value $client_secret \
--type SecureString

aws ssm put-parameter \
--name /$ENV/cloudefficiency/jwt_secrets \
--value $jwt_secrets \
--type SecureString
