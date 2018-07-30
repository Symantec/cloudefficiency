import unittest

import cloudability
import config
from employees import Employee
from allocate_efficiency import owner_by_email


class TestEmployees(unittest.TestCase):

    def test_retrieve_records(self):
        Employee.retrieve_records({'VP_LIST': []}, use_cache=False)
        self.assertTrue(len(Employee.by_account_name) > 0)

    def test_get_vp(self):
        Employee.retrieve_records({'VP_LIST': []}, use_cache=True)
        conf = config.get()
        # TODO take from config
        vp = Employee.get_vp_saml(conf, employee_saml_account='<someone>')
        self.assertEqual('<someone_else>', vp.account_name)

    def test_who_owns_dl(self):
        conf = config.get()
        Employee.retrieve_records({'VP_LIST': []}, use_cache=True)

        instances = cloudability.get_rightsizing_data(conf['cloudability_api_key'])['result']

        accounted_emails = set(map(lambda i: owner_by_email(i, {}), instances))
        dls = set(filter(lambda s: (s or "").lower().startswith('dl-'), accounted_emails))

        for dl in dls:
            owner = Employee.who_owns_dl(conf, dl)
            self.assertTrue(owner, "dl:{} has no owner".format(dl))
            self.assertFalse(type(owner) == list)
        # TODO take from config
        result = Employee.who_owns_dl(conf, '<some dl>')
        self.assertTrue(len(result) > 0)


if __name__ == "__main__":
    unittest.main()
