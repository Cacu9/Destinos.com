"""UC3 · Cerrar sesión."""

from rest_framework import permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken


class SerializadorCierreSesion(serializers.Serializer):
    refresh = serializers.CharField()


class VistaCierreSesion(APIView):
    """Invalida el refresh token de la sesión para que no pueda abrir una sesión nueva."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializador = SerializadorCierreSesion(data=request.data)
        serializador.is_valid(raise_exception=True)
        try:
            RefreshToken(serializador.validated_data["refresh"]).blacklist()
        except TokenError:
            pass  # Si el token ya no era válido, la sesión queda cerrada igual.
        return Response(status=status.HTTP_204_NO_CONTENT)
