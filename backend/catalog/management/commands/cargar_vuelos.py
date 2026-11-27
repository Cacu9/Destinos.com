from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from catalog.aeropuertos import AEROPUERTOS
from catalog.models import ClaseCabina, Destino, TarifaVuelo, TipoViaje, TramoPolitica, TramoVuelo, Vuelo

E, P, B, F = ClaseCabina.ECONOMY, ClaseCabina.PREMIUM_ECONOMY, ClaseCabina.BUSINESS, ClaseCabina.FIRST
SOLO_IDA, IDA_VUELTA, MULTI = TipoViaje.ONE_WAY, TipoViaje.ROUND_TRIP, TipoViaje.MULTI_CITY

# Políticas por tramos (horas antes de la salida, % de penalización). None = no reembolsable.
POLITICAS = {
    "flexible": [(48, 0), (0, 25)],
    "estandar": [(168, 10), (72, 30), (24, 60)],
    "promo": None,
}

# (tipo, aerolínea, política, tramos, tarifas)
# tramo: (número, origen, destino, días desde hoy, "HH:MM", duración en minutos, escalas)
# tarifa: (clase, precio, divisa, asientos, equipaje, reembolsable)
VUELOS_DEMO = [
    # Solo ida, nacionales
    (SOLO_IDA, "Aerolíneas Argentinas", "flexible",
     [("AR1680", "AEP", "BRC", 3, "07:10", 145, 0)],
     [(E, "185000", "ARS", 42, "Equipaje de mano 8 kg", False), (P, "265000", "ARS", 12, "Carry-on + valija 23 kg", True)]),
    (SOLO_IDA, "Flybondi", "promo",
     [("FO5210", "EZE", "MDZ", 4, "13:20", 110, 0)],
     [(E, "98000", "ARS", 60, "Mochila bajo el asiento", False)]),
    (SOLO_IDA, "JetSMART", "promo",
     [("JA3402", "COR", "SLA", 5, "10:10", 95, 0)],
     [(E, "62300", "ARS", 45, "Mochila bajo el asiento", False)]),
    (SOLO_IDA, "Aerolíneas Argentinas", "estandar",
     [("AR1880", "AEP", "USH", 6, "05:45", 215, 0)],
     [(E, "189500", "ARS", 26, "Equipaje de mano 8 kg", False), (P, "268000", "ARS", 3, "Carry-on + valija 23 kg", True)]),
    (SOLO_IDA, "Aerolíneas Argentinas", "flexible",
     [("AR1730", "AEP", "IGR", 4, "08:00", 110, 0)],
     [(E, "119800", "ARS", 32, "Equipaje de mano 8 kg", True)]),
    (SOLO_IDA, "Aerolíneas Argentinas", "estandar",
     [("AR1890", "AEP", "FTE", 7, "09:35", 200, 0)],
     [(E, "210000", "ARS", 30, "Equipaje de mano 8 kg", False)]),
    # Solo ida, internacionales
    (SOLO_IDA, "LATAM Airlines", "estandar",
     [("LA4120", "EZE", "SCL", 5, "07:55", 135, 0)],
     [(E, "295", "USD", 35, "Equipaje de mano 10 kg", False), (B, "690", "USD", 8, "2 valijas 23 kg + salón VIP", True)]),
    (SOLO_IDA, "GOL", "promo",
     [("G37461", "EZE", "GRU", 6, "09:30", 175, 0)],
     [(E, "340", "USD", 20, "Equipaje de mano 10 kg", False)]),
    (SOLO_IDA, "American Airlines", "flexible",
     [("AA900", "EZE", "MIA", 8, "22:15", 540, 0)],
     [(E, "1150", "USD", 28, "Carry-on + valija 23 kg", False), (B, "3900", "USD", 6, "2 valijas 32 kg + salón VIP", True),
      (F, "6200", "USD", 2, "3 valijas 32 kg + suite", True)]),
    (SOLO_IDA, "British Airways", "estandar",
     [("BA244", "EZE", "LHR", 9, "14:40", 820, 0)],
     [(E, "1290", "USD", 24, "Carry-on + valija 23 kg", False), (B, "4100", "USD", 4, "2 valijas 32 kg + salón VIP", True)]),
    (SOLO_IDA, "Iberia", "estandar",
     [("IB6856", "EZE", "MAD", 10, "13:05", 760, 0)],
     [(E, "1180", "USD", 30, "Carry-on + valija 23 kg", False), (P, "1950", "USD", 10, "2 valijas 23 kg", True)]),
    (SOLO_IDA, "Air France", "estandar",
     [("AF229", "EZE", "CDG", 11, "16:25", 790, 0)],
     [(E, "1240", "USD", 22, "Carry-on + valija 23 kg", False)]),
    (SOLO_IDA, "Sky Airline", "promo",
     [("H2512", "SCL", "LIM", 7, "06:50", 225, 0)],
     [(E, "210", "USD", 40, "Mochila bajo el asiento", False)]),
    # Ida y vuelta
    (IDA_VUELTA, "Aerolíneas Argentinas", "estandar",
     [("AR1402", "AEP", "MDZ", 3, "07:10", 115, 0), ("AR1405", "MDZ", "AEP", 7, "19:30", 110, 0)],
     [(E, "184500", "ARS", 18, "Equipaje de mano 8 kg", False), (B, "520000", "ARS", 4, "2 valijas 23 kg", True)]),
    (IDA_VUELTA, "Flybondi", "promo",
     [("FO5402", "EZE", "BRC", 5, "11:15", 145, 0), ("FO5403", "BRC", "EZE", 10, "14:40", 140, 0)],
     [(E, "169800", "ARS", 14, "Mochila bajo el asiento", False)]),
    (IDA_VUELTA, "LATAM Airlines", "promo",
     [("LA8200", "EZE", "MIA", 9, "23:40", 760, 1), ("LA8201", "MIA", "EZE", 17, "20:50", 740, 1)],
     [(E, "980", "USD", 8, "Carry-on + valija 23 kg", False)]),
    (IDA_VUELTA, "Iberia", "flexible",
     [("IB6858", "EZE", "MAD", 12, "21:10", 750, 0), ("IB6859", "MAD", "EZE", 24, "12:20", 775, 0)],
     [(E, "1850", "USD", 16, "Carry-on + valija 23 kg", False), (B, "3620", "USD", 2, "2 valijas 32 kg + salón VIP", True)]),
    (IDA_VUELTA, "Copa Airlines", "estandar",
     [("CM418", "AEP", "PUJ", 14, "08:25", 610, 1), ("CM419", "PUJ", "AEP", 21, "15:10", 620, 1)],
     [(E, "1090", "USD", 12, "Carry-on + valija 23 kg", False)]),
    # Multidestino
    (MULTI, "Aerolíneas Argentinas", "estandar",
     [("AR1520", "AEP", "COR", 3, "08:15", 80, 0), ("AR2410", "COR", "MDZ", 6, "12:40", 75, 0)],
     [(E, "238400", "ARS", 15, "Equipaje de mano 8 kg", False)]),
    (MULTI, "Aerolíneas Argentinas", "flexible",
     [("AR1732", "AEP", "IGR", 4, "08:00", 110, 0), ("AR2742", "IGR", "SLA", 7, "16:10", 130, 0),
      ("AR1455", "SLA", "AEP", 10, "19:45", 125, 0)],
     [(E, "318000", "ARS", 9, "Equipaje de mano 8 kg", True)]),
    (MULTI, "LATAM Airlines", "estandar",
     [("LA8023", "EZE", "GRU", 6, "14:10", 175, 0), ("LA8190", "GRU", "MIA", 9, "22:30", 515, 0)],
     [(E, "1190", "USD", 11, "Carry-on + valija 23 kg", False)]),
    (MULTI, "Iberia", "flexible",
     [("IB6860", "EZE", "MAD", 13, "13:05", 760, 0), ("IB1024", "MAD", "BCN", 17, "10:00", 75, 0)],
     [(E, "1590", "USD", 10, "Carry-on + valija 23 kg", False), (B, "4180", "USD", 2, "2 valijas 32 kg + salón VIP", True)]),
    (MULTI, "ITA Airways", "estandar",
     [("AZ681", "EZE", "FCO", 15, "15:30", 800, 0), ("AF1205", "FCO", "CDG", 19, "09:40", 130, 0),
      ("BA305", "CDG", "LHR", 23, "18:15", 75, 0)],
     [(E, "1980", "USD", 7, "Carry-on + valija 23 kg", False)]),
]


