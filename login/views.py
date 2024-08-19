from django.shortcuts import render
from django.http import HttpResponse
# from login.models import Employee
from datetime import datetime
from django.core.exceptions import ObjectDoesNotExist, MultipleObjectsReturned
from django.shortcuts import redirect
# from django.http import JsonResponse
import hashlib
# Create your views here.


def login(requests):
    return render(requests, "pages/login.html")


def index(requests):
    return render(requests, "pages/index.html")


def senddata(requests, act, pwd):
    now = datetime.now()
    pwd = hashlib.md5(pwd.encode('utf-8')).hexdigest()
    try:
        # employee = Employee.objects.get(account=act, pwd=pwd)
        return redirect('/')
    except ObjectDoesNotExist:
        return redirect('/')
    except MultipleObjectsReturned:
        return redirect('/')

    return render(requests, "pages/index.html", locals())


# def showpost(requests, id):
#     try:
#         post = Employee.objects.get(id=id)
#     except ObjectDoesNotExist:
#         return redirect('/')
#     except MultipleObjectsReturned:
#         return redirect('/')

#     return render(requests, "pages/post.html", locals())


# def testjson(requests):
#     employees = list(Employee.objects.all().values())
#     return JsonResponse(employees, status=200, safe=False)
