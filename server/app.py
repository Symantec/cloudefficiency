from datetime import datetime, timedelta
from requests_oauthlib import OAuth2Session
import boto3
import botocore
import jwt
import os
import uuid
from functools import wraps

from flask import Flask, request, redirect, url_for, make_response, Response

import logging
logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)

logger = app.logger


algorithm = 'HS256'
jwt_cookie_key = 'jwt_token'

# not secret
authorization_endpoint = os.environ.get('authorization_endpoint')
token_endpoint = os.environ.get('token_endpoint')
userinfo_endpoint = os.environ.get('userinfo_endpoint')
redirect_uri = os.environ.get('redirect_uri')
base_uri = os.environ.get('base_uri')
default_object = os.environ.get('default_object')
BUCKET_NAME = os.environ.get('bucket_name')
app_name = os.environ.get('app_name')

# secrets
if os.environ.get('DEBUG'):
    env = 'dev'
else:
    env = 'prod'

ssm_client = boto3.client('ssm')


def get_secret_param(p):
    return ssm_client.get_parameter(
        Name='/{}/{}/{}'.format(env, app_name, p),
        WithDecryption=True
    )["Parameter"]["Value"]


client_id = get_secret_param('client_id')
client_secret = get_secret_param('client_secret')
jwt_secrets = get_secret_param('jwt_secrets').split(',')

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


class JWTCookie:
    """Represents JWT tokens stored in a cookie.

    After adding jwt:
     - <my_first_key>, {... jwt_contents_1}
     - <my_second_key>, {... jwt_contents_2}
    The cookie would look like:

    || name         || value                         ||
    | my_first_key  | <signed jwt of jwt_contents_1>  |
    | my_second_key | <signed jwt of jwt_contents_2>  |

    """

    def __init__(self):
        self.keys = {}
        self.ages = {}
        self.secures = {}
        self.deletes = []

    def remove_jwt(self, key):
        """Remove a JWT token from the cookie.

        Args:
            key: the cookie key which will be removed.
        """
        self.deletes.append(key)

    def add_jwt(self, key, jwt, max_age=300, secure=True):
        """Add a JWT token to the cookie.

        Args:
            key: the key to use in the cookie to store the jwt
            jwt: the jwt token
        """
        self.keys[key] = jwt
        self.ages[key] = max_age
        self.secures[key] = secure

    def populate_resp(self, resp):
        for key, token in self.keys.items():
            resp.set_cookie(
                key=key,
                max_age=self.ages[key],
                secure=self.secures[key],
                value=jwt.encode(
                    token,
                    # The first secret is the current signer.
                    jwt_secrets[0],
                    algorithm=algorithm
                )
            )
        for key in self.deletes:
            resp.set_cookie(
                key=key,
                max_age=0
            )
        return resp


def get_jwt_token(cookies, key):
    """
    Retrieve the jwt token's as a key, value object
    from the flask request cookies object.
    If no token exists, returns an empty object.
    """
    if key in request.cookies:
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
                    request.cookies[key],
                    jwt_secret,
                    issuer=base_uri,
                    audience=base_uri,
                    algorithms=[algorithm]
                )
            except jwt.exceptions.InvalidTokenError as e:
                # will catch exp, nbf, iat, iss, aud errors
                print(e)
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
    @wraps(func)
    def wrapped(*args, **kwargs):
        logger.debug('Calling with_auth')
        jwt = get_jwt_token(request.cookies, oauth_token)
        if oauth_token_key in jwt:
            logger.info("User already auth'd")
            user = dict(jwt)
            for key in jwt_keys:
                user.pop(key, None)
            return func(user, *args, **kwargs)

        logger.info("User not already auth'd")

        client = OAuth2Session(
            client_id,
            scope="openid mail profile",
            redirect_uri=redirect_uri
        )
        authorization_url, state = client.authorization_url(
            authorization_endpoint)

        # State is used to prevent CSRF, keep this for later.
        cookie = JWTCookie()
        logger.debug('initial_path: %s', request.full_path)
        state_token_params = jwt_params(
            oauth_state=state,
            initial_path=request.full_path
        )
        cookie.add_jwt(oauth_state, state_token_params)
        return cookie.populate_resp(make_response(redirect(authorization_url)))
    return wrapped


@app.route('/', defaults={'key': None})
@app.route("/<path:key>")
@with_auth
def index(user, key=None):
    logger.debug('In index')
    s3 = boto3.client('s3')

    try:
        logger.debug("s3 key argument: %s", key)
        if not key:
            key = default_object
        logger.debug("looking in bucket [%s] for key [%s]", BUCKET_NAME, key)
        response = s3.get_object(
            Bucket=BUCKET_NAME,
            Key=key
        )
        logger.debug(
            'Retrieved object with content type: %s',
            response['ContentType']
        )
    except botocore.exceptions.ClientError as e:
        if e.response['Error']['Code'] == "404":
            logger.warning("The object does not exist.")
        else:
            logger.error(e)
    return Response(
        str(response['Body'].read(), 'utf-8'),
        mimetype=response['ContentType']
    )

    return key


@app.route('/callback')
def callback():
    logger.debug('In callback')
    """ Step 3: Retrieving an access token.

    The user has been redirected back from the provider to your registered
    callback URL. With this redirection comes an authorization code
    included in the redirect URL.
    We will use that to obtain an access token.
    """
    jwt = get_jwt_token(request.cookies, oauth_state)
    logger.info('got jwt token: %s', jwt)
    logger.info('looking for: %s', oauth_state_key)
    if oauth_state_key not in jwt:
        # something is wrong with the state token,
        # so redirect back to start over.
        logger.warn('no state passed to openid callback')
        return redirect(url_for('.index'))

    initial_path = url_for('.index')
    if oauth_initial_path_key in jwt:
        initial_path = jwt[oauth_initial_path_key]

    logger.debug('initial_path: %s', initial_path)
    client = OAuth2Session(
        client_id,
        state=jwt.get('oauth_state'),
        redirect_uri=redirect_uri
    )

    token = client.fetch_token(
        token_endpoint,
        client_secret=client_secret,
        authorization_response=base_uri + request.full_path
    )
    userinfo = client.get(userinfo_endpoint).json()
    # Save the token
    cookie = JWTCookie()
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
    print('initial_path', initial_path)
    return cookie.populate_resp(make_response(redirect(initial_path)))


if __name__ == "__main__":

    debug = os.environ.get('DEBUG', False)
    if os.environ.get('SERVE_HTTPS'):
        app.run(
            debug=debug,
            host='0.0.0.0',
            port=443,
            ssl_context=(
                'output/localhost.pem',
                'output/key.pem'
            )
        )
    else:
        app.run(
            debug=debug,
            host='0.0.0.0',
            port=80
        )
