from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .api.cierre_sesion import VistaCierreSesion
from .api.registro import VistaRegistro
from .api.sesion import VistaInicioSesion, VistaUsuarioActual

urlpatterns = [
    path("auth/register/", VistaRegistro.as_view(), name="register"),
    path("auth/login/", VistaInicioSesion.as_view(), name="login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("auth/me/", VistaUsuarioActual.as_view(), name="current-user"),
    path("auth/logout/", VistaCierreSesion.as_view(), name="logout"),
]
