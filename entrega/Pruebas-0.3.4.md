# Verificación de Calma 0.3.4

La grabación del usuario muestra el perfil inicialmente visible y luego vacío sin salir de su URL. También muestra `/notifications/` identificado incorrectamente como un perfil después de abrir Updates.

`tests/profile-content.browser.py` reprodujo antes del cambio un contenedor de perfil oculto por el filtro de instalación (AssertionError: /fharamberry/: el filtro oculta el contenido junto con el banner). Después del cambio conserva visibles el perfil y las notificaciones, incluso al actualizar el contenido. El filtro ya no oculta padres usando heurísticas de texto/tamaño.

Verificaciones del 2026-11-03:

- `node --test tests/filter.test.cjs`: 11/11 aprobados.
- `node --check app/src/main/assets/filter.js`: aprobado.
- Fixtures Chromium profile-content, profile-navigation, search, profile-stories, clip y clip-return: aprobados.
- `gradle :app:assembleDebug :app:lintDebug --offline`: BUILD SUCCESSFUL; consultar reporte local de Lint para advertencias.
- APK 0.3.4, versionCode 7, Android mínimo 26; checksum actualizado.

No se accedió a una cuenta autenticada ni se instaló esta versión en un teléfono. La prueba reproduce la ocultación del contenedor; no demuestra que sea la única causa de pantallas vacías del sitio real. La ruta de notificaciones se obtuvo de la grabación del usuario. Revertir este commit restaura el filtro y la ruta anteriores sin afectar el visor de historias.
