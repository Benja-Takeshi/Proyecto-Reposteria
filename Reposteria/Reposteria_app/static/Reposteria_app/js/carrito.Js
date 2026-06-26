// ── ESTADO GLOBAL ───────────────────────────────────────────────────────────
const esAutenticado = () => window.usuarioAutenticado === true || window.usuarioAutenticado === 'true';

let carrito = esAutenticado() ? JSON.parse(localStorage.getItem('carrito') || '[]') : [];
let pagoSeleccionado = 'transferencia';

// ── PERSISTENCIA ────────────────────────────────────────────────────────────
function guardarCarrito() {
  if (esAutenticado()) localStorage.setItem('carrito', JSON.stringify(carrito));
  else { localStorage.removeItem('carrito'); carrito = []; }
}

// ── NAVBAR ──────────────────────────────────────────────────────────────────
function actualizarContadorNavbar() {
  const el = document.getElementById('carrito-count-nav');
  if (el) el.textContent = carrito.reduce((s, p) => s + p.cantidad, 0);
}

// ── PANEL FLOTANTE ──────────────────────────────────────────────────────────
function abrirCarrito() {
  document.getElementById('carrito-panel')?.classList.add('abierto');
  document.getElementById('overlay')?.classList.add('visible');
}

function cerrarCarrito() {
  document.getElementById('carrito-panel')?.classList.remove('abierto');
  document.getElementById('overlay')?.classList.remove('visible');
}

function manejarClickCarrito(urlCarrito) {
  // Siempre redirige a la página del carrito
  location.href = urlCarrito;
}

// ── AGREGAR / MODIFICAR ─────────────────────────────────────────────────────
function agregar(nombre, precio, btn, imagen = '') {
  if (!esAutenticado()) {
    if (confirm('Para agregar productos necesitas iniciar sesión. ¿Quieres ir al login?'))
      window.location.href = '/login/';
    return;
  }

  const existe = carrito.find(p => p.nombre === nombre);
  if (existe) existe.cantidad++;
  else carrito.push({ nombre, precio, cantidad: 1, imagen });

  guardarCarrito();
  actualizarCarrito();

  if (btn) {
    btn.textContent = 'Agregado';
    btn.style.background = '#4caf50';
    setTimeout(() => { btn.textContent = 'Agregar'; btn.style.background = ''; }, 1000);
  }
}

function cambiarCantidad(nombre, delta) {
  const item = carrito.find(p => p.nombre === nombre);
  if (!item) return;
  item.cantidad += delta;
  if (item.cantidad <= 0) carrito = carrito.filter(p => p.nombre !== nombre);
  guardarCarrito();
  actualizarCarrito();
}

function eliminarItem(nombre) {
  carrito = carrito.filter(p => p.nombre !== nombre);
  guardarCarrito();
  actualizarCarrito();
  renderizarListaCarrito();
}

// ── ACTUALIZAR UI GENERAL ───────────────────────────────────────────────────
function actualizarCarrito() {
  guardarCarrito();
  actualizarContadorNavbar();

  const count = carrito.reduce((s, p) => s + p.cantidad, 0);
  const total = carrito.reduce((s, p) => s + p.precio * p.cantidad, 0);

  const el = (id) => document.getElementById(id);

  if (el('carrito-count')) el('carrito-count').textContent = count;
  if (el('carrito-total')) el('carrito-total').textContent = '$' + total.toLocaleString('es-CL');

  // Panel flotante (productos.html)
  const container = el('carrito-items');
  if (container) {
    container.innerHTML = carrito.length === 0
      ? '<div class="carrito-vacio">No hay productos todavía.<br>Agrega algo rico!</div>'
      : carrito.map(p => `
          <div class="item-carrito">
            <div class="item-info">
              <strong>${p.nombre}</strong>
              <span>$${(p.precio * p.cantidad).toLocaleString('es-CL')}</span>
            </div>
            <div class="item-controles">
              <button onclick="cambiarCantidad('${p.nombre}', -1)">−</button>
              <span class="item-cantidad">${p.cantidad}</span>
              <button onclick="cambiarCantidad('${p.nombre}', 1)">+</button>
            </div>
          </div>`).join('');
  }

  // Página carrito (carrito.html)
  if (el('carrito-lista-items')) renderizarListaCarrito();
}

