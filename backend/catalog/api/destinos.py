from decimal import Decimal

from django.core.validators import RegexValidator
from rest_framework import mixins, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.validators import UniqueValidator

from accounts.permisos import EsAdminGeneralOCatalogo
from catalog.aeropuertos import AEROPUERTOS
from catalog.models import Destino


class SerializadorDestinoPublico(serializers.ModelSerializer):
    class Meta:
        model = Destino
        fields = ["city", "region", "country", "name", "code", "latitude", "longitude"]


class SerializadorDestinoAdmin(SerializadorDestinoPublico):
    code = serializers.CharField(
        max_length=3,
        validators=[
            RegexValidator(r"\A[A-Za-z]{3}\Z", "Ingresá un código IATA de tres letras."),
            UniqueValidator(queryset=Destino.objects.all(), lookup="iexact", message="Ya existe ese aeropuerto."),
        ],
    )

    class Meta(SerializadorDestinoPublico.Meta):
        fields = ["id", *SerializadorDestinoPublico.Meta.fields, "is_active"]
        read_only_fields = ["id", "is_active"]

    def validate_code(self, value):
        codigo = value.strip().upper()
        if self.instance and self.instance.code != codigo:
            raise serializers.ValidationError("El código IATA identifica al aeropuerto en los vuelos existentes.")
        return codigo

    def validate(self, attrs):
        for campo in ("city", "region", "country", "name"):
            if campo in attrs and not attrs[campo].strip():
                raise serializers.ValidationError({campo: "Este campo es obligatorio."})
        latitud, longitud = attrs.get("latitude"), attrs.get("longitude")
        if latitud is not None and not -90 <= latitud <= 90:
            raise serializers.ValidationError({"latitude": "La latitud va de -90 a 90."})
        if longitud is not None and not -180 <= longitud <= 180:
            raise serializers.ValidationError({"longitude": "La longitud va de -180 a 180."})
        # Si no se cargan coordenadas y el aeropuerto es conocido, se ubica solo en el mapa.
        conocido = AEROPUERTOS.get(attrs.get("code") or (self.instance.code if self.instance else ""))
        if conocido and latitud is None and longitud is None and not (self.instance and self.instance.latitude):
            attrs["latitude"] = Decimal(str(conocido[4]))
            attrs["longitude"] = Decimal(str(conocido[5]))
        return attrs


class VistaDestinosPublicos(mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = Destino.objects.filter(is_active=True)
    serializer_class = SerializadorDestinoPublico
    permission_classes = [AllowAny]


class VistaDestinosAdmin(viewsets.ModelViewSet):
    queryset = Destino.objects.all()
    serializer_class = SerializadorDestinoAdmin
    permission_classes = [EsAdminGeneralOCatalogo]

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])

    @action(detail=True, methods=["post"])
    def reactivate(self, request, pk=None):
        destino = self.get_object()
        destino.is_active = True
        destino.save(update_fields=["is_active"])
        return Response(self.get_serializer(destino).data)
