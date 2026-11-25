from rest_framework.permissions import BasePermission

from .models import AreaAdmin


class PermisoAreaAdmin(BasePermission):
    """Da acceso solo a los administradores activos asignados a alguna de las áreas permitidas."""

    area: AreaAdmin | None = None
    areas: tuple[AreaAdmin, ...] = ()

    def has_permission(self, request, view):
        usuario = request.user
        areas_permitidas = self.areas or ((self.area,) if self.area is not None else ())
        return (
            usuario.is_authenticated
            and usuario.is_active
            and usuario.es_admin
            and usuario.admin_area in areas_permitidas
        )


class EsAdminGeneral(PermisoAreaAdmin):
    area = AreaAdmin.GENERAL


class EsAdminCatalogo(PermisoAreaAdmin):
    area = AreaAdmin.CATALOGO


class EsAdminGeneralOCatalogo(PermisoAreaAdmin):
    areas = (AreaAdmin.GENERAL, AreaAdmin.CATALOGO)
