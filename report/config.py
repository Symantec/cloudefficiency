import json
import os

_config = None
_vp_list = None

_CONFIG_FILE = 'config.json'


def get():
    global _config
    if not _config:
        path = os.path.join(os.path.dirname(os.path.abspath(__file__)), _CONFIG_FILE)
        with open(path) as f:
            _config = json.load(f)
    return _config


def get_vp_list(conf):
    global _vp_list
    if not _vp_list:
        _list = conf['VP_LIST']
        _vp_list = set(_list)
    return _vp_list


def get_product_line_vp_mapping(conf, product_line_name):
    '''
    Map product line tag name to vp
    '''
    return conf['PRODUCT_LINE_VP_MAP'].get(product_line_name)


def get_account_vp_mapping(conf, account_id):
    '''
    Map account id to vp
    '''
    return conf['ACCOUNT_TO_OWNER'].get('account_id')
