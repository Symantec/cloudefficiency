from http import cookies
import jwt
import logging
import os
import re

logger = logging.getLogger()

LOGLEVEL = os.environ.get('LOGLEVEL', 'INFO').upper()
loglevel = logging.getLevelName(LOGLEVEL)
logger.setLevel(loglevel)

algorithm = 'HS256'
jwt_cookie_key = 'jwt_token'


def lambda_handler(event, context):
    logger.info('Starting lambda handler')
    logger.info('loglevel: %s', LOGLEVEL)
    """
    input:
        https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-lambda-authorizer-input.html
    output:
        https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-lambda-authorizer-output.html

    stagevariables:
    https://docs.aws.amazon.com/en_en/apigateway/latest/developerguide/stage-variables.html
    """
    logger.info('Retrieving stage variables')
    stageVariables = event.get('stageVariables')

    # not secret
    base_uri = stageVariables.get('base_uri')

    # secrets
    jwt_secrets = stageVariables.get('jwt_secrets').split(',')

    if len(jwt_secrets) == 0:
        logger.error('Must pass a jwt_secrets stage variable')

    logger.debug('base_uri: %s', base_uri)

    oauth_token = "oauth_token"
    oauth_token_key = base_uri + '/' + oauth_token

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

    jwt_token = get_jwt_token(event.get('headers'), oauth_token)
    if oauth_token_key not in jwt_token:
        logger.info("User not auth'd")
        raise Exception('Unauthorized')

    logger.info("User successfully auth'd")
    principalId = jwt_token['sub']

    tmp = event['methodArn'].split(':')
    apiGatewayArnTmp = tmp[5].split('/')
    awsAccountId = tmp[4]

    policy = AuthPolicy(principalId, awsAccountId)
    policy.restApiId = apiGatewayArnTmp[0]
    policy.region = tmp[3]
    policy.stage = apiGatewayArnTmp[1]
    policy.allowAllMethods()

    # Finally, build the policy
    authResponse = policy.build()

    # new! -- add additional key-value pairs associated with the authenticated principal
    # these are made available by APIGW like so: $context.authorizer.<key>
    # additional context is cached
    context = {
        'user': principalId
    }

    authResponse['context'] = context

    return authResponse

# *******************************************************************************
# from https://github.com/awslabs/aws-apigateway-lambda-authorizer-blueprints/
# blob/master/blueprints/python/api-gateway-authorizer-python.py
# *******************************************************************************


class HttpVerb:
    GET     = "GET"
    POST    = "POST"
    PUT     = "PUT"
    PATCH   = "PATCH"
    HEAD    = "HEAD"
    DELETE  = "DELETE"
    OPTIONS = "OPTIONS"
    ALL     = "*"


