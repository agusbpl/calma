# calma. 0.3.5 — Instagram sin el ruido

Cliente personal Android que utiliza **el sitio web de Instagram dentro de una WebView**. Sin servidor ni API privada. Prioriza mensajes, perfiles y la publicación intencional; permite updates e historias elegidas desde un perfil y bloquea el acceso al feed, Explorar y Reels. La sesión se guarda localmente en Android.

## Corrección 0.3.5: verificada en teléfono con sesión real

El filtro de recomendaciones ocultaba la sección completa del perfil o de notificaciones cuando aparecía «Suggested for you». Ahora oculta únicamente esa etiqueta. La causa se reprodujo con la APK 0.3.4 en un teléfono físico, restaurando la sección desde el depurador, y se verifica de nuevo con 0.3.5. Ver [pruebas de 0.3.5](entrega/Pruebas-0.3.5.md).

## Corrección 0.3.4: perfiles y updates visibles

El filtro de instalación ahora oculta sólo el control de «Usar la app», sin ocultar el contenedor donde Instagram carga perfiles o notificaciones. El corazón abre `/notifications/`, la ruta observada en la grabación, y se identifica como actividad.

## Novedad 0.3.3: updates e historias desde perfiles

Tocá **♡** (updates) para ver la actividad. Desde un perfil podés abrir su historia o una destacada: Calma muestra una sola foto o video, sin swipe ni reproducción encadenada. Para elegir otra, usá **← Perfil** y volvé a seleccionarla desde allí. Si Instagram no expone el contenido compatible, el visor vuelve al perfil.

Tocar un enlace bloqueado conserva la pantalla actual en lugar de expulsarte a Chats. Estas funciones se verifican con fixtures locales; falta validarlas con una sesión real de Instagram.

## Novedad 0.3: un solo video cuando te comparten Reels e historias

En **Direct**, al tocar un Reel o una historia en video compartida, Calma
intenta abrir su **visor único**. A diferencia del reproductor original:

- **Encuadre correcto:** extrae el elemento `<video>` ya cargado por Instagram y
  lo presenta a pantalla disponible con `object-fit: contain`: no recorta caras
  ni pone el video a un costado por los estilos de la web.
- **Sonido:** botón **🔇 Activar sonido** con un toque explícito, volumen del
  video al 100 %, y controles de pausa y reproducción. Asegurate de tener
  activado el **volumen multimedia** del celular; algunos videos no tienen audio.
- **Sin swipe ni reproducción encadenada:** superpone su reproductor sobre el
  visor de Instagram, bloquea gestos de desplazamiento y, cuando termina,
  muestra **Video terminado** y dos acciones: **Volver a ver / Volver al chat**.
- **Vuelta al chat:** el botón **← Chats** y Atrás de Android recargan siempre el chat de origen y descartan el carrusel situado detrás.
- **Por defecto sigue bloqueado:** entrar directamente a `/reels/`, Explorar,
  historias aleatorias u otros Reels sin un toque previo en un chat.
- **Carga restringida:** si un Reel autorizado no expone un elemento `<video>`
  en doce segundos, vuelve al chat en lugar de habilitar navegación infinita.

El contenido audiovisual sigue llegando **desde la web de Instagram**; Calma no
extrae ni almacena archivos privados, no descarga contenidos de terceros y no
elimina DRM ni restricciones del sitio.

**Compatibilidad:** la entrega 0.3.2 incluye pruebas con fixtures en Chromium y en la WebView de una APK instalada en Android 15. No se verificó con una cuenta autenticada contra Instagram. El sitio puede cambiar o no exponer el video al DOM. Las pruebas del regreso al chat no acreditan reproducción ni audio reales.

## Instalar la última versión

La entrega actual es **0.3.5** (versionCode 8): [descargar Calma.apk](entrega/Calma.apk). Requiere Android 8.0 o posterior. Autorizá la instalación desde el navegador o administrador de archivos y abrí la app.

Para verificar el archivo, desde `entrega/` ejecutá `sha256sum -c Calma.apk.sha256`. El [informe de 0.3.5](entrega/Pruebas-0.3.5.md) registra la corrección actual. El [informe de 0.3.4](entrega/Pruebas-0.3.4.md) conserva las pruebas previas. El [informe de 0.3.3](entrega/Pruebas-0.3.3.md) registra las verificaciones actuales; el [informe original](entrega/Pruebas.md) y `entrega/evidencias/` conservan los resultados de 0.3.2. No se incluyen APK anteriores ni claves de firma.

## Cambios conservados de la versión 0.2

