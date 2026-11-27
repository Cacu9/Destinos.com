"""Políticas de cancelación por tramos (UC30): no reembolsable o una escala de penalizaciones según la anticipación."""

from rest_framework import serializers

PLAZO_MAXIMO_HORAS = 24 * 365


def _plazo(horas: int) -> str:
    if horas == 0:
        return "hasta la salida"
    if horas % 24 == 0 and horas >= 48:
        return f"hasta {horas // 24} días antes"
    return f"hasta {horas} h antes"


def resumen_politica(no_reembolsable: bool, tramos: list[tuple[int, int]]) -> str:
    """Texto corto de la política, p. ej. "Sin cargo hasta 3 días antes · 30 % hasta 24 h antes · después sin reintegro"."""
    if no_reembolsable:
        return "No reembolsable."
    if not tramos:
        return ""
    partes = []
    for horas, penalizacion in sorted(tramos, key=lambda tramo: -tramo[0]):
        if penalizacion == 0:
            partes.append(f"Sin cargo {_plazo(horas)}")
        elif penalizacion == 100:
            partes.append(f"Sin reintegro {_plazo(horas)}")
        else:
            partes.append(f"{penalizacion} % de cargo {_plazo(horas)}")
    if min(horas for horas, _ in tramos) > 0:
        partes.append("después, sin reintegro")
    texto = " · ".join(partes)
    return texto[0].upper() + texto[1:] + "."


class SerializadorTramoPolitica(serializers.Serializer):
    hours_before = serializers.IntegerField(min_value=0, max_value=PLAZO_MAXIMO_HORAS)
    penalty_percent = serializers.IntegerField(
        min_value=0,
        max_value=100,
        error_messages={
            "min_value": "La penalización debe estar entre 0 y 100 %%.",
            "max_value": "La penalización debe estar entre 0 y 100 %%.",
        },
    )


class SerializadorPolitica(serializers.Serializer):
    """Valida que la política sea no reembolsable o tenga tramos con plazos distintos y penalizaciones coherentes."""

    is_non_refundable = serializers.BooleanField()
    cancellation_rules = SerializadorTramoPolitica(many=True, required=False, default=list)

    def validate(self, attrs):
        tramos = attrs.get("cancellation_rules") or []
        if attrs["is_non_refundable"]:
            if tramos:
                raise serializers.ValidationError(
                    {"cancellation_rules": "Una política no reembolsable no lleva tramos de penalización."}
                )
            return attrs

        if not tramos:
            raise serializers.ValidationError(
                {"cancellation_rules": "Agregá al menos un tramo o marcá la política como no reembolsable."}
            )

        plazos = [tramo["hours_before"] for tramo in tramos]
        if len(plazos) != len(set(plazos)):
            raise serializers.ValidationError({"cancellation_rules": "Hay dos tramos con el mismo plazo."})

        ordenados = sorted(tramos, key=lambda tramo: -tramo["hours_before"])
        for anterior, siguiente in zip(ordenados, ordenados[1:]):
            if siguiente["penalty_percent"] < anterior["penalty_percent"]:
                raise serializers.ValidationError(
                    {
                        "cancellation_rules": (
                            f"Los plazos no son coherentes: cancelar {_plazo(siguiente['hours_before'])} "
                            f"no puede costar menos ({siguiente['penalty_percent']} %) que cancelar "
                            f"{_plazo(anterior['hours_before'])} ({anterior['penalty_percent']} %)."
                        )
                    }
                )
        attrs["cancellation_rules"] = ordenados
        return attrs
