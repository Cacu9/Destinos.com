from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractUser
from django.db import models


class Rol(models.TextChoices):
    CLIENTE = "client", "Cliente"
    ADMINISTRADOR = "admin", "Administrador"


class AreaAdmin(models.TextChoices):
    GENERAL = "general", "Administración General"
    CATALOGO = "catalog", "Catálogo y Precios"
    RESERVAS = "reservations", "Operador de Reservas"


class GestorUsuarios(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password=None, **campos_extra):
        if not email:
            raise ValueError("El correo es obligatorio.")
        usuario = self.model(email=self.normalize_email(email), **campos_extra)
        usuario.set_password(password)
        usuario.save(using=self._db)
        return usuario

    def create_superuser(self, email, password=None, **campos_extra):
        campos_extra.update(
            is_staff=True,
            is_superuser=True,
            role=Rol.ADMINISTRADOR,
            admin_area=AreaAdmin.GENERAL,
        )
        return self.create_user(email, password, **campos_extra)


class User(AbstractUser):
    username = None
    email = models.EmailField("correo", unique=True)
    first_name = models.CharField("nombre", max_length=150)
    last_name = models.CharField("apellido", max_length=150)
    role = models.CharField(max_length=10, choices=Rol.choices, default=Rol.CLIENTE)
    admin_area = models.CharField("área", max_length=20, choices=AreaAdmin.choices, blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    objects = GestorUsuarios()

    class Meta:
        constraints = [
            models.CheckConstraint(
                name="admin_area_matches_role",
                condition=(
                    models.Q(role=Rol.ADMINISTRADOR, admin_area__in=AreaAdmin.values)
                    | models.Q(role=Rol.CLIENTE, admin_area="")
                ),
            ),
        ]

    def __str__(self):
        return self.email

    @property
    def es_admin(self) -> bool:
        return self.role == Rol.ADMINISTRADOR
