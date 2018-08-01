'''
Attribution:
ldap code with help from https://github.com/JohnTheodore
'''
from ldap3 import Server, Connection, AUTO_BIND_NO_TLS, SUBTREE, ALL
import os.path
import pickle

from . import config

CACHE_NAME = 'ldap_entries.pickle'


def _get_ldap_connection(conf):
    server = Server(conf['ldap_url'], port=conf['ldap_port'], use_ssl=True, get_info=ALL)
    c = Connection(server,
            auto_bind=AUTO_BIND_NO_TLS,
            read_only=True,
            check_names=True,
            user=conf['ldap_binddn'],
            password=conf['ldap_bindpw'])
    return c


class LDAP_DL:
    def __init__(self, ldap_entries):
        self.managedbys = []
        self.secondaries = []
        self.members = []

        def from_cn(cn_s):
            account_name = cn_s.replace('CN=', '')\
                .split(',')[0]\
                .replace(' ', '_')\
                .lower()
            # remove all but last underscore
            account_name = account_name.replace('_', '', account_name.count('_') - 1)
            if account_name not in Employee.by_account_name:
                return None
            return Employee.by_account_name[account_name]

        for entry in ldap_entries:
            managedbys = entry['attributes']['managedBy']
            if type(managedbys) == list:
                for managedby in managedbys:
                    self.managedbys.append(from_cn(managedby))
            else:
                self.managedbys.append(from_cn(managedbys))
            secondaries = entry['attributes']['msExchCoManagedByLink']
            if type(secondaries) == list:
                for secondary in entry['attributes']['msExchCoManagedByLink']:
                    self.secondaries.append(from_cn(secondary))
            else:
                self.secondaries.append(from_cn(secondaries))
            members = entry['attributes']['member']
            if type(members) == list:
                for member in entry['attributes']['member']:
                    self.members.append(from_cn(member))
            else:
                self.members.append(from_cn(members))

        self.managedbys = list(filter(lambda x: x, self.managedbys))
        self.secondaries = list(filter(lambda x: x, self.secondaries))
        self.members = list(filter(lambda x: x, self.members))


def _ldap_lookup_dl(conf, dl_name):
    c = _get_ldap_connection(conf)

    ldab_basedn = conf["ldab_dl_basedn"]
    ldap_search_filter = conf["ldap_dl_search_filter_template"].format(dl_name)
    ldap_paged_search_generator = c.extend.standard.paged_search(search_base=ldab_basedn,
        search_filter=ldap_search_filter,
        attributes=['member', 'managedBy', 'msExchCoManagedByLink'], get_operational_attributes=True)

    entries = list(ldap_paged_search_generator)
    c.unbind()
    return LDAP_DL(entries)


def _get_employee_entries(use_cache=True):
    if use_cache and os.path.isfile(CACHE_NAME):
        print("getting entries from cache:", CACHE_NAME)
        with open(CACHE_NAME, 'rb') as f:
            entries = pickle.load(f)
            return entries

    conf = config.get()
    c = _get_ldap_connection(conf)

    ldap_paged_search_generator = c.extend.standard.paged_search(search_base=conf['ldap_basedn'],
        search_filter=conf['ldap_search_filter'],
        search_scope=SUBTREE,
        paged_size=5000,
        attributes=conf['ldap_searchreq_attrlist'],
        get_operational_attributes=True)

    entries = list(ldap_paged_search_generator)
    c.unbind()
    if use_cache:
        with open(CACHE_NAME, 'wb') as f:
            print("writing entries to cache:", CACHE_NAME)
            pickle.dump(entries, f, pickle.HIGHEST_PROTOCOL)
    return entries


class Employee:
    def __init__(self, account_name, direct_reports, email, is_vp):
        self.account_name = account_name
        self.direct_reports = direct_reports
        self.email = email
        self.manager = None
        self.cost = None
        self.waste = None
        self.org_cost = None
        self.org_waste = None
        self.vp_cost = None
        self.vp_waste = None
        self.is_vp = is_vp

    def __str__(self):
        return '''
        Employee
        ---
        account_name: {}
        direct_reports: {}
        email: {}
        manager: {}
        cost: {}
        waste: {}
        org_cost: {}
        org_waste: {}
        vp_cost: {}
        vp_waste: {}
        is_vp: {}
        '''.format(
            self.account_name,
            len(self.direct_reports),
            self.email,
            self.manager.account_name if self.manager else "no manager",
            self.cost,
            self.waste,
            self.org_cost,
            self.org_waste,
            self.vp_cost,
            self.vp_waste,
            self.is_vp)

    @classmethod
    def from_entry(entry):
        account_name = entry['attributes']['sAMAccountName'].lower()
        return Employee.by_account_name(account_name)

    @classmethod
    def retrieve_records(cls, conf, use_cache=True):
        entries = _get_employee_entries(use_cache)

        vp_set = set(config.get_vp_list(conf))

        dn_employee = {}
        account_name_employee = {}
        email_employee = {}

        for entry in entries:
            account_name = entry['attributes']['sAMAccountName'].lower()
            email = entry['attributes']['mail']
            if isinstance(email, list):
                email = map(lambda s: s.lower(), email)
            else:
                email = email.lower()
            dn = entry['dn']
            emp = Employee(account_name, [], email, account_name in vp_set)

            dn_employee[dn] = emp
            account_name_employee[account_name] = emp
            if email:
                if isinstance(email, list):
                    for e in email:
                        email_employee[email] = emp
                else:
                    email_employee[email] = emp

        unknown_employee_count = 0
        for entry in entries:
            direct_reports = entry['attributes']['directReports']
            emp = dn_employee[entry['dn']]
            for dn in direct_reports:
                if dn not in dn_employee:
                    unknown_employee_count += 1
                    continue
                current_report = dn_employee[dn]
                emp.direct_reports.append(current_report)
                current_report.manager = emp

        if unknown_employee_count > 0:
            print("couldn't find", unknown_employee_count, "reporting employees")

        Employee.by_account_name = account_name_employee
        Employee.by_email = email_employee

    @classmethod
    def who_owns_dl(cls, conf, dl_name):
        '''
        Returns (owner, membership_level) tuple or None.
        '''
        dl = _ldap_lookup_dl(conf, dl_name)
        if len(dl.managedbys) > 0:
            return (dl.managedbys[0], 'manages')
        elif len(dl.secondaries) > 0:
            return (dl.secondaries[0], 'secondarily manages')
        elif len(dl.members) > 0:
            return (dl.members[0], 'member')
        else:
            return None

    @classmethod
    def get_vp_saml(cls, conf, employee_saml_account=None, employee_email=None):
        assert employee_email or employee_saml_account
        vp_list = config.get_vp_list(conf)
        emp = None
        if employee_saml_account:
            emp = cls.by_account_name.get(employee_saml_account)
        if employee_email and not emp:
            emp = cls.by_email.get(employee_email)
        if not emp:
            raise EmployeeNotFound()
        while emp.manager and emp.account_name not in vp_list:
            emp = emp.manager
        return emp


class EmployeeNotFound(Exception):
    pass
