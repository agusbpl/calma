# Verificación de Calma 0.3.5

## Evidencia en dispositivo real

El 2026-11-03 se conectó un teléfono físico Android (modelo 2412DPC0AG) mediante ADB inalámbrico y se inspeccionó la WebView con DevTools. No se instalaron Artemis ni helpers de accesibilidad.

Con la APK 0.3.4 y la sesión existente, un perfil y `/notifications/` cargaban contenido y luego quedaban vacíos. Se observó un `section` con `display:none !important` que contenía la navegación y el contenido de la página. Sus descendientes incluían «Suggested for you». Al retirar ese estilo, la página de notificaciones recuperó su contenido visible. No hubo redirección al login.

La causa es `hideRecommendations()`: elegía el ancestro `article, li, section` y lo ocultaba si su texto tenía menos de 5000 caracteres. Instagram usa un `section` que contiene toda la página; el límite de texto no demuestra que sea un bloque de recomendaciones. Ahora se oculta sólo la etiqueta reconocida.

## Validación

- Fixture `tests/recommendations.browser.py`: falló antes del cambio con «recommendation heading hid entire page»; pasa después para perfil y actividad con recomendaciones insertadas tras la carga inicial.
- `node --test tests/filter.test.cjs`: 11/11 aprobados.
- Fixtures Chromium profile-content, profile-navigation, search, profile-stories, clip y clip-return: aprobados.
- `gradle :app:assembleDebug :app:lintDebug --offline`: BUILD SUCCESSFUL.
- APK 0.3.5 (versionCode 8) instalada con `adb install -r`: Success, conservando la sesión.
- `tests/device-navigation.py --cdp http://127.0.0.1:9223 --profile USER`: PASS para perfil y actividad en la WebView autenticada, esperando 6,5 segundos después de la carga en cada ruta. Verifica contenido visible, contexto correcto y ausencia de secciones de página ocultas.

Para repetir la prueba real, conectar el teléfono, abrir Calma y reenviar el socket `webview_devtools_remote_PID` mediante `adb forward tcp:9223 localabstract:webview_devtools_remote_PID`. El PID cambia al reiniciar la app. La herramienta no exporta contenido de páginas ni cookies.

Algunas recomendaciones pueden permanecer visibles porque no se ocultan contenedores inferidos. El feed, Explorar y Reels siguen bloqueados. No se validaron historias nuevas ni reproducción autenticada en esta revisión. No se guardaron capturas ni datos de la cuenta en el repositorio.

Revertir este commit restaura el filtro anterior y la APK anterior sin cambiar los flujos de clips o historias.