- **＋ Publicar**: abre Instagram web en modo escritorio y **trata de abrir automáticamente su menú Crear**. Si Instagram cambia su interfaz y el clic automático no se encuentra, tocá **Crear (+)** dentro de la página. Los archivos se eligen desde el selector del teléfono; las publicaciones se confirman desde el editor de Instagram, nunca desde Calma automáticamente.
- **Nombre del usuario visitado**: la cabecera de Calma muestra `Viendo @usuario` al abrir un perfil, también si no es tu cuenta. La franja inferior muestra el perfil actual; tocala para abrirlo.
- **Autor de publicaciones**: al abrir una URL `/p/...`, Calma intenta localizar el autor en el encabezado del post y mostrar `Publicación de @usuario`. Tocá la franja inferior para ir a su perfil. Si no puede identificarlo, **no inventa el nombre**: podés tocarlo dentro de Instagram.
- **Navegación dinámica**: detecta cambios de perfiles realizados por Instagram sin recargar la página (SPA).
- **Protección al salir del editor**: antes de abandonar el modo de publicación, avisa que un borrador sin terminar podría perderse.
- **Reintentar creación**: botón `⋯ → Reintentar abrir Crear` durante la edición.

## Cómo usarlo en Android

1. Iniciá sesión normalmente en la página de Instagram que aparece al abrir Calma.
2. Tocá **Chats** para mensajes o **Buscar** para abrir el buscador oficial de Instagram y encontrar cuentas por nombre o parte del usuario. También podés abrir otros perfiles desde la propia web.
3. Al mirar un perfil, vas a ver su nombre en la **cabecera y en la franja inferior**. La franja es tocable.
4. Al abrir una foto/publicación, intentará mostrar el **autor del post**, no el dueño de la sesión.
5. Si te comparten un video en un chat, tocá su miniatura y después **Activar sonido** si aparece silenciado. El botón **← Chats** te devuelve a la conversación.
6. Para publicar, tocá **＋ Publicar**. Se abre el modo escritorio (sin el feed) y se intenta abrir Crear. Si no se abre, usá **Crear (+)** en el menú de Instagram; después elegí archivo, editá, escribí el texto y tocá **Compartir** en Instagram. Para volver, tocá **✓ Salir**.

**Importante sobre publicación:** la interfaz web de escritorio permite publicaciones tradicionales en cuentas compatibles, pero **no se verificó el flujo real en este teléfono**. Instagram puede variar el editor según la cuenta, la región y el navegador, o rechazar una WebView. Si Crear no aparece, probá `⋯ → Reintentar abrir Crear`; si tampoco aparece, `⋯ → Abrir Instagram en Firefox` y activá **Sitio de escritorio** allí. Si la interfaz es muy angosta, girá el celular horizontalmente. La app evita interrupciones por cambios de orientación durante la edición.

No proporciona publicación nativa directa, historias, música, filtros de Reels, ni publicación garantizada de videos: toda edición/validación depende de Instagram. Publicar un video no habilita la **navegación** por Reels.

## Qué se permite y qué se bloquea

| Permitido | Filtrado/bloqueado |
| --- | --- |
| Mensajes directos y adjuntos | Inicio/feed infinito (`/`) |
| Ver perfiles propios y ajenos, updates e historias individuales desde un perfil | Reels y Explorar |
| Entrar en fotos/publicaciones elegidas y clips compartidos en Direct | Catálogos de Reels e historias encadenadas |
| Ver autor de una publicación (si el DOM lo expone) | Recomendaciones visibles identificables |
| Subir fotos o videos usando Crear de Instagram web | Enlaces profundos que fuerzan instalar la app |
| Inicio de sesión en Instagram | Reproducción encadenada de clips sugeridos |

Los filtros DOM no son perfectos y se pueden volver incompatibles si Instagram cambia sus elementos. **No se puede garantizar bloquear absolutamente toda recomendación**.

## Generar la APK en GitHub sin instalar Android Studio

1. Abrí el repositorio https://github.com/agusbpl/calma. El código y `.github` están en la raíz.
2. Abrí **Actions → Compilar APK de Calma → Run workflow**. El workflow también corre en cada push a `main` o `master`.
3. Cuando termina correctamente, descargá el artefacto `Calma-Android-APK`.
4. Dentro del artefacto estará `app-debug.apk`. Instalalo en el teléfono.

La compilación de GitHub usa una firma debug generada por el runner; si Android dice que la actualización tiene firma incompatible, necesitás **desinstalar Calma anterior** y después instalar la nueva (esto borra la sesión guardada). Para actualizaciones conservando la sesión, compilá ambas versiones con **la misma clave de firma**.

### Compilar desde Android Studio o terminal

