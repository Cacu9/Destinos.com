from django.shortcuts import get_object_or_404
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permisos import EsAdminGeneralOCatalogo
from catalog.models import TarifaVuelo, Vuelo

from .serializadores_admin import SerializadorTarifaAdmin


class VistaTarifasPorVueloAdmin(mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    """Lista y crea tarifas por clase para un vuelo específico."""

    serializer_class = SerializadorTarifaAdmin
    permission_classes = [EsAdminGeneralOCatalogo]

    def _obtener_vuelo(self) -> Vuelo:
        return get_object_or_404(Vuelo, pk=self.kwargs["flight_id"])

    def get_queryset(self):
        vuelo = self._obtener_vuelo()
        return TarifaVuelo.objects.filter(flight=vuelo).order_by("-is_active", "price_ars", "id")

    def get_serializer_context(self):
        contexto = super().get_serializer_context()
        if "flight_id" in self.kwargs:
            contexto["flight"] = self._obtener_vuelo()
        return contexto

    def perform_create(self, serializer):
        serializer.save(flight=self._obtener_vuelo())


class VistaTarifaAdmin(
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """Consulta, modifica, da de baja lógica y reactiva una tarifa individual."""

    queryset = TarifaVuelo.objects.select_related("flight").order_by("price_ars", "id")
    serializer_class = SerializadorTarifaAdmin
    permission_classes = [EsAdminGeneralOCatalogo]

    def perform_destroy(self, instance: TarifaVuelo):
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])

    # El nombre del método define la ruta de la API (/reactivate/), por eso queda en inglés.
    @action(detail=True, methods=["post"])
    def reactivate(self, request, pk=None):
        tarifa = self.get_object()
        tarifa.is_active = True
        tarifa.save(update_fields=["is_active", "updated_at"])
        return Response(self.get_serializer(tarifa).data)
