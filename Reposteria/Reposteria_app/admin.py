from django.contrib import admin
from .models import Pedido, Producto, Categoria

@admin.register(Pedido)
class PedidoAdmin(admin.ModelAdmin):
    list_display  = ('id', 'nombre', 'telefono', 'total_formateado', 'pago', 'estado', 'fecha')
    list_filter   = ('estado', 'pago')
    search_fields = ('nombre', 'telefono', 'direccion')
    list_editable = ('estado',)
    readonly_fields = ('fecha', 'productos', 'total', 'nombre', 'telefono', 'direccion', 'notas', 'pago')

    def total_formateado(self, obj):
        return f"${obj.total:,}".replace(',', '.')
    total_formateado.short_description = 'Total'

@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'categoria', 'precio', 'stock', 'destacado', 'disponible')
    list_filter = ('categoria', 'disponible', 'destacado')
    search_fields = ('nombre', 'descripcion')
    list_editable = ('stock', 'destacado', 'disponible')


admin.site.register(Categoria)