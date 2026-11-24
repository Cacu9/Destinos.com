from rest_framework.permissions import BasePermission

from .models import AreaAdmin


class PermisoAreaAdmin(BasePermission):
    """Da acceso solo a los administradores activos asignados a `area`."""

    area: AreaAdmin

    def has_permission(self, request, view):
        usuario = request.user
        return usuario.is_authenticated and usuario.es_admin and usuario.admin_area == self.area


class EsAdminGeneral(PermisoAreaAdmin):
    area = AreaAdmin.GENERAL


class EsAdminCatalogo(PermisoAreaAdmin):
    area = AreaAdmin.CATALOGO
