from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from catalog.models import TarifaVuelo, Vuelo


class SerializadorTarifaAdmin(serializers.ModelSerializer):
    cabin_class_display = serializers.CharField(source="get_cabin_class_display", read_only=True)

    class Meta:
        model = TarifaVuelo
        fields = [
            "id",
            "flight",
            "cabin_class",
            "cabin_class_display",
            "price_ars",
            "available_seats",
            "baggage_included",
            "is_refundable",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["flight", "is_active", "created_at", "updated_at"]

    def validate(self, attrs):
        vuelo = self.context.get("flight") or (self.instance.flight if self.instance else None)
        clase = attrs.get("cabin_class", self.instance.cabin_class if self.instance else None)
        if vuelo and clase:
            duplicada = TarifaVuelo.objects.filter(flight=vuelo, cabin_class=clase)
            if self.instance is not None:
                duplicada = duplicada.exclude(pk=self.instance.pk)
            if duplicada.exists():
                raise serializers.ValidationError({"cabin_class": "Ya existe una tarifa para esa clase en este vuelo."})
        return attrs


class SerializadorVueloAdmin(serializers.ModelSerializer):
    """Gestión de vuelos y sus tarifas por clase para Administración General y Catálogo y Precios."""

    duration_minutes = serializers.IntegerField(read_only=True)
    min_price_ars = serializers.SerializerMethodField()
    fares = SerializadorTarifaAdmin(many=True, required=False)

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
            "min_price_ars",
            "cancellation_policy",
            "notes",
            "is_active",
            "created_at",
            "updated_at",
            "fares",
        ]
        read_only_fields = ["is_active", "created_at", "updated_at"]

    def get_min_price_ars(self, obj: Vuelo) -> Decimal:
        precio_anotado = getattr(obj, "min_price_ars", None)
        if precio_anotado is not None:
            return precio_anotado
        precios = [tarifa.price_ars for tarifa in obj.fares.all() if tarifa.is_active]
        return min(precios) if precios else obj.base_price_ars

    def validate(self, attrs):
        salida = attrs.get("departure_at", self.instance.departure_at if self.instance else None)
        llegada = attrs.get("arrival_at", self.instance.arrival_at if self.instance else None)
        if salida and llegada and llegada <= salida:
            raise serializers.ValidationError({"arrival_at": "La llegada debe ser posterior a la salida."})

        origen = attrs.get("origin_code", self.instance.origin_code if self.instance else "")
        destino = attrs.get("destination_code", self.instance.destination_code if self.instance else "")
        if origen and destino and origen.strip().upper() == destino.strip().upper():
            raise serializers.ValidationError({"destination_code": "El código de destino debe ser distinto al de origen."})

        numero = attrs.get("flight_number", self.instance.flight_number if self.instance else "")
        if numero and salida:
            duplicado = Vuelo.objects.filter(flight_number=numero.strip().upper(), departure_at=salida)
            if self.instance is not None:
                duplicado = duplicado.exclude(pk=self.instance.pk)
            if duplicado.exists():
                raise serializers.ValidationError(
                    {"flight_number": "Ya existe un vuelo con ese número para la misma fecha y hora de salida."}
                )

        if self.instance is not None and "fares" in attrs:
            raise serializers.ValidationError(
                {"fares": "Modificá las tarifas desde /api/admin/flights/<id>/fares/ o /api/admin/fares/<id>/."}
            )

        tarifas = attrs.get("fares") or []
        clases = [tarifa["cabin_class"] for tarifa in tarifas]
        if len(clases) != len(set(clases)):
            raise serializers.ValidationError({"fares": "No podés repetir la misma clase de cabina en un mismo vuelo."})

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        tarifas_data = validated_data.pop("fares", [])
        vuelo = Vuelo.objects.create(**validated_data)
        if tarifas_data:
            TarifaVuelo.objects.bulk_create([TarifaVuelo(flight=vuelo, **tarifa) for tarifa in tarifas_data])
        return vuelo
