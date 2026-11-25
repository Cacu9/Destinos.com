from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import mixins, permissions, viewsets
from rest_framework.filters import OrderingFilter, SearchFilter

from catalog.filtros import FiltroVuelos
from catalog.models import Vuelo

from .serializadores_publicos import SerializadorVueloCatalogo, SerializadorVueloDetalle


class VistaVuelosPublicos(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Catálogo público de vuelos activos; el detalle completo requiere iniciar sesión."""

    filterset_class = FiltroVuelos
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["flight_number", "airline", "origin_city", "origin_code", "destination_city", "destination_code"]
    ordering_fields = ["departure_at", "base_price_ars", "min_price_ars", "stops"]
    ordering = ["departure_at", "id"]

    def get_permissions(self):
        if self.action == "retrieve":
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return SerializadorVueloDetalle
        return SerializadorVueloCatalogo

    def get_queryset(self):
        return Vuelo.objects.con_catalogo(solo_activos=True)
