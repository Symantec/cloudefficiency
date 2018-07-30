import unittest

import config
from cloudability import get_rightsizing_data


class TestCloudabilityReport(unittest.TestCase):

    def test_count(self):
        conf = config.get()

        def check_result(data):
            expect_count = int(data['meta']['totalCount'])

            results = data['result']
            self.assertEqual(len(results), expect_count)

            ids = {i['resourceIdentifier'] for i in results}

            self.assertEqual(len(ids), expect_count)

        data = get_rightsizing_data(conf['cloudability_api_key'], use_cache=False)
        check_result(data)

        data = get_rightsizing_data(conf['cloudability_api_key'], use_cache=True)
        check_result(data)


if __name__ == "__main__":
    unittest.main()
