from django.db.models import Exists, OuterRef, Q
from django_filters import rest_framework as filters

from .models import ClaseCabina, TarifaVuelo, Vuelo


class FiltroVuelos(filters.FilterSet):
    """Filtros compartidos para buscar vuelos en catálogo y en el panel de administración."""

    origin = filters.CharFilter(method="filtrar_origen")
    destination = filters.CharFilter(method="filtrar_destino")
    airline = filters.CharFilter(field_name="airline", lookup_expr="icontains")
    departure_date = filters.DateFilter(field_name="departure_at", lookup_expr="date")
    departure_from = filters.DateFilter(field_name="departure_at", lookup_expr="date__gte")
    departure_to = filters.DateFilter(field_name="departure_at", lookup_expr="date__lte")
    direct_only = filters.BooleanFilter(method="filtrar_directos")
    cabin_class = filters.ChoiceFilter(choices=ClaseCabina.choices, method="filtrar_clase")
    min_price = filters.NumberFilter(method="filtrar_precio_minimo")
    max_price = filters.NumberFilter(method="filtrar_precio_maximo")
    min_seats = filters.NumberFilter(method="filtrar_asientos_minimos")

    solo_tarifas_activas = True

    class Meta:
        model = Vuelo
        fields = ["origin", "destination", "airline", "departure_date", "departure_from", "departure_to"]

    def _tarifas_vuelo(self):
        qs = TarifaVuelo.objects.filter(flight=OuterRef("pk"))
        if self.solo_tarifas_activas:
            qs = qs.filter(is_active=True)
        return qs

    def filtrar_origen(self, queryset, name, value):
        return queryset.filter(Q(origin_code__icontains=value) | Q(origin_city__icontains=value))

    def filtrar_destino(self, queryset, name, value):
        return queryset.filter(Q(destination_code__icontains=value) | Q(destination_city__icontains=value))

    def filtrar_directos(self, queryset, name, value):
        return queryset.filter(stops=0) if value else queryset

    def filtrar_clase(self, queryset, name, value):
        return queryset.filter(Exists(self._tarifas_vuelo().filter(cabin_class=value)))

    def filtrar_precio_minimo(self, queryset, name, value):
        return queryset.filter(min_price_ars__gte=value)

    def filtrar_precio_maximo(self, queryset, name, value):
        return queryset.filter(min_price_ars__lte=value)

    def filtrar_asientos_minimos(self, queryset, name, value):
        return queryset.filter(Exists(self._tarifas_vuelo().filter(available_seats__gte=value)))


class FiltroVuelosAdmin(FiltroVuelos):
    """Extiende los filtros de vuelos para incluir el estado activo/inactivo en administración."""

    is_active = filters.BooleanFilter(field_name="is_active")
    solo_tarifas_activas = False

    class Meta(FiltroVuelos.Meta):
        fields = [*FiltroVuelos.Meta.fields, "is_active"]
