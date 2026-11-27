from django.core.validators import RegexValidator
from django.db.models import OuterRef, Q, Subquery
from django.db.models.functions import Coalesce
from django_filters import rest_framework as filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import mixins, permissions, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from accounts.permisos import EsAdminGeneralOCatalogo
from catalog.models import Alojamiento, Destino, TipoAlojamiento


class SerializadorAlojamientoPublico(serializers.ModelSerializer):
    city = serializers.CharField(source="public_city", read_only=True)
    accommodation_type_display = serializers.CharField(source="get_accommodation_type_display", read_only=True)
    currency_display = serializers.CharField(source="get_currency_display", read_only=True)

    class Meta:
        model = Alojamiento
        fields = [
            "id",
            "name",
            "accommodation_type",
            "accommodation_type_display",
            "destination_code",
            "city",
            "address",
            "stars",
            "price_per_night",
            "currency",
            "currency_display",
            "max_guests",
            "available_rooms",
            "amenities",
            "cancellation_policy",
            "is_refundable",
        ]
        read_only_fields = fields


class SerializadorAlojamientoAdmin(serializers.ModelSerializer):
    accommodation_type_display = serializers.CharField(source="get_accommodation_type_display", read_only=True)
    currency_display = serializers.CharField(source="get_currency_display", read_only=True)
    destination_code = serializers.CharField(
        max_length=3,
        validators=[RegexValidator(r"\A[A-Za-z]{3}\Z", "Ingresá un código IATA de tres letras.")],
    )

    class Meta:
        model = Alojamiento
        fields = [
            "id",
            "name",
            "accommodation_type",
            "accommodation_type_display",
            "destination_code",
            "city",
            "address",
            "stars",
            "price_per_night",
            "currency",
            "currency_display",
            "max_guests",
            "available_rooms",
            "amenities",
            "cancellation_policy",
            "is_refundable",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "is_active", "created_at", "updated_at"]

    def validate_destination_code(self, value):
        return value.strip().upper()

    def validate(self, attrs):
        for campo in ("name", "city", "address"):
            if campo in attrs and not attrs[campo].strip():
                raise serializers.ValidationError({campo: "Este campo es obligatorio."})
        return attrs


class FiltroAlojamientosBase(filters.FilterSet):
    destination = filters.CharFilter(method="filtrar_destino")
    accommodation_type = filters.ChoiceFilter(choices=TipoAlojamiento.choices)
    min_guests = filters.NumberFilter(field_name="max_guests", lookup_expr="gte")
    min_stars = filters.NumberFilter(field_name="stars", lookup_expr="gte")
    is_refundable = filters.BooleanFilter(field_name="is_refundable")

    class Meta:
        model = Alojamiento
        fields = ["destination", "accommodation_type", "min_guests", "min_stars", "is_refundable"]

    def filtrar_destino(self, queryset, name, value):
        return queryset.filter(Q(destination_code__icontains=value) | Q(city__icontains=value))


class FiltroAlojamientosPublicos(FiltroAlojamientosBase):
    def filtrar_destino(self, queryset, name, value):
        return queryset.filter(Q(destination_code__icontains=value) | Q(public_city__icontains=value))


class FiltroAlojamientosAdmin(FiltroAlojamientosBase):
    is_active = filters.BooleanFilter(field_name="is_active")

    class Meta(FiltroAlojamientosBase.Meta):
        fields = [*FiltroAlojamientosBase.Meta.fields, "is_active"]


class VistaAlojamientosPublicos(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Catálogo público de alojamientos activos."""

    serializer_class = SerializadorAlojamientoPublico
    permission_classes = [permissions.AllowAny]
    filterset_class = FiltroAlojamientosPublicos
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["name", "public_city", "destination_code", "address", "amenities"]
    ordering_fields = ["price_per_night", "stars", "name"]
    ordering = ["price_per_night", "id"]

    def get_queryset(self):
        destinos = Destino.objects.all()
        inactivos = destinos.filter(is_active=False).values("code")
        return (
            Alojamiento.objects.filter(is_active=True, available_rooms__gt=0)
            .exclude(destination_code__in=inactivos)
            .annotate(
                public_city=Coalesce(
                    Subquery(destinos.filter(code=OuterRef("destination_code")).values("city")[:1]), "city"
                )
            )
        )


class VistaAlojamientosAdmin(viewsets.ModelViewSet):
    """Alta, edición, baja lógica y reactivación de alojamientos para Administración General y Catálogo y Precios."""

    queryset = Alojamiento.objects.all().order_by("-is_active", "city", "name", "id")
    serializer_class = SerializadorAlojamientoAdmin
    permission_classes = [EsAdminGeneralOCatalogo]
    filterset_class = FiltroAlojamientosAdmin
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["name", "city", "destination_code", "address"]
    ordering_fields = ["price_per_night", "stars", "name", "is_active", "created_at"]

    def perform_destroy(self, instance: Alojamiento):
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])

    @action(detail=True, methods=["post"])
    def reactivate(self, request, pk=None):
        alojamiento = self.get_object()
        alojamiento.is_active = True
        alojamiento.save(update_fields=["is_active", "updated_at"])
        return Response(self.get_serializer(alojamiento).data)
