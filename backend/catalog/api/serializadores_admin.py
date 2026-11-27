from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from catalog.models import TarifaVuelo, TipoViaje, TramoVuelo, Vuelo

from .serializadores_publicos import SerializadorTramoPoliticaPublico, resumen_cancelacion


class SerializadorTarifaAdmin(serializers.ModelSerializer):
    cabin_class_display = serializers.CharField(source="get_cabin_class_display", read_only=True)
    currency_display = serializers.CharField(source="get_currency_display", read_only=True)

    class Meta:
        model = TarifaVuelo
        fields = [
            "id",
            "flight",
            "cabin_class",
            "cabin_class_display",
            "price_ars",
            "currency",
            "currency_display",
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


class SerializadorTramoAdmin(serializers.ModelSerializer):
    duration_minutes = serializers.IntegerField(read_only=True)

    class Meta:
        model = TramoVuelo
        fields = [
            "position",
            "flight_number",
            "origin_city",
            "origin_code",
            "destination_city",
            "destination_code",
            "departure_at",
            "arrival_at",
            "duration_minutes",
            "stops",
        ]
        read_only_fields = ["position", "duration_minutes"]


class SerializadorVueloAdmin(serializers.ModelSerializer):
    """Gestión de vuelos y sus tarifas por clase para Administración General y Catálogo y Precios."""

    duration_minutes = serializers.IntegerField(read_only=True)
    min_price_ars = serializers.SerializerMethodField()
    currency_display = serializers.CharField(source="get_currency_display", read_only=True)
    fares = SerializadorTarifaAdmin(many=True, required=False)
    legs = SerializadorTramoAdmin(many=True, required=False)
    cancellation_rules = SerializadorTramoPoliticaPublico(many=True, read_only=True)
    cancellation_summary = serializers.SerializerMethodField()
    total_stops = serializers.IntegerField(read_only=True)

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
            "total_stops",
            "trip_type",
            "base_price_ars",
            "currency",
            "currency_display",
            "min_price_ars",
            "cancellation_policy",
            "cancellation_summary",
            "is_non_refundable",
            "cancellation_rules",
            "policy_updated_at",
            "notes",
            "is_active",
            "created_at",
            "updated_at",
            "fares",
            "legs",
        ]
        read_only_fields = ["is_active", "is_non_refundable", "policy_updated_at", "created_at", "updated_at"]

    def get_cancellation_summary(self, obj: Vuelo) -> str:
        return resumen_cancelacion(obj)

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

        self._validar_tramos(attrs, salida, llegada, origen, destino)

        tarifas = attrs.get("fares") or []
        clases = [tarifa["cabin_class"] for tarifa in tarifas]
        if len(clases) != len(set(clases)):
            raise serializers.ValidationError({"fares": "No podés repetir la misma clase de cabina en un mismo vuelo."})

        return attrs

    def _validar_tramos(self, attrs, salida, llegada, origen, destino):
        """Ida y vuelta: un tramo de regreso por la ruta inversa. Multidestino: uno o más tramos que siguen en el tiempo."""
        tipo = attrs.get("trip_type", self.instance.trip_type if self.instance else TipoViaje.ONE_WAY)
        if "legs" in attrs:
            tramos = attrs["legs"]
        elif self.instance is not None:
            tramos = None  # Sin cambios en los tramos; solo se valida si cambió el tipo.
        else:
            tramos = []

        if tramos is None:
            if "trip_type" in attrs and attrs["trip_type"] != self.instance.trip_type:
                raise serializers.ValidationError({"legs": "Al cambiar el tipo de viaje, cargá también sus tramos."})
            return

        if tipo == TipoViaje.ONE_WAY and tramos:
            raise serializers.ValidationError({"legs": "Un vuelo de solo ida no lleva tramos adicionales."})
        if tipo == TipoViaje.ROUND_TRIP and len(tramos) != 1:
            raise serializers.ValidationError({"legs": "Un vuelo de ida y vuelta lleva exactamente un tramo de vuelta."})
        if tipo == TipoViaje.MULTI_CITY and not tramos:
            raise serializers.ValidationError({"legs": "Un multidestino lleva al menos un tramo adicional."})

        anterior_llegada = llegada
        anterior_destino = (destino or "").strip().upper()
        for indice, tramo in enumerate(tramos, start=2):
            codigo_origen = tramo["origin_code"].strip().upper()
            codigo_destino = tramo["destination_code"].strip().upper()
            if codigo_origen == codigo_destino:
                raise serializers.ValidationError({"legs": f"Tramo {indice}: el destino debe ser distinto al origen."})
            if tramo["arrival_at"] <= tramo["departure_at"]:
                raise serializers.ValidationError({"legs": f"Tramo {indice}: la llegada debe ser posterior a la salida."})
            if anterior_llegada and tramo["departure_at"] <= anterior_llegada:
                raise serializers.ValidationError(
                    {"legs": f"Tramo {indice}: tiene que salir después de que llegue el tramo anterior."}
                )
            if tipo == TipoViaje.ROUND_TRIP and (
                codigo_origen != anterior_destino or codigo_destino != (origen or "").strip().upper()
            ):
                raise serializers.ValidationError(
                    {"legs": "La vuelta tiene que hacer la ruta inversa de la ida."}
                )
            anterior_llegada = tramo["arrival_at"]
            anterior_destino = codigo_destino

    @staticmethod
    def _guardar_tramos(vuelo: Vuelo, tramos_data):
        vuelo.legs.all().delete()
        for posicion, tramo in enumerate(tramos_data, start=2):
            TramoVuelo.objects.create(flight=vuelo, position=posicion, **tramo)

    @transaction.atomic
    def create(self, validated_data):
        tarifas_data = validated_data.pop("fares", [])
        tramos_data = validated_data.pop("legs", [])
        vuelo = Vuelo.objects.create(**validated_data)
        if tarifas_data:
            TarifaVuelo.objects.bulk_create([TarifaVuelo(flight=vuelo, **tarifa) for tarifa in tarifas_data])
        self._guardar_tramos(vuelo, tramos_data)
        return vuelo

    @transaction.atomic
    def update(self, instance, validated_data):
        tramos_data = validated_data.pop("legs", None)
        vuelo = super().update(instance, validated_data)
        if tramos_data is not None:
            self._guardar_tramos(vuelo, tramos_data)
        return vuelo
