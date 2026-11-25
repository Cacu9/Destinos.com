from django.contrib import admin

from .models import TarifaVuelo, Vuelo


class TarifaVueloInline(admin.TabularInline):
    model = TarifaVuelo
    extra = 1
    fields = ["cabin_class", "price_ars", "available_seats", "baggage_included", "is_refundable", "is_active"]


@admin.register(Vuelo)
class AdminVuelo(admin.ModelAdmin):
    list_display = [
        "flight_number",
        "airline",
        "origin_code",
        "destination_code",
        "departure_at",
        "base_price_ars",
        "stops",
        "is_active",
    ]
    list_filter = ["airline", "origin_code", "destination_code", "is_active", "stops"]
    search_fields = ["flight_number", "airline", "origin_city", "origin_code", "destination_city", "destination_code"]
    ordering = ["departure_at"]
    inlines = [TarifaVueloInline]


@admin.register(TarifaVuelo)
class AdminTarifaVuelo(admin.ModelAdmin):
    list_display = ["flight", "cabin_class", "price_ars", "available_seats", "is_refundable", "is_active"]
    list_filter = ["cabin_class", "is_refundable", "is_active"]
    search_fields = ["flight__flight_number", "flight__origin_code", "flight__destination_code"]
