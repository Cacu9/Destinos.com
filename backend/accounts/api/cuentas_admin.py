"""UC24 · Gestionar cuentas de administrador."""

from rest_framework import mixins, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.campos import campo_correo_unico, validar_contrasena
from accounts.models import AreaAdmin, Rol, User
from accounts.permisos import EsAdminGeneral


class SerializadorCuentaAdmin(serializers.ModelSerializer):
    email = campo_correo_unico()
    admin_area = serializers.ChoiceField(choices=AreaAdmin.choices)
    password = serializers.CharField(write_only=True, required=False, style={"input_type": "password"})

    class Meta:
        model = User
        fields = ["id", "first_name", "last_name", "email", "admin_area", "is_active", "date_joined", "password"]
        read_only_fields = ["is_active", "date_joined"]
        extra_kwargs = {"first_name": {"required": True}, "last_name": {"required": True}}

    def validate(self, attrs):
        contrasena = attrs.get("password")
        if self.instance is None and not contrasena:
            raise serializers.ValidationError({"password": "La contraseña inicial es obligatoria."})
        if contrasena:
            validar_contrasena(contrasena)
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(role=Rol.ADMINISTRADOR, **validated_data)

    def update(self, instance, validated_data):
        contrasena = validated_data.pop("password", None)
        if contrasena:
            instance.set_password(contrasena)
        return super().update(instance, validated_data)


class VistaCuentasAdmin(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """Eliminar una cuenta la da de baja en lugar de borrarla, así se puede reactivar."""

    serializer_class = SerializadorCuentaAdmin
    permission_classes = [EsAdminGeneral]

    def get_queryset(self):
        return User.objects.filter(role=Rol.ADMINISTRADOR).order_by("-is_active", "last_name", "first_name")

    def perform_destroy(self, instance):
        if instance == self.request.user:
            raise serializers.ValidationError({"detail": "No podés dar de baja tu propia cuenta."})
        instance.is_active = False
        instance.save(update_fields=["is_active"])

    # El nombre del método define la ruta de la API (/reactivate/), por eso queda en inglés.
    @action(detail=True, methods=["post"])
    def reactivate(self, request, pk=None):
        cuenta = self.get_object()
        cuenta.is_active = True
        cuenta.save(update_fields=["is_active"])
        return Response(self.get_serializer(cuenta).data)