class Command(BaseCommand):
    help = "Crea destinos y unos 20 vuelos de demostración (solo ida, ida y vuelta y multidestino) con políticas."

    def add_arguments(self, parser):
        parser.add_argument("--reiniciar", action="store_true", help="Borra los vuelos de demostración y los vuelve a crear.")

    @transaction.atomic
    def handle(self, *args, **options):
        self._asegurar_destinos()
        numeros = [tramos[0][0] for _, _, _, tramos, _ in VUELOS_DEMO]
        if options["reiniciar"]:
            Vuelo.objects.filter(flight_number__in=numeros).delete()

        hoy = timezone.localtime().replace(hour=0, minute=0, second=0, microsecond=0)
        creados = 0
        for tipo, aerolinea, politica, tramos, tarifas in VUELOS_DEMO:
            numero = tramos[0][0]
            if Vuelo.objects.filter(flight_number=numero, departure_at__gte=timezone.now()).exists():
                continue
            fechas = [self._horario(hoy, dias, hora, duracion) for _, _, _, dias, hora, duracion, _ in tramos]
            (_, origen, destino, _, _, _, escalas), (salida, llegada) = tramos[0], fechas[0]
            precio_base = min(Decimal(precio) for _, precio, *_ in tarifas)
            vuelo = Vuelo.objects.create(
                flight_number=numero,
                airline=aerolinea,
                trip_type=tipo,
                origin_code=origen,
                origin_city=AEROPUERTOS[origen][0],
                destination_code=destino,
                destination_city=AEROPUERTOS[destino][0],
                departure_at=salida,
                arrival_at=llegada,
                stops=escalas,
                base_price_ars=precio_base,
                currency=tarifas[0][2],
                is_non_refundable=POLITICAS[politica] is None,
                policy_updated_at=timezone.now(),
            )
            for posicion, ((num, ori, des, _, _, _, esc), (sal, lle)) in enumerate(zip(tramos[1:], fechas[1:]), start=2):
                TramoVuelo.objects.create(
                    flight=vuelo, position=posicion, flight_number=num,
                    origin_code=ori, origin_city=AEROPUERTOS[ori][0],
                    destination_code=des, destination_city=AEROPUERTOS[des][0],
                    departure_at=sal, arrival_at=lle, stops=esc,
                )
            TarifaVuelo.objects.bulk_create([
                TarifaVuelo(flight=vuelo, cabin_class=clase, price_ars=Decimal(precio), currency=divisa,
                            available_seats=asientos, baggage_included=equipaje, is_refundable=reembolsable)
                for clase, precio, divisa, asientos, equipaje, reembolsable in tarifas
            ])
            TramoPolitica.objects.bulk_create([
                TramoPolitica(flight=vuelo, hours_before=horas, penalty_percent=penalizacion)
                for horas, penalizacion in POLITICAS[politica] or []
            ])
            creados += 1

        self.stdout.write(self.style.SUCCESS(f"Vuelos de demostración listos ({creados} nuevos)."))

    @staticmethod
    def _horario(hoy, dias, hora, duracion):
        horas, minutos = map(int, hora.split(":"))
        salida = hoy + timedelta(days=dias, hours=horas, minutes=minutos)
        return salida, salida + timedelta(minutes=duracion)

    @staticmethod
    def _asegurar_destinos():
        from decimal import Decimal as D

        for codigo, (ciudad, region, pais, nombre, latitud, longitud) in AEROPUERTOS.items():
            destino, creado = Destino.objects.get_or_create(
                code=codigo,
                defaults=dict(city=ciudad, region=region, country=pais, name=nombre,
                              latitude=D(str(latitud)), longitude=D(str(longitud))),
            )
            if not creado and destino.latitude is None:
                destino.latitude, destino.longitude = D(str(latitud)), D(str(longitud))
                destino.save(update_fields=["latitude", "longitude"])
