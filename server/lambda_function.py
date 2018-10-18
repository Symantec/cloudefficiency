from datetime import datetime, timedelta
from http import cookies
from requests_oauthlib import OAuth2Session
import boto3
import botocore
import jwt
import logging
import os
import urllib.parse
import uuid

logger = logging.getLogger()

LOGLEVEL = os.environ.get('LOGLEVEL', 'DEBUG').upper()
loglevel = logging.getLevelName(LOGLEVEL)
logger.setLevel(loglevel)

algorithm = 'HS256'
jwt_cookie_key = 'jwt_token'


def lambda_handler(event, context):
    logger.info('Starting lambda handler.')
    logger.info('loglevel: %s', LOGLEVEL)
    """
    input:
        https://docs.aws.amazon.com/en_en/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
    output:
        https://docs.aws.amazon.com/en_en/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-output-format

    stagevariables:
    https://docs.aws.amazon.com/en_en/apigateway/latest/developerguide/stage-variables.html
    """
    logger.info('Retrieving stage variables')
    stageVariables = event.get('stageVariables')

    # not secret
    authorization_endpoint = stageVariables.get('authorization_endpoint')
    token_endpoint = stageVariables.get('token_endpoint')
    userinfo_endpoint = stageVariables.get('userinfo_endpoint')
    redirect_uri = stageVariables.get('redirect_uri')
    base_uri = stageVariables.get('base_uri')
    default_object = stageVariables.get('default_object')
    BUCKET_NAME = stageVariables.get('bucket_name')

    # secrets
    ssm_client = boto3.client('ssm')
    client_id = ssm_client.get_parameter(Name='CloudefficiencyClientId', WithDecryption=True)["Parameter"]["Value"]
    client_secret = ssm_client.get_parameter(Name='CloudefficiencyClientSecret', WithDecryption=True)["Parameter"]["Value"]
    jwt_secrets = ssm_client.get_parameter(Name='CloudefficiencyJWTSecrets', WithDecryption=True)["Parameter"]["Value"].split(',')

    if len(client_id) == 0:
        logger.error('Must pass a client_id stage variable')
    if len(client_secret) == 0:
        logger.error('Must pass a client_secret stage variable')
    if len(jwt_secrets) == 0:
        logger.error('Must pass a jwt_secrets stage variable')

    logger.debug('authorization_endpoint: %s', authorization_endpoint)
    logger.debug('token_endpoint: %s', token_endpoint)
    logger.debug('authorization_endpoint: %s', authorization_endpoint)
    logger.debug('userinfo_endpoint: %s', userinfo_endpoint)
    logger.debug('redirect_uri: %s', redirect_uri)
    logger.debug('base_uri: %s', base_uri)
    logger.debug('bucket_name: %s', BUCKET_NAME)

    oauth_token = "oauth_token"
    oauth_state = "oauth_state"
    oauth_token_key = base_uri + '/' + oauth_token
    oauth_state_key = base_uri + '/' + oauth_state
    oauth_initial_path_key = base_uri + '/initial_path'

    jwt_keys = [
        "jti",
        "iss",
        "aud",
        "exp",
        "iat",
        "nbf",
        oauth_token_key,
        oauth_state_key
    ]

    def jwt_params(
            oauth_token=None,
            oauth_state=None,
            initial_path=None,
            sub=None,
            iss=base_uri,
            aud=base_uri,
            exp_seconds=300,
            **rest):
        """
        create a dict of jwt cliams
        """
        logger.debug('Creating jwt params')
        now = datetime.utcnow()
        expires = now + timedelta(seconds=exp_seconds)
        token = rest
        if initial_path:
            token[oauth_initial_path_key] = initial_path
        if oauth_token:
            token[oauth_token_key] = oauth_token
        if oauth_state:
            token[oauth_state_key] = oauth_state
        if sub:
            token['sub'] = sub
        token['jti'] = str(uuid.uuid1())
        token['iss'] = base_uri
        token['aud'] = base_uri
        token['exp'] = expires
        token['iat'] = now
        token['nbf'] = now
        logger.debug('JWT params: %s', token)
        return token

    class Cookie:
        def __init__(self):
            logger.debug('Creating cookie')
            self.cookie = cookies.SimpleCookie()

        def remove_jwt(self, key):
            logger.debug('Removing jwt %s', key)
            self.cookie[key] = ''
            self.cookie[key]['max-age'] = 0

        def add_jwt(self, key, token, path='/', max_age=300, secure=True):
            logger.debug(
                'Adding jwt key: %s, path: %s, max age: %s, secure: %s',
                key,
                path,
                max_age,
                secure
            )
            self.cookie[key] = jwt.encode(
                token,

                # The first secret is the current signer.
                jwt_secrets[0],
                algorithm=algorithm
            ).decode("utf-8")
            self.cookie[key]['max-age'] = max_age
            self.cookie[key]['secure'] = secure
            self.cookie[key]['path'] = path

        def get_headers(self):
            headers = {}
            for i, key in enumerate(self.cookie):

                # hack around unique headers in api-gateway
                set_cookie = list('SET-COOKIE')
                if i > len(set_cookie):
                    raise 'Can only set at most ' + str(len(set_cookie))
                set_cookie[i] = set_cookie[i].lower()
                headers["".join(set_cookie)] = self.cookie[key].OutputString()
            return headers

    def redirect_with_cookie(url, cookie=None):
        """
        Redirect to url.
        All keyword args will be signed into a JWT with the response.
        """
        logger.debug('Redirecting with cookie')
        logger.debug('Redirecting to %s', url)
        result = {
            'statusCode': 302,
            'headers': {
                "Location": url
            }
        }
        if cookie:
            headers = result['headers'].copy()
            headers.update(cookie.get_headers())
            result['headers'] = headers

        return result

    def get_jwt_token(headers, key):
        """
        Retrieve the jwt token's as a key, value object
        from the flask request cookies object.
        If no token exists, returns an empty object.
        """
        logger.debug('Retrieving jwt token')
        logger.debug('jwt token key: %s', key)
        if 'cookie' not in map(lambda x: x.lower(), headers):
            logger.info('no jwt token found for key %s', key)
            return {}

        cookie = cookies.SimpleCookie()

        cookie_header = headers.get('cookie')
        if not cookie_header:
            cookie_header = headers.get('Cookie')

        cookie.load(cookie_header)

        if key in cookie:

            # We take multiple secrets to allow for online secret rotation.
            # The first secret is the current signer,
            # and the others are potentially still in use, but will
            # be rotated out.
            for jwt_secret in jwt_secrets:
                try:
                    # github.com/jpadilla/pyjwt/blob/master/tests/test_api_jwt.py
                    # This will validate:
                    #   iss, aud
                    # This will validate (if they are in the request):
                    #   exp, nbf, iat
                    return jwt.decode(
                        cookie[key].value,
                        jwt_secret,
                        issuer=base_uri,
                        audience=base_uri,
                        algorithms=[algorithm]
                    )
                except jwt.exceptions.InvalidTokenError as e:
                    # will catch exp, nbf, iat, iss, aud errors
                    logger.error(
                        'Exception decoding jwt token key: %s Exception: %s',
                        key, e
                    )
                    continue

        return {}

    def with_auth(func):
        """
        Authentication decorator.

        Run the given request handler, passing it the user.
        If the user has no valid auth token, then
        redirect the user/resource owner to the keymaster
        without invoking the given request handler.
        """
        def wrapped(event, context):
            logger.debug('Calling with_auth')
            jwt = get_jwt_token(event.get('headers'), oauth_token)
            if oauth_token_key in jwt:
                logger.info("User already auth'd")
                user = dict(jwt)
                for key in jwt_keys:
                    user.pop(key, None)
                return func(event, context, user)

            logger.info("User not already auth'd")

            client = OAuth2Session(
                client_id,
                scope="openid mail profile",
                redirect_uri=redirect_uri
            )
            authorization_url, state = client.authorization_url(
                authorization_endpoint)

            # State is used to prevent CSRF, keep this for later.
            cookie = Cookie()
            initial_path = base_uri + event.get('path')
            query = event.get('queryStringParameters')
            if query:
                initial_path += '?' + urllib.parse.urlencode(query)
            logger.debug('initial_path: %s', initial_path)
            state_token_params = jwt_params(
                oauth_state=state,
                initial_path=initial_path
            )
            cookie.add_jwt(oauth_state, state_token_params)
            return redirect_with_cookie(authorization_url, cookie)
        return wrapped

    @with_auth
    def index(event, context, user):
        logger.debug('In index')
        s3 = boto3.client('s3')

        result = {
            'statusCode': 404
        }
        try:
            key = event.get('path')
            if key.startswith('/'):
                key = key[1:]
            logger.debug("s3 key: %s", key)
            if len(key) == 0:
                key = default_object
            response = s3.get_object(
                Bucket=BUCKET_NAME,
                Key=key
            )
            logger.debug(
                'Retrieved object with content type: %s',
                response['ContentType']
            )
            result = {
                'statusCode': 200,
                'body': str(response['Body'].read(), 'utf-8'),
                'headers': {
                    'Content-Type': response['ContentType']
                }
            }
        except botocore.exceptions.ClientError as e:
            if e.response['Error']['Code'] == "404":
                logger.warning("The object does not exist.")
            else:
                logger.error(e)
        return result

    def callback(event, context):
        logger.debug('In callback')
        """ Step 3: Retrieving an access token.

        The user has been redirected back from the provider to your registered
        callback URL. With this redirection comes an authorization code
        included in the redirect URL.
        We will use that to obtain an access token.
        """
        jwt = get_jwt_token(event.get('headers'), oauth_state)
        if oauth_state_key not in jwt:
            # something is wrong with the state token,
            # so redirect back to start over.
            return redirect_with_cookie(base_uri)

        initial_path = base_uri + '/'
        if oauth_initial_path_key in jwt:
            initial_path = jwt[oauth_initial_path_key]

        logger.debug('initial_path: %s', initial_path)
        client = OAuth2Session(
            client_id,
            state=jwt.get('oauth_state'),
            redirect_uri=redirect_uri
        )

        uri = base_uri + event.get('path')
        query = event.get('queryStringParameters')
        if query:
            uri += '?' + urllib.parse.urlencode(query)

        token = client.fetch_token(
            token_endpoint,
            client_secret=client_secret,
            authorization_response=uri
        )
        userinfo = client.get(userinfo_endpoint).json()
        # Save the token
        cookie = Cookie()
        exp_seconds = 60 * 60 * 4
        if "ExpiresIn" in token:
            exp_seconds = token['ExpiresIn']
        jwt_token_params = jwt_params(
            exp_seconds=exp_seconds,
            oauth_token=token,
            **userinfo
        )
        cookie.add_jwt(oauth_token, jwt_token_params)
        cookie.remove_jwt(oauth_state)

        return redirect_with_cookie(initial_path, cookie)

    logger.info('Handling request')
    if event.get('path').startswith('/callback'):
        return callback(event, context)
    else:
        return index(event, context)