// ── FILTROS ─────────────────────────────────────────────────────────────────
function filtrar(cat, btn) {
  document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('activo'));
  if (btn) btn.classList.add('activo');

  let visibles = 0;
  document.querySelectorAll('.product-item').forEach(item => {
    const mostrar = cat === 'todos' || item.dataset.cat === cat;
    item.style.display = mostrar ? '' : 'none';
    if (mostrar) visibles++;
  });

  const sinRes = document.getElementById('sin-resultados');
  if (sinRes) sinRes.style.display = visibles === 0 ? 'block' : 'none';
}

// ── FORMULARIO PANEL (productos.html) ──────────────────────────────────────
function abrirFormulario() {
  if (carrito.length === 0) { alert('Agrega al menos un producto.'); return; }
  cerrarCarrito();
  const total = carrito.reduce((s, p) => s + p.precio * p.cantidad, 0);
  const resumenEl = document.getElementById('resumen-items');
  if (resumenEl) resumenEl.innerHTML = carrito.map(p =>
    `<div class="resumen-item">
      <span>${p.nombre} x${p.cantidad}</span>
      <span>$${(p.precio * p.cantidad).toLocaleString('es-CL')}</span>
    </div>`).join('');
  const totalModal = document.getElementById('resumen-total-modal');
  if (totalModal) totalModal.textContent = '$' + total.toLocaleString('es-CL');
  document.getElementById('modal')?.classList.add('visible');
}

function cerrarFormulario() {
  document.getElementById('modal')?.classList.remove('visible');
}

function seleccionarPago(tipo) {
  pagoSeleccionado = tipo;
  document.getElementById('pago-transferencia')?.classList.toggle('seleccionado', tipo === 'transferencia');
  document.getElementById('pago-efectivo')?.classList.toggle('seleccionado', tipo === 'efectivo');
}

// ── CONFIRMAR PEDIDO ────────────────────────────────────────────────────────
async function confirmarPedido() {
  if (!esAutenticado()) {
    alert('Necesitas iniciar sesión para confirmar tu pedido.');
    window.location.href = '/login/';
    return;
  }

  const val = (id) => document.getElementById(id)?.value.trim() || '';
  const nombre    = val('nombre');
  const telefono  = val('telefono');
  const direccion = val('direccion');
  const notas     = val('notas');

  if (!nombre || !telefono || !direccion) {
    alert('Por favor completa nombre, teléfono y dirección.');
    return;
  }

  const total = carrito.reduce((s, p) => s + p.precio * p.cantidad, 0);
  const btn = document.getElementById('btn-confirmar-pedido') || document.getElementById('btn-confirmar');
  if (btn) { btn.textContent = 'Enviando...'; btn.disabled = true; }

  try {
    const res  = await fetch('/guardar-pedido/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({ nombre, telefono, direccion, notas, productos: carrito, total, pago: pagoSeleccionado })
    });
    const data = await res.json();

    if (data.ok) {
      // Mostrar confirmación según si estamos en modal o página separada
      const contenedor = document.getElementById('modal-contenido') || document.getElementById('confirmacion-box');
      if (contenedor) {
        contenedor.style.display = 'block';
        contenedor.innerHTML = `
          <div class="confirmacion">
            <h2>Pedido confirmado</h2>
            <p>Gracias <strong>${nombre}</strong>, tu pedido fue registrado.</p>
            <div class="detalle-confirmacion">
              <p><strong>Telefono:</strong> ${telefono}</p>
              <p><strong>Direccion:</strong> ${direccion}</p>
              <p><strong>Pago:</strong> ${pagoSeleccionado === 'transferencia' ? 'Transferencia bancaria' : 'Efectivo'}</p>
            </div>
            <p>Te contactaremos pronto para confirmar la entrega.</p>
            <button class="btn-volver" onclick="location.reload()">Volver a la tienda</button>
          </div>`;
      }
      // Ocultar formulario si estamos en la página carrito
      const form = document.getElementById('formulario-pedido');
      if (form) form.style.display = 'none';

      carrito = [];
      localStorage.removeItem('carrito');
      actualizarCarrito();
    } else {
      alert('Hubo un error al enviar el pedido. Intenta de nuevo.');
      if (btn) { btn.textContent = 'Confirmar pedido'; btn.disabled = false; }
    }
  } catch {
    alert('Error de conexión. Intenta de nuevo.');
    if (btn) { btn.textContent = 'Confirmar pedido'; btn.disabled = false; }
  }
}

