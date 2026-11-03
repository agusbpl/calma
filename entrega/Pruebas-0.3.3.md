# Verificación de Calma 0.3.3

Compilada el 2026-11-03 con Java 17, Gradle 8.9 y SDK 35. APK: `Calma.apk`, versionCode 6.

- `node --check` sobre filter.js, clip.js y profile-stories.js: aprobado.
- `node --test tests/filter.test.cjs`: 11/11 aprobados.
- Fixtures Chromium: profile-navigation, profile-stories, search, clip y clip-return aprobados. Verifican conservación del perfil, acceso a actividad, selección de historia/destacada, avatar sin enlace, fijación de foto/video ante cambios del DOM, bloqueo de avance y regreso al origen.
- `gradle :app:assembleDebug :app:lintDebug --offline`: BUILD SUCCESSFUL. Lint: 0 errores y 44 advertencias.
- `aapt dump badging`: paquete ar.com.calma.instagram, versión 0.3.3 (6), Android mínimo 26.

La salida al tocar un enlace bloqueado se reprodujo antes del cambio con `tests/profile-navigation.browser.py` (AssertionError: un toque bloqueado expulsa del perfil); el mismo caso pasa con la corrección.

No se verificó una sesión autenticada de Instagram ni esta APK instalada en un teléfono. Los videos que Instagram no expone como fuente reproducible muestran un aviso para volver al perfil. Las evidencias de 0.3.2 son históricas y no acreditan esta versión.

Para revertir esta funcionalidad se pueden revertir juntos el commit de navegación, sus assets, pruebas y documentación; el visor de Direct conserva su implementación anterior.
