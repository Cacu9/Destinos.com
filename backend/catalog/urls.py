from django.urls import path
from rest_framework.routers import SimpleRouter

from .api.tarifas_admin import VistaTarifaAdmin, VistaTarifasPorVueloAdmin
from .api.vuelos_admin import VistaVuelosAdmin
from .api.vuelos_publicos import VistaVuelosPublicos

router = SimpleRouter()
router.register("flights", VistaVuelosPublicos, basename="flight")
router.register("admin/flights", VistaVuelosAdmin, basename="admin-flight")
router.register("admin/fares", VistaTarifaAdmin, basename="admin-fare")

urlpatterns = [
    path(
        "admin/flights/<int:flight_id>/fares/",
        VistaTarifasPorVueloAdmin.as_view({"get": "list", "post": "create"}),
        name="admin-flight-fares",
    ),
    *router.urls,
]
