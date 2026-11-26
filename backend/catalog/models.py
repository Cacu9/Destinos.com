from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import F, Min, Prefetch, Q
from django.db.models.functions import Coalesce


class ClaseCabina(models.TextChoices):
    ECONOMY = "economy", "Económica"
    PREMIUM_ECONOMY = "premium_economy", "Económica Premium"
    BUSINESS = "business", "Ejecutiva"
    FIRST = "first", "Primera Clase"


class Divisa(models.TextChoices):
    ARS = "ARS", "Pesos argentinos (ARS)"
    USD = "USD", "Dólares estadounidenses (USD)"


class VueloQuerySet(models.QuerySet):
    def con_catalogo(self, solo_activos: bool = True):
        tarifas = TarifaVuelo.objects.order_by("price_ars", "id")
        qs = self
        if solo_activos:
            tarifas = tarifas.filter(is_active=True)
            qs = qs.filter(is_active=True)
        return qs.prefetch_related(Prefetch("fares", queryset=tarifas)).annotate(
            min_price_ars=Coalesce(Min("fares__price_ars", filter=Q(fares__is_active=True)), F("base_price_ars"))
        )


class Vuelo(models.Model):
    """Vuelo publicado en el catálogo con su precio base y divisa (ARS o USD)."""

    flight_number = models.CharField("número de vuelo", max_length=20)
    airline = models.CharField("aerolínea", max_length=100)
    origin_city = models.CharField("ciudad de origen", max_length=100)
    origin_code = models.CharField("código de origen", max_length=10)
    destination_city = models.CharField("ciudad de destino", max_length=100)
    destination_code = models.CharField("código de destino", max_length=10)
    departure_at = models.DateTimeField("fecha y hora de salida")
    arrival_at = models.DateTimeField("fecha y hora de llegada")
    stops = models.PositiveSmallIntegerField("escalas", default=0)
    base_price_ars = models.DecimalField(
        "precio base",
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    currency = models.CharField("divisa", max_length=3, choices=Divisa.choices, default=Divisa.ARS)
    cancellation_policy = models.TextField("política de cancelación", blank=True)
    notes = models.TextField("observaciones", blank=True)
    is_active = models.BooleanField("activo", default=True)
    created_at = models.DateTimeField("creado el", auto_now_add=True)
    updated_at = models.DateTimeField("actualizado el", auto_now=True)

    objects = VueloQuerySet.as_manager()

    class Meta:
        ordering = ["departure_at", "id"]
        verbose_name = "vuelo"
        verbose_name_plural = "vuelos"
        constraints = [
            models.UniqueConstraint(
                fields=["flight_number", "departure_at"],
                name="vuelo_numero_y_salida_unicos",
            ),
            models.CheckConstraint(
                condition=models.Q(arrival_at__gt=models.F("departure_at")),
                name="vuelo_llegada_posterior_a_salida",
            ),
            models.CheckConstraint(
                condition=models.Q(base_price_ars__gt=0),
                name="vuelo_precio_base_positivo",
            ),
        ]

    def save(self, *args, **kwargs):
        self.flight_number = self.flight_number.strip().upper()
        self.origin_code = self.origin_code.strip().upper()
        self.destination_code = self.destination_code.strip().upper()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.flight_number} ({self.origin_code} → {self.destination_code})"

    @property
    def duration_minutes(self) -> int:
        return max(0, int((self.arrival_at - self.departure_at).total_seconds() // 60))


class TarifaVuelo(models.Model):
    """Tarifa por clase de cabina en ARS o USD para un vuelo."""

    flight = models.ForeignKey(Vuelo, on_delete=models.CASCADE, related_name="fares", verbose_name="vuelo")
    cabin_class = models.CharField("clase", max_length=20, choices=ClaseCabina.choices)
    price_ars = models.DecimalField(
        "precio",
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    currency = models.CharField("divisa", max_length=3, choices=Divisa.choices, default=Divisa.ARS)
    available_seats = models.PositiveIntegerField("asientos disponibles")
    baggage_included = models.CharField("equipaje incluido", max_length=120, blank=True, default="Equipaje de mano")
    is_refundable = models.BooleanField("reembolsable", default=False)
    is_active = models.BooleanField("activa", default=True)
    created_at = models.DateTimeField("creado el", auto_now_add=True)
    updated_at = models.DateTimeField("actualizado el", auto_now=True)

    objects = VueloQuerySet.as_manager()

    class Meta:
        ordering = ["price_ars", "id"]
        verbose_name = "tarifa de vuelo"
        verbose_name_plural = "tarifas de vuelo"
        constraints = [
            models.UniqueConstraint(
                fields=["flight", "cabin_class"],
                name="tarifa_unica_por_vuelo_y_clase",
            ),
            models.CheckConstraint(
                condition=models.Q(price_ars__gt=0),
                name="tarifa_precio_positivo",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.flight.flight_number} · {self.get_cabin_class_display()} (${self.price_ars} {self.currency})"
