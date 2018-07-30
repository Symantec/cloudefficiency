#!/usr/local/bin/python3
import json
import os.path
import pickle
import re

from . import config
from .employees import Employee, EmployeeNotFound
from . import cloudability

DL_OWNER_CACHE_NAME = 'dl_owners.pickle'


def match_type_prefix(prefix):
    return lambda i: i['nodeType'].startswith(prefix)


def match_recommendation(r):
    return lambda i : i['recommendations'][0]['action'] == r


match_ctype = match_type_prefix('c')
match_non_ctype = lambda i: not match_ctype(i)
match_rightsize = match_recommendation('Rightsize')
get_instance_savings = lambda i: i['recommendations'][0]['savingsAdjusted']
get_instance_recommend = lambda i: i['recommendations'][0]['nodeType']
get_instance_cost = lambda i: i["totalSpendAdjusted"]


def get_email_tag(instance):
    return cloudability.get_tag_value(instance, 'OwnerEmail')


def owner_by_email(instance, dl_to_owner_saml):
    email = get_email_tag(instance)
    if email in dl_to_owner_saml:
        account_name = dl_to_owner_saml[email]
        if account_name in Employee.by_account_name:
            return Employee.by_account_name[account_name]
    if email in Employee.by_email:
        return Employee.by_email[email]
    return None


_non_word = re.compile(r"\W")


def format_user_data(emp, time_period):
    '''
    Generate allocation report data for the given employee.
    '''
    data = {
        "user_saml_name": emp.account_name,
        "cost": emp.cost or 0,
        "waste": emp.waste or 0,
        "org_cost": emp.org_cost or 0,
        "org_waste": emp.org_waste or 0,
    }
    data["reports"] = list(map(lambda r: r.account_name, emp.direct_reports))
    return data


def format_instances_data(instances, time_period):
    '''
    Generate instances report data.
    '''

    def report_data(instance):
        owner = instance.get('owner')
        owners = []
        while owner:
            owners.append(owner.account_name)
            owner = owner.manager
        if not owners:
            owners.append('unknown')
        return {
            "name": instance['resourceIdentifier'],
            "type": instance['nodeType'],
            "recommend": get_instance_recommend(instance),
            "cost": get_instance_cost(instance),
            "waste": get_instance_savings(instance),
            "owners": owners
        }

    return list(map(report_data, instances))


def assign_cost_and_waste(instances, owner_func):
    '''
    assign cost and waste attributes to individual employees for the given instances.

    owner_func should either return an employee object or None if one cannot be found.
    '''
    emp_instances = {}
    attributed_count = 0
    failed_attributed_count = 0

    for instance in instances:
        emp = owner_func(instance)
        if not emp:
            failed_attributed_count += 1
            continue
        attributed_count += 1
        instance['owner'] = emp
        emp_instances.setdefault(emp, []).append(instance)
    print("able to attribute instances:", attributed_count)
    print("failed to attribute instances:", failed_attributed_count)

    for emp, instances in emp_instances.items():
        emp.cost = sum(get_instance_cost(i) for i in instances)
        emp.waste = sum(get_instance_savings(i) for i in instances)


def aggregate_cost_and_waste(employee_roots):
    def traverse_waste(emp):
        org_waste = emp.waste or 0
        if emp.direct_reports:
            org_waste += sum(traverse_waste(r) for r in emp.direct_reports)
        emp.org_waste = org_waste
        return org_waste

    def traverse_cost(emp):
        org_cost = emp.cost or 0
        if emp.direct_reports:
            org_cost += sum(traverse_cost(r) for r in emp.direct_reports)
        emp.org_cost = org_cost
        return org_cost

    for vp in employee_roots:
        traverse_waste(vp)
        traverse_cost(vp)

def output_jsonp(json_data, jsonp_var, file_name, out_dir):

    full_path = os.path.join(out_dir, file_name)
    if not os.path.exists(os.path.dirname(full_path)):
        os.makedirs(os.path.dirname(full_path))
    with open(full_path, 'x') as f:
        f.write('''
        const {1} = {0}
        export default {1};
        '''.format(json.dumps(json_data), jsonp_var))


def generate_pages(employee_roots, instances, time_period, out_dir):

    instances_data = format_instances_data(instances, time_period)
    output_jsonp(instances_data, 'allInstances', 'allInstances.js', out_dir)

    employees_data = {}

    def traverse(emp):
        if emp.account_name in employees_data:
            return
        emp_data = format_user_data(emp, time_period)
        employees_data[emp.account_name] = emp_data

        for r in emp.direct_reports:
            traverse(r)

    for emp in employee_roots:
        traverse(emp)
    output_jsonp(list(employees_data.values()), 'allUsers', 'allUsers.js', out_dir)


def _filter_instances(instances, *match_funcs):
    '''
    Creates a generator.
    '''
    for instance in instances:
        matched = True
        for match_func in match_funcs:
            matched = matched and match_func(instance)
        if matched:
            yield instance


if __name__ == "__main__":

    out_dir = './output'
    conf = config.get()
    Employee.retrieve_records(conf)

    instances = list(_filter_instances(
        cloudability.get_rightsizing_data(conf['cloudability_api_key'])['result'],
        match_ctype,
        match_rightsize))
    print('count of rightsizing ctype instances:', + len(instances))

    accounted_emails = set(filter(lambda x:x, map(lambda i: get_email_tag(i), instances)))
    print('emails seen:', accounted_emails)
    dls = set(filter(lambda s: s.lower().startswith('dl-'), accounted_emails))
    print('dls', dls)

    dl_to_owner_saml = {}
    if os.path.isfile(DL_OWNER_CACHE_NAME):
        print("getting dl owner entries from cache:", DL_OWNER_CACHE_NAME)
        with open(DL_OWNER_CACHE_NAME, 'rb') as f:
            dl_to_owner_saml = pickle.load(f)
    else:
        for dl in dls:
            print("retrieving dl", dl)
            owner = Employee.who_owns_dl(conf, dl)
            if not owner:
                print("Unowned", dl)
                continue
            dl_to_owner_saml[dl] = owner.account_name
        with open(DL_OWNER_CACHE_NAME, 'wb') as f:
            print("writing dl owner entries to cache:", DL_OWNER_CACHE_NAME)
            pickle.dump(dl_to_owner_saml, f, pickle.HIGHEST_PROTOCOL)

    vp_list = config.get_vp_list(conf)
    vp_emps = list(map(lambda n: Employee.by_account_name[n], vp_list))

    print('dl count:', len(list(dl_to_owner_saml.keys())))
    assign_cost_and_waste(instances, lambda i: owner_by_email(i, dl_to_owner_saml))
    aggregate_cost_and_waste(vp_emps)

    generate_pages(vp_emps, instances, 'time_now', out_dir)

    print('total org_waste', sum(map(lambda e: e.org_waste, vp_emps)))
    print('total org_cost', sum(map(lambda e: e.org_cost, vp_emps)))