class AuthPolicy(object):
    awsAccountId = ""
    """The AWS account id the policy will be generated for. This is used to create the method ARNs."""
    principalId = ""
    """The principal used for the policy, this should be a unique identifier for the end user."""
    version = "2012-10-17"
    """The policy version used for the evaluation. This should always be '2012-10-17'"""
    pathRegex = "^[/.a-zA-Z0-9-\*]+$"
    """The regular expression used to validate resource paths for the policy"""

    """these are the internal lists of allowed and denied methods. These are lists
    of objects and each object has 2 properties: A resource ARN and a nullable
    conditions statement.
    the build method processes these lists and generates the approriate
    statements for the final policy"""
    allowMethods = []
    denyMethods = []

    restApiId = "*"
    """The API Gateway API id. By default this is set to '*'"""
    region = "*"
    """The region where the API is deployed. By default this is set to '*'"""
    stage = "*"
    """The name of the stage used in the policy. By default this is set to '*'"""

    def __init__(self, principal, awsAccountId):
        self.awsAccountId = awsAccountId
        self.principalId = principal
        self.allowMethods = []
        self.denyMethods = []

    def _addMethod(self, effect, verb, resource, conditions):
        """Adds a method to the internal lists of allowed or denied methods. Each object in
        the internal list contains a resource ARN and a condition statement. The condition
        statement can be null."""
        if verb != "*" and not hasattr(HttpVerb, verb):
            raise NameError("Invalid HTTP verb " + verb + ". Allowed verbs in HttpVerb class")
        resourcePattern = re.compile(self.pathRegex)
        if not resourcePattern.match(resource):
            raise NameError("Invalid resource path: " + resource + ". Path should match " + self.pathRegex)

        if resource[:1] == "/":
            resource = resource[1:]

        resourceArn = ("arn:aws:execute-api:" +
            self.region + ":" +
            self.awsAccountId + ":" +
            self.restApiId + "/" +
            self.stage + "/" +
            verb + "/" +
            resource)

        if effect.lower() == "allow":
            self.allowMethods.append({
                'resourceArn' : resourceArn,
                'conditions' : conditions
            })
        elif effect.lower() == "deny":
            self.denyMethods.append({
                'resourceArn' : resourceArn,
                'conditions' : conditions
            })

    def _getEmptyStatement(self, effect):
        """Returns an empty statement object prepopulated with the correct action and the
        desired effect."""
        statement = {
            'Action': 'execute-api:Invoke',
            'Effect': effect[:1].upper() + effect[1:].lower(),
            'Resource': []
        }

        return statement

    def _getStatementForEffect(self, effect, methods):
        """This function loops over an array of objects containing a resourceArn and
        conditions statement and generates the array of statements for the policy."""
        statements = []

        if len(methods) > 0:
            statement = self._getEmptyStatement(effect)

            for curMethod in methods:
                if curMethod['conditions'] is None or len(curMethod['conditions']) == 0:
                    statement['Resource'].append(curMethod['resourceArn'])
                else:
                    conditionalStatement = self._getEmptyStatement(effect)
                    conditionalStatement['Resource'].append(curMethod['resourceArn'])
                    conditionalStatement['Condition'] = curMethod['conditions']
                    statements.append(conditionalStatement)

            statements.append(statement)

        return statements

    def allowAllMethods(self):
        """Adds a '*' allow to the policy to authorize access to all methods of an API"""
        self._addMethod("Allow", HttpVerb.ALL, "*", [])

    def denyAllMethods(self):
        """Adds a '*' allow to the policy to deny access to all methods of an API"""
        self._addMethod("Deny", HttpVerb.ALL, "*", [])

    def allowMethod(self, verb, resource):
        """Adds an API Gateway method (Http verb + Resource path) to the list of allowed
        methods for the policy"""
        self._addMethod("Allow", verb, resource, [])

    def denyMethod(self, verb, resource):
        """Adds an API Gateway method (Http verb + Resource path) to the list of denied
        methods for the policy"""
        self._addMethod("Deny", verb, resource, [])

    def allowMethodWithConditions(self, verb, resource, conditions):
        """Adds an API Gateway method (Http verb + Resource path) to the list of allowed
        methods and includes a condition for the policy statement. More on AWS policy
        conditions here: http://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements.html#Condition"""
        self._addMethod("Allow", verb, resource, conditions)

    def denyMethodWithConditions(self, verb, resource, conditions):
        """Adds an API Gateway method (Http verb + Resource path) to the list of denied
        methods and includes a condition for the policy statement. More on AWS policy
        conditions here: http://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements.html#Condition"""
        self._addMethod("Deny", verb, resource, conditions)

    def build(self):
        """Generates the policy document based on the internal lists of allowed and denied
        conditions. This will generate a policy with two main statements for the effect:
        one statement for Allow and one statement for Deny.
        Methods that includes conditions will have their own statement in the policy."""
        if ((self.allowMethods is None or len(self.allowMethods) == 0) and
                (self.denyMethods is None or len(self.denyMethods) == 0)):
            raise NameError("No statements defined for the policy")

        policy = {
            'principalId' : self.principalId,
            'policyDocument' : {
                'Version' : self.version,
                'Statement' : []
            }
        }

        policy['policyDocument']['Statement'].extend(self._getStatementForEffect("Allow", self.allowMethods))
        policy['policyDocument']['Statement'].extend(self._getStatementForEffect("Deny", self.denyMethods))

        return policy
