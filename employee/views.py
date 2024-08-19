from django.shortcuts import render
from django.http import HttpResponse
# from django.db import connection
from datetime import datetime
from django.core.exceptions import ObjectDoesNotExist, MultipleObjectsReturned
from django.shortcuts import redirect
# from django.http import JsonResponse

# Create your views here.


def list(requests):
    PKind = "list"
    return render(requests, "pages/employee/list.html", locals())


def add(requests):
    return render(requests, "pages/employee/edit.html")


def edit(requests, id):
    try:
        # employee = Employee.objects.get(MMid=id)
        return redirect('/')
    except ObjectDoesNotExist:
        return redirect('/')
    except MultipleObjectsReturned:
        return redirect('/')
    return render(requests, "pages/employee/edit.html")


def senddata(requests):
    try:
        # employee = Employee.objects.get(MMid=id)
        return redirect('/')
    except ObjectDoesNotExist:
        return redirect('/')
    except MultipleObjectsReturned:
        return redirect('/')
    return render(requests, "pages/employee/edit.html")
