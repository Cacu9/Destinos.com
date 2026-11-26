from decimal import Decimal

from rest_framework import serializers

from catalog.models import TarifaVuelo, Vuelo


class SerializadorTarifaPublica(serializers.ModelSerializer):
    cabin_class_display = serializers.CharField(source="get_cabin_class_display", read_only=True)
    currency_display = serializers.CharField(source="get_currency_display", read_only=True)

    class Meta:
        model = TarifaVuelo
        fields = ["id", "cabin_class", "cabin_class_display", "price_ars", "currency", "currency_display", "available_seats"]
        read_only_fields = fields


class SerializadorTarifaDetalle(SerializadorTarifaPublica):
    class Meta(SerializadorTarifaPublica.Meta):
        fields = [*SerializadorTarifaPublica.Meta.fields, "baggage_included", "is_refundable"]
        read_only_fields = fields


class SerializadorVueloCatalogo(serializers.ModelSerializer):
    """Vista resumida del catálogo público de vuelos y sus tarifas activas."""

    duration_minutes = serializers.IntegerField(read_only=True)
    min_price_ars = serializers.SerializerMethodField()
    currency_display = serializers.CharField(source="get_currency_display", read_only=True)
    fares = SerializadorTarifaPublica(many=True, read_only=True)

    class Meta:
        model = Vuelo
        fields = [
            "id",
            "flight_number",
            "airline",
            "origin_city",
            "origin_code",
            "destination_city",
            "destination_code",
            "departure_at",
            "arrival_at",
            "duration_minutes",
            "stops",
            "base_price_ars",
            "currency",
            "currency_display",
            "min_price_ars",
            "fares",
        ]
        read_only_fields = fields

    def get_min_price_ars(self, obj: Vuelo) -> Decimal:
        precio_anotado = getattr(obj, "min_price_ars", None)
        if precio_anotado is not None:
            return precio_anotado
        precios = [tarifa.price_ars for tarifa in obj.fares.all() if tarifa.is_active]
        return min(precios) if precios else obj.base_price_ars


class SerializadorVueloDetalle(SerializadorVueloCatalogo):
    """Ficha completa de un vuelo para usuarios autenticados que consultan más información."""

    fares = SerializadorTarifaDetalle(many=True, read_only=True)

    class Meta(SerializadorVueloCatalogo.Meta):
        fields = [*SerializadorVueloCatalogo.Meta.fields, "cancellation_policy", "notes"]
        read_only_fields = fields
