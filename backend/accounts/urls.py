from django.urls import path

from .api.registro import VistaRegistro

urlpatterns = [
    path("auth/register/", VistaRegistro.as_view(), name="register"),
]
