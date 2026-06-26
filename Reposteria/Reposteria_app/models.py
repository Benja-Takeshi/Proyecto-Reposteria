from django.db import models

class Pedido(models.Model):
    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('confirmado', 'Confirmado'),
        ('en_preparacion', 'En preparación'),
        ('entregado', 'Entregado'),
        ('cancelado', 'Cancelado'),
    ]

    PAGO_CHOICES = [
        ('transferencia', 'Transferencia'),
        ('efectivo', 'Efectivo'),
    ]

    nombre      = models.CharField(max_length=100)
    telefono    = models.CharField(max_length=20)
    direccion   = models.CharField(max_length=200)
    notas       = models.TextField(blank=True)
    productos   = models.TextField()  # se guarda como texto JSON
    total       = models.IntegerField()
    pago        = models.CharField(max_length=20, choices=PAGO_CHOICES)
    estado      = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='pendiente')
    fecha       = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Pedido #{self.id} — {self.nombre} ({self.estado})"

    class Meta:
        ordering = ['-fecha']
        verbose_name = 'Pedido'
        verbose_name_plural = 'Pedidos'

class Categoria(models.Model):
    nombre = models.CharField(max_length=100, unique=True, verbose_name="Nombre de la Categoría")

    class Meta:
        verbose_name = "Categoría"
        verbose_name_plural = "Categorías"

    def __str__(self):
        return self.nombre

class Producto(models.Model):
    nombre = models.CharField(max_length=150, verbose_name="Nombre del Producto")
    descripcion = models.TextField(verbose_name="Descripción")
    precio = models.IntegerField(verbose_name="Precio")
    imagen = models.ImageField(upload_to='productos/', blank=True, null=True, verbose_name="Imagen del Producto")
    categoria = models.ForeignKey(Categoria, on_delete=models.CASCADE, related_name="productos", verbose_name="Categoría")
    disponible = models.BooleanField(default=True, verbose_name="Disponible")
    stock = models.IntegerField(default=0, verbose_name="Stock Disponible")
    destacado = models.BooleanField(default=False, verbose_name="Destacado en Inicio")
    descuento = models.IntegerField(default=0, verbose_name="Descuento (%)")

    class Meta:
        verbose_name = "Producto"
        verbose_name_plural = "Productos"

    def __str__(self):
        return self.nombre