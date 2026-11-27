from decimal import Decimal

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import F, Min, Prefetch, Q
from django.db.models.functions import Coalesce


class ClaseCabina(models.TextChoices):
    ECONOMY = "economy", "Económica"
    PREMIUM_ECONOMY = "premium_economy", "Económica Premium"
    BUSINESS = "business", "Ejecutiva"
    FIRST = "first", "Primera Clase"


class TipoViaje(models.TextChoices):
    ONE_WAY = "one_way", "Solo ida"
    ROUND_TRIP = "round_trip", "Ida y vuelta"
    MULTI_CITY = "multi_city", "Multidestino"


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
        return qs.prefetch_related(
            Prefetch("fares", queryset=tarifas), "legs", "cancellation_rules"
        ).annotate(
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
    trip_type = models.CharField("tipo de viaje", max_length=12, choices=TipoViaje.choices, default=TipoViaje.ONE_WAY)
    base_price_ars = models.DecimalField(
        "precio base",
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    currency = models.CharField("divisa", max_length=3, choices=Divisa.choices, default=Divisa.ARS)
    cancellation_policy = models.TextField("política de cancelación", blank=True)
    is_non_refundable = models.BooleanField("no reembolsable", default=False)
    policy_updated_at = models.DateTimeField("política actualizada el", null=True, blank=True)
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
        """Minutos en vuelo del itinerario completo: el primer tramo más los tramos adicionales."""
        primero = max(0, int((self.arrival_at - self.departure_at).total_seconds() // 60))
        return primero + sum(tramo.duration_minutes for tramo in self.legs.all())

    @property
    def total_stops(self) -> int:
        return self.stops + sum(tramo.stops for tramo in self.legs.all())


class TramoVuelo(models.Model):
    """Tramo adicional de un itinerario: la vuelta de un ida y vuelta o cada destino siguiente de un multidestino.

    El primer tramo vive en los campos del propio vuelo (origen, destino, salida y llegada).
    """

    flight = models.ForeignKey(Vuelo, on_delete=models.CASCADE, related_name="legs", verbose_name="vuelo")
    position = models.PositiveSmallIntegerField("orden")
    flight_number = models.CharField("número de vuelo", max_length=20)
    origin_city = models.CharField("ciudad de origen", max_length=100)
    origin_code = models.CharField("código de origen", max_length=10)
    destination_city = models.CharField("ciudad de destino", max_length=100)
    destination_code = models.CharField("código de destino", max_length=10)
    departure_at = models.DateTimeField("fecha y hora de salida")
    arrival_at = models.DateTimeField("fecha y hora de llegada")
    stops = models.PositiveSmallIntegerField("escalas", default=0)

    class Meta:
        ordering = ["position", "id"]
        verbose_name = "tramo de vuelo"
        verbose_name_plural = "tramos de vuelo"
        constraints = [
            models.UniqueConstraint(fields=["flight", "position"], name="tramo_orden_unico"),
            models.CheckConstraint(
                condition=models.Q(arrival_at__gt=models.F("departure_at")), name="tramo_llegada_posterior"
            ),
        ]

    def save(self, *args, **kwargs):
        self.flight_number = self.flight_number.strip().upper()
        self.origin_code = self.origin_code.strip().upper()
        self.destination_code = self.destination_code.strip().upper()
        super().save(*args, **kwargs)

    @property
    def duration_minutes(self) -> int:
        return max(0, int((self.arrival_at - self.departure_at).total_seconds() // 60))


class TramoPolitica(models.Model):
    """Tramo de la política de cancelación (UC30): cancelando con al menos `hours_before` horas, se retiene `penalty_percent`."""

    flight = models.ForeignKey(
        Vuelo, on_delete=models.CASCADE, related_name="cancellation_rules", verbose_name="vuelo"
    )
    hours_before = models.PositiveIntegerField("horas antes de la salida")
    penalty_percent = models.PositiveSmallIntegerField(
        "penalización (%)", validators=[MinValueValidator(0), MaxValueValidator(100)]
    )

    class Meta:
        ordering = ["-hours_before", "id"]
        verbose_name = "tramo de política de cancelación"
        verbose_name_plural = "tramos de política de cancelación"
        constraints = [
            models.UniqueConstraint(fields=["flight", "hours_before"], name="tramo_politica_plazo_unico"),
            models.CheckConstraint(condition=models.Q(penalty_percent__lte=100), name="tramo_politica_maximo_100"),
        ]


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


class Destino(models.Model):
    city = models.CharField("ciudad", max_length=100)
    region = models.CharField("provincia o estado", max_length=100)
    country = models.CharField("país", max_length=100)
    name = models.CharField("aeropuerto", max_length=120)
    code = models.CharField("código IATA", max_length=3, unique=True)
    latitude = models.DecimalField("latitud", max_digits=8, decimal_places=4, null=True, blank=True)
    longitude = models.DecimalField("longitud", max_digits=8, decimal_places=4, null=True, blank=True)
    is_active = models.BooleanField("activo", default=True)

    class Meta:
        ordering = ["city", "code"]

    def __str__(self):
        return f"{self.city} ({self.code})"

class TipoAlojamiento(models.TextChoices):
    HOTEL = "hotel", "Hotel"
    APARTMENT = "apartment", "Departamento"
    CABIN = "cabin", "Cabaña"
    HOSTEL = "hostel", "Hostel"
    RESORT = "resort", "Resort"


class Alojamiento(models.Model):
    """Alojamiento publicado en el catálogo con tarifa por noche en ARS o USD."""

    name = models.CharField("nombre", max_length=120)
    accommodation_type = models.CharField("tipo", max_length=20, choices=TipoAlojamiento.choices, default=TipoAlojamiento.HOTEL)
    destination_code = models.CharField("código IATA", max_length=3)
    city = models.CharField("ciudad", max_length=100)
    address = models.CharField("dirección", max_length=160)
    stars = models.PositiveSmallIntegerField(
        "estrellas", default=3, validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    price_per_night = models.DecimalField(
        "precio por noche",
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    currency = models.CharField("divisa", max_length=3, choices=Divisa.choices, default=Divisa.ARS)
    max_guests = models.PositiveSmallIntegerField("huéspedes máximos", default=2, validators=[MinValueValidator(1)])
    available_rooms = models.PositiveIntegerField("habitaciones disponibles", default=1)
    amenities = models.CharField("servicios incluidos", max_length=240, blank=True)
    cancellation_policy = models.TextField("política de cancelación", blank=True)
    is_refundable = models.BooleanField("reembolsable", default=True)
    is_active = models.BooleanField("activo", default=True)
    created_at = models.DateTimeField("creado el", auto_now_add=True)
    updated_at = models.DateTimeField("actualizado el", auto_now=True)

    class Meta:
        ordering = ["price_per_night", "id"]
        verbose_name = "alojamiento"
        verbose_name_plural = "alojamientos"
        constraints = [
            models.CheckConstraint(condition=models.Q(price_per_night__gt=0), name="alojamiento_precio_positivo"),
            models.CheckConstraint(condition=models.Q(stars__gte=1, stars__lte=5), name="alojamiento_estrellas_validas"),
        ]

    def save(self, *args, **kwargs):
        self.destination_code = self.destination_code.strip().upper()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.name} ({self.destination_code})"
