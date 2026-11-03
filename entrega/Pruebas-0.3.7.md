# Verificación de Calma 0.3.7

Entrega con modo oscuro/claro persistente, Mi perfil desde identidad propia verificada, menú reducido, errores recuperables, visores compartidos y tarjetas de sugerencias filtradas con límites explícitos. Compilada con Java 17, Gradle 8.9 y SDK 35; versionCode 10.

## Pruebas automatizadas

- `node --test tests/filter.test.cjs`: 11/11 aprobados; sintaxis de los assets JavaScript aprobada.
- Fixtures Chromium: theme, own-profile, recommendation-cards, recommendations, navigation-bar, profile-content, profile-navigation, search, profile-stories, clip y clip-return aprobados.
- El tema conserva los colores del contenido multimedia, permite cambio en vivo y reaplica la elección tras cambios de clases del sitio.
- Mi perfil sólo acepta navegación de cuenta o el selector del inbox; ignora perfiles visitados, contactos y enlaces externos. La referencia temporal nativa se limpia al entrar en login o cerrar sesión.
- Las tarjetas sugeridas se prueban con la estructura observada en el sitio real, conservando actividad normal y contenedores de página.
- `gradle :app:assembleDebug :app:lintDebug --offline`: BUILD SUCCESSFUL; Lint: 0 errores y 3 advertencias.

## Teléfono físico con sesión existente

APK instalada con `adb install -r`: Success. Se comprobó el menú reducido, Mi perfil, cambio de tema en vivo, fondo oscuro del sitio y ausencia de filtros de inversión en fotos/videos. La elección de modo claro se conservó tras reiniciar por completo la app (dando tiempo a la escritura de la preferencia); se dejó el modo oscuro activo. Mi perfil también funcionó desde una conversación local simulada usando la identidad propia previamente verificada, sin abrir chats reales.

Perfil y actividad permanecieron visibles en la prueba final `device-navigation.py`. La página real de notificaciones identificó y ocultó 30 tarjetas sugeridas; el contenido principal permaneció visible.

Una petición de documento detenida mediante DevTools dejó el indicador de carga y mostró Reintentar al superar el límite. Tras liberar la petición, el reintento recuperó la página. El temporizador empieza desde la acción nativa, antes de esperar callbacks de WebView.

Al recargar sin conexión mediante el menú nativo apareció Reintentar; al restaurar la red y tocarlo se recuperó Instagram. La prueba usa ADB y DevTools, sin leer cookies ni exportar contenido de la cuenta. Las capturas y trazas de diagnóstico quedaron fuera del repositorio.

El handler HTTP está implementado, pero no se acreditó un error HTTP real del servidor: una URL inexistente de Instagram respondió 200 y una respuesta 503 inyectada por DevTools no reprodujo el callback nativo. No se verificó reproducción autenticada de nuevos clips/historias; sus controles y restricciones se validaron con fixtures locales.

## Unidades reversibles

Los controles compartidos y el filtro de tarjetas están en commits independientes. La preferencia de tema, el acceso a la cuenta propia y la recuperación de carga se revierten junto con sus assets, pruebas y APK. No requieren revertir los arreglos previos de perfiles o actividad.
