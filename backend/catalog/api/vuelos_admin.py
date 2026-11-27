from django.db import transaction
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from accounts.permisos import EsAdminGeneralOCatalogo
from catalog.filtros import FiltroVuelosAdmin
from catalog.models import TramoPolitica, Vuelo
from catalog.politicas import SerializadorPolitica

from .serializadores_admin import SerializadorVueloAdmin


class VistaVuelosAdmin(viewsets.ModelViewSet):
    """Alta, edición, baja lógica y reactivación de vuelos para Administración General y Catálogo y Precios."""

    serializer_class = SerializadorVueloAdmin
    permission_classes = [EsAdminGeneralOCatalogo]
    filterset_class = FiltroVuelosAdmin
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["flight_number", "airline", "origin_city", "origin_code", "destination_city", "destination_code"]
    ordering_fields = ["departure_at", "base_price_ars", "min_price_ars", "stops", "is_active", "created_at"]
    ordering = ["-is_active", "departure_at", "id"]

    def get_queryset(self):
        return Vuelo.objects.con_catalogo(solo_activos=False)

    def perform_destroy(self, instance: Vuelo):
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])

    # El nombre del método define la ruta de la API (/reactivate/), por eso queda en inglés.
    @action(detail=True, methods=["post"])
    def reactivate(self, request, pk=None):
        vuelo = self.get_object()
        vuelo.is_active = True
        vuelo.save(update_fields=["is_active", "updated_at"])
        return Response(self.get_serializer(vuelo).data)

    # UC30: la política se reemplaza completa. Las reservas futuras guardarán una copia de la vigente al comprar.
    @action(detail=True, methods=["put"], url_path="policy")
    def policy(self, request, pk=None):
        vuelo = self.get_object()
        politica = SerializadorPolitica(data=request.data)
        politica.is_valid(raise_exception=True)
        with transaction.atomic():
            vuelo.is_non_refundable = politica.validated_data["is_non_refundable"]
            vuelo.policy_updated_at = timezone.now()
            vuelo.save(update_fields=["is_non_refundable", "policy_updated_at", "updated_at"])
            vuelo.cancellation_rules.all().delete()
            TramoPolitica.objects.bulk_create(
                [TramoPolitica(flight=vuelo, **tramo) for tramo in politica.validated_data["cancellation_rules"]]
            )
        vuelo = self.get_queryset().get(pk=vuelo.pk)
        return Response(self.get_serializer(vuelo).data)