- Android SDK Platform 35, Android Gradle Plugin 8.7.3, Java 17, Gradle 8.9.
- `gradle :app:assembleDebug`, con `ANDROID_HOME` configurado. Alternativamente Android Studio → **Build → Build APK(s)**.
- Resultado: `app/build/outputs/apk/debug/app-debug.apk`.

## Privacidad y seguridad

Las credenciales se ingresan en la página de Instagram, no en un formulario propio. Calma no extrae cookies, mensajes ni fotos para un servidor; las credenciales/cookies las gestiona WebView localmente. El selector Android entrega permisos temporales para archivos `content://`; Calma no solicita permiso general de acceso a toda la galería ni acceso a cámara/micrófono. No hay notificaciones push en segundo plano.

No se garantiza que Instagram permita iniciar sesión o publicar desde una WebView. El modo escritorio puede mostrarse reducido en pantallas chicas. El editor web depende de Meta y puede cambiar sin previo aviso. Calma no está afiliado a Instagram ni Meta.

## Alternativa con Firefox + uBlock

`firefox/filtros-ublock.txt` sigue sirviendo para ocultar enlaces a Reels/Explorar e instalar la app desde Firefox Android. En Firefox, configurá **Abrir enlaces en aplicaciones → Nunca** para que Instagram no te mande a instalar la app. Abrí `https://www.instagram.com/direct/inbox/`; para publicar, **Sitio de escritorio → Crear** (si está disponible para tu sesión).

## Pruebas

Desde la raíz del repositorio:

```sh
node --check app/src/main/assets/filter.js
node --check app/src/main/assets/clip.js
node --test tests/filter.test.cjs
python tests/clip.browser.py
python tests/search.browser.py
python tests/clip-return.browser.py
python tests/profile-navigation.browser.py
python tests/profile-stories.browser.py
python tests/recommendations.browser.py
```

Las pruebas de navegador requieren Python con Playwright y Chromium instalado en `/usr/bin/chromium`. Utilizan fixtures locales, sin iniciar sesión en Instagram.

El informe original de la versión 0.3.2 registra 11 casos de rutas aprobados, pruebas DOM, compilación exitosa y validación del retorno al chat en la APK instalada. Android Lint reportó 0 errores y 40 advertencias. No se verificaron login, publicación ni reproducción contra Instagram real. Consultá [Pruebas.md](entrega/Pruebas.md) para el alcance de esas evidencias.

## Estructura

```text
CalmaInstagram/
├── app/src/main/java/ar/com/calma/instagram/MainActivity.java  # UI, perfil, editor, selector Android
├── app/src/main/assets/filter.js                              # Filtros, autor, apertura de Crear
├── app/src/main/assets/clip.js                                # Un video, controles y bloqueo de swipe
├── app/src/main/AndroidManifest.xml
├── app/build.gradle
├── .github/workflows/android-apk.yml                            # Compilar APK online
├── firefox/filtros-ublock.txt                                    # Alternativa Firefox
├── tests/filter.test.cjs                                        # Regresiones JS
├── tests/clip.browser.py                                       # Simulación de video en Chromium
└── README.md
```

## Referencias

- [Android WebChromeClient.FileChooserParams](https://developer.android.com/reference/android/webkit/WebChromeClient.FileChooserParams)
- [Android WebView](https://developer.android.com/develop/ui/views/layout/webapps/webview)
- [Publicar desde Instagram en navegador, guía 2026](https://metricool.com/es/como-publicar-en-instagram/)
- [Firefox Android: abrir enlaces en aplicaciones](https://support.mozilla.org/en-US/kb/set-firefox-android-open-links-native-apps)

### Búsqueda de cuentas (0.3.1)

El botón **Buscar** abre el panel de búsqueda de Instagram cuando está disponible; de lo contrario abre `/explore/search/`. Los resultados y sugerencias los proporciona Instagram y requieren la sesión que solicite el sitio. Ya no es necesario escribir el usuario exacto en un diálogo de Calma. La excepción permite sólo esa ruta de búsqueda: el resto de Explorar y el catálogo de Reels continúan bloqueados.

### Regreso al chat (0.3.2)

El botón **← Chats** del visor y Atrás de Android cargan nuevamente la conversación desde la que abriste el video. Esto descarta el carrusel que Instagram puede dejar detrás, aun sin cambiar la URL de Direct. Durante la salida se muestra una pantalla de transición. Volver puede requerir una nueva carga de red del chat.

## Versión conservada

El repositorio contiene el código y la APK de 0.3.5; las evidencias originales de 0.3.2 se conservan como referencia histórica. Las entregas anteriores se eliminaron; [CHANGELOG.md](CHANGELOG.md) conserva el historial descriptivo. Los directorios de compilación y cachés están excluidos de Git.
