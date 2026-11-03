# Registro de cambios

## 0.3.6 — Una sola barra inferior de iconos

- Cinco controles vectoriales sin etiquetas visibles: chats, buscar, updates, publicar y opciones; nombres accesibles conservados.
- Sin cabecera, distintivo de modo ni textos de estado. Carga con indicador visual.
- Recargar pasa al menú y se retiran accesos duplicados del menú.
- Se oculta la barra global inferior de Instagram cuando se identifica, conservando controles de contenido.
- Compilación e instalación verificadas en el teléfono con la sesión existente.

## 0.3.5 — Recomendaciones sin ocultar perfiles ni actividad

- Diagnóstico con la sesión real en un teléfono físico: «Suggested for you» hacía que el filtro ocultara la sección completa de perfiles y notificaciones.
- Se oculta únicamente la etiqueta reconocida, conservando el contenedor y su contenido. Algunas recomendaciones pueden permanecer visibles; el bloqueo de feed, Explorar y Reels sigue vigente.
- Prueba de regresión con aparición tardía del encabezado y herramienta para verificar ambas rutas en la WebView real mediante ADB/DevTools.

## 0.3.4 — Perfiles y notificaciones sin pantalla vacía

- El filtro de instalación oculta sólo el enlace/botón, sin ocultar su contenedor compartido con contenido de Instagram.
- Updates abre `/notifications/`; esa ruta deja de interpretarse como el perfil @notifications.
- Regresión del contenido oculto reproducida antes del cambio y corregida con fixtures Chromium.

## 0.3.3 — Updates e historias elegidas desde perfiles

- Acceso a actividad con ♡ Updates.
- Historias y destacadas desde el perfil, limitadas a una foto o video sin avance automático ni gestos para encadenar contenido.
- Los enlaces bloqueados conservan el perfil en lugar de redirigir a Chats.
- Pruebas locales de navegación y visor; compatibilidad autenticada pendiente.

## 0.3.2 — Regreso al chat desde un video

- Al cerrar el visor se recarga siempre el chat de origen, incluso cuando Instagram mantiene la URL de Direct al abrir su carrusel.
- Se pausa el contenido y se mantiene una pantalla de transición hasta la nueva carga, sin restaurar el video en el carrusel.
- Buscar y Publicar conservan su destino al salir del visor.
- Regresión reproducida antes del cambio y corregida en Chromium y en la APK instalada con fixtures locales.

## 0.3.1 — Buscador de Instagram

- El botón Buscar abre el panel oficial de Instagram o su ruta `/explore/search/`, en lugar de pedir el usuario exacto.
- Se permite únicamente la ruta de búsqueda dentro de Explorar; el catálogo de Reels y el resto de Explorar siguen bloqueados.
- Regresiones de rutas y pruebas DOM del panel, búsqueda parcial y selección de perfil. Resultados autenticados pendientes de verificación.

## 0.3.0 (2026-10-31)
- Nuevo visor de **un solo video** para Reels e historias compartidos en chats.
- Ajuste de video centrado con `object-fit: contain`, sin recorte lateral.
- Botón para activar el sonido tras gesto y controles reproducir/pausar.
- Bloqueo de swipe y reproducción continua de recomendaciones.
- Al acabar el video, mostrar **Volver a ver / Volver al chat**.
- Volver al hilo del chat original al salir de la ruta de Reel/Historia.
- Enlaces de contenido compartido autorizados temporalmente desde Direct;
  catálogos de Reels/Explorar/historias aleatorias siguen bloqueados.
- Cierre de seguridad si no aparece el video dentro de 12 segundos.
- 10 tests de rutas y prueba con DOM simulado en Chromium (sin test en Instagram real).


## 0.2.0 (2026-10-31)
- Nuevo botón de publicación que habilita temporalmente Instagram en modo escritorio.
- Apertura asistida del botón Crear y reintento manual desde opciones.
- Compatible con selección de fotos y videos de Android por el selector de archivos WebView.
- Nombre dinámico del perfil mostrado, distinto del usuario que inició sesión.
- Extracción restringida del autor de una publicación desde su encabezado y acción para abrir su perfil.
- Detección de navegación interna tipo SPA.
- Protección contra pérdida de borradores al cerrar el modo publicación.
- Pruebas JavaScript automatizadas.

## 0.1.0 (2026-10-24)
- Primera versión: mensajes, navegación por perfiles, bloqueo de Reels/Explorar/feed.
