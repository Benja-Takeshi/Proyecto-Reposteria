import json
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib.admin.views.decorators import staff_member_required
from django.contrib.auth.models import User
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Producto, Categoria, Pedido

def inicio(request):
    # Buscamos solo los productos que marcamos como destacados para el index
    productos_destacados = Producto.objects.filter(destacado=True, disponible=True)[:4] # El [:4] limita a máximo 4 productos para que no se desarme el diseño
    
    contexto = {
        'productos_destacados': productos_destacados
    }
    return render(request, 'Reposteria_app/index.html', contexto)

def productos(request):
    # 1. Buscamos solo los productos marcados como disponibles en el admin
    lista_productos = Producto.objects.filter(disponible=True)
    # 2. Traemos todas las categorías creadas en el admin
    lista_categorias = Categoria.objects.all()
    
    # 3. Se los pasamos al HTML
    contexto = {
        'productos': lista_productos,
        'categorias': lista_categorias,
    }
    return render(request, 'Reposteria_app/productos.html', contexto)

@login_required
def procesar_compra(request):
    if request.method == 'POST':
        # Tu código actual que guarda el pedido en la base de datos...
        return JsonResponse({'status': 'ok', 'message': 'Pedido guardado'})

@csrf_exempt
def guardar_pedido(request):
    if request.method == 'POST':
        try:
            datos = json.loads(request.body)

            if not isinstance(datos, dict):
                return JsonResponse({'ok': False, 'error': 'Formato de datos inválido.'})

            if not datos.get('productos'):
                return JsonResponse({'ok': False, 'error': 'El carrito está vacío.'})

            detalle_productos = ""

            for item in datos['productos']:
                detalle_productos += f"- {item['nombre']} x{item['cantidad']} \n"

                try:
                    producto_db = Producto.objects.get(nombre=item['nombre'])
                    producto_db.stock = max(0, producto_db.stock - int(item['cantidad']))

                    if producto_db.stock == 0:
                        producto_db.disponible = False

                    producto_db.save()
                except Producto.DoesNotExist:
                    pass

            pedido = Pedido.objects.create(
                nombre=datos['nombre'],
                telefono=datos['telefono'],
                direccion=datos['direccion'],
                notas=datos.get('notas', ''),
                productos=detalle_productos,
                total=int(datos['total']),
                pago=datos['pago'],
                estado='pendiente'
            )

            return JsonResponse({'ok': True, 'pedido_id': pedido.id})

        except Exception as e:
            return JsonResponse({'ok': False, 'error': str(e)})

    return JsonResponse({'ok': False, 'error': 'Método no permitido'})

# VISTA DE REGISTRO
def registro_usuario(request):
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user) # Inicia sesión automáticamente al registrarse
            messages.success(request, f"¡Bienvenido/a, {user.username}! Cuenta creada con éxito.")
            return redirect('inicio')
        else:
            messages.error(request, "Hubo un error en el registro. Por favor, verifica los datos.")
    else:
        form = UserCreationForm()
    return render(request, 'Reposteria_app/registro.html', {'form': form})

# VISTA DE LOGIN
def login_usuario(request):
    if request.method == 'POST':
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            username = form.cleaned_data.get('username')
            password = form.cleaned_data.get('password')
            user = authenticate(request, username=username, password=password)
            if user is not None:
                login(request, user)
                return redirect('inicio')

        messages.error(request, 'Usuario o contraseña incorrectos.')
    else:
        form = AuthenticationForm()

    return render(request, 'Reposteria_app/login.html', {'form': form})

# VISTA DE LOGOUT (CERRAR SESIÓN)
def logout_usuario(request):
    logout(request)
    return redirect('inicio')

def carrito(request):
    return render(request, 'Reposteria_app/carrito.html')

@staff_member_required
def panel_empleados(request):
    if request.method == 'POST':
        accion = request.POST.get('accion')
        
        # 1. GESTIÓN DE PRODUCTOS
        if accion == 'actualizar_producto':
            prod_id = request.POST.get('producto_id')
            producto = Producto.objects.get(id=prod_id)
            producto.precio = request.POST.get('precio')
            producto.stock = request.POST.get('stock')
            producto.descuento = request.POST.get('descuento')
            producto.destacado = request.POST.get('destacado') == 'on'  # Corregido: 'destacaged' -> 'destacado'
            # Guardamos la categoría editada
            cat_id = request.POST.get('categoria_id')
            producto.categoria = Categoria.objects.get(id=cat_id)
            producto.save()
            
        elif accion == 'eliminar_producto':
            Producto.objects.get(id=request.POST.get('producto_id')).delete()

        # 2. GESTIÓN DE PEDIDOS (Con ciclo logístico de 3 estados)
        elif accion == 'cambiar_estado_pedido':
            pedido_id = request.POST.get('pedido_id')
            pedido = Pedido.objects.get(id=pedido_id)
            
            # Control secuencial del estado del despacho
            if pedido.estado == 'pendiente' or pedido.estado == 'en proceso':
                pedido.estado = 'en envio'
            elif pedido.estado == 'en envio':
                pedido.estado = 'entregado'
            else:
                pedido.estado = 'en proceso' # Reinicia el ciclo en caso de error
                
            pedido.save()

        # 3. CRUD DE USUARIOS CLIENTES
        elif accion == 'crear_usuario':
            User.objects.create_user(
                username=request.POST.get('username'),
                email=request.POST.get('email'),
                password=request.POST.get('password')
            )
        elif accion == 'editar_usuario':
            user_id = request.POST.get('usuario_id')
            u = User.objects.get(id=user_id)
            u.username = request.POST.get('nuevo_username')
            u.email = request.POST.get('nuevo_email')
            u.save()
        elif accion == 'eliminar_usuario':
            User.objects.get(id=request.POST.get('usuario_id')).delete()

        return redirect('panel_empleados')

    # Datos finales para inyectar en las tablas
    return render(request, 'Reposteria_app/panel_empleados.html', {
        'productos': Producto.objects.all(),
        'categorias': Categoria.objects.all(),
        'pedidos': Pedido.objects.all().order_by('-id'),
        'clientes': User.objects.filter(is_staff=False, is_superuser=False)
    })

@staff_member_required
def crear_producto_empleado(request):
    if request.method == 'POST':
        nombre = request.POST.get('nombre')
        precio = request.POST.get('precio')
        descripcion = request.POST.get('descripcion')
        imagen = request.FILES.get('imagen') # Ojo: FILES para las fotos
        
        Producto.objects.create(
            nombre=nombre,
            precio=precio,
            descripcion=descripcion,
            imagen=imagen
        )
        return redirect('panel_empleados')
        
    return render(request, 'Reposteria_app/crear_producto.html')