// ── PÁGINA CARRITO (carrito.html) ───────────────────────────────────────────
function renderizarListaCarrito() {
  const container  = document.getElementById('carrito-lista-items');
  const vacioMsg   = document.getElementById('carrito-vacio-msg');
  const formulario = document.getElementById('formulario-pedido');
  if (!container) return;

  if (carrito.length === 0) {
    if (vacioMsg)   vacioMsg.style.display = 'block';
    container.innerHTML = '';
    if (formulario) formulario.style.display = 'none';
    actualizarResumenPage();
    return;
  }

  if (vacioMsg)   vacioMsg.style.display = 'none';
  if (formulario) formulario.style.display = 'block';

  container.innerHTML = carrito.map(p => `
    <div class="item-carrito-page">
      <div class="item-img-wrap">
        ${p.imagen
          ? `<img src="${p.imagen}" alt="${p.nombre}" class="item-img">`
          : `<div class="item-img-placeholder"></div>`}
      </div>
      <div class="item-detalles">
        <strong>${p.nombre}</strong>
        <span class="item-precio-unit">$${p.precio.toLocaleString('es-CL')} c/u</span>
      </div>
      <div class="item-controles-page">
        <button onclick="cambiarCantidadPage('${p.nombre}', -1)">−</button>
        <span class="item-cantidad-page">${p.cantidad}</span>
        <button onclick="cambiarCantidadPage('${p.nombre}', 1)">+</button>
      </div>
      <span class="item-subtotal">$${(p.precio * p.cantidad).toLocaleString('es-CL')}</span>
      <button class="btn-eliminar" onclick="eliminarItem('${p.nombre}')" title="Eliminar">✕</button>
    </div>`).join('');

  actualizarResumenPage();
}

function actualizarResumenPage() {
  const total     = carrito.reduce((s, p) => s + p.precio * p.cantidad, 0);
  const resumenEl = document.getElementById('resumen-items-page');
  const totalEl   = document.getElementById('resumen-total-page');

  if (resumenEl) resumenEl.innerHTML = carrito.length === 0
    ? '<p style="color:#7a5a3a;font-size:0.88rem;">No hay productos.</p>'
    : carrito.map(p => `
        <div class="resumen-item-page">
          <span>${p.nombre} x${p.cantidad}</span>
          <span>$${(p.precio * p.cantidad).toLocaleString('es-CL')}</span>
        </div>`).join('');

  if (totalEl) totalEl.textContent = '$' + total.toLocaleString('es-CL');
}

function cambiarCantidadPage(nombre, delta) {
  cambiarCantidad(nombre, delta);
  renderizarListaCarrito();
}

// ── INICIALIZAR ─────────────────────────────────────────────────────────────
actualizarCarrito();
if (document.getElementById('carrito-lista-items'))
  document.addEventListener('DOMContentLoaded', renderizarListaCarrito);

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btn-confirmar-pedido');
  if (btn) btn.addEventListener('click', confirmarPedido);
});

// ── SCOPE GLOBAL ────────────────────────────────────────────────────────────
Object.assign(window, {
  agregar, cambiarCantidad, eliminarItem,
  abrirCarrito, cerrarCarrito, manejarClickCarrito,
  abrirFormulario, cerrarFormulario,
  seleccionarPago, confirmarPedido, filtrar,
  cambiarCantidadPage, renderizarListaCarrito,
});