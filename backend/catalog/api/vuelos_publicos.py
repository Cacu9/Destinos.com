from django.db.models import OuterRef, Subquery
from django.db.models.functions import Coalesce
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import mixins, permissions, viewsets
from rest_framework.filters import OrderingFilter, SearchFilter

from catalog.filtros import FiltroVuelosPublicos
from catalog.models import Destino, Vuelo

from .serializadores_publicos import SerializadorVueloCatalogo, SerializadorVueloDetalle


class VistaVuelosPublicos(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Catálogo público de vuelos activos; el detalle completo requiere iniciar sesión."""

    filterset_class = FiltroVuelosPublicos
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["flight_number", "airline", "public_origin_city", "origin_code", "public_destination_city", "destination_code"]
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
        destinos = Destino.objects.all()
        inactivos = destinos.filter(is_active=False).values("code")
        return (
            Vuelo.objects.con_catalogo(solo_activos=True)
            .exclude(origin_code__in=inactivos)
            .exclude(destination_code__in=inactivos)
            .annotate(
                public_origin_city=Coalesce(
                    Subquery(destinos.filter(code=OuterRef("origin_code")).values("city")[:1]), "origin_city"
                ),
                public_destination_city=Coalesce(
                    Subquery(destinos.filter(code=OuterRef("destination_code")).values("city")[:1]), "destination_city"
                ),
            )
        )
