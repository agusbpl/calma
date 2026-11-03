# Verificación de Calma 0.3.6

Interfaz simplificada: sólo contenido web y barra inferior de cinco ImageButton con recursos vectoriales de 24 dp. Se retiraron cabecera, estado y recarga independiente; el menú conserva recarga y perfil actual. El editor cambia el más por una cruz. Los iconos conservan descripciones de accesibilidad y tooltip.

- `gradle :app:assembleDebug :app:lintDebug --offline`: BUILD SUCCESSFUL; Lint: 0 errores, 2 advertencias.
- `node --test tests/filter.test.cjs`: 11/11 aprobados.
- Fixtures Chromium navigation-bar, profile-content, profile-navigation, recommendations, search y profile-stories: aprobados.
- `navigation-bar.browser.py`: sólo se oculta la barra inferior global fija con Inicio y Direct; se conservan contenido, enlaces y controles contextuales.
- Instalación con `adb install -r` en teléfono físico: Success, sesión conservada.
- Jerarquía UI Automator: cinco ImageButton con descripciones Chats, Buscar, Actualizaciones, Publicar y Opciones; sin etiquetas visibles ni cabecera nativa. Revisión visual de espaciado y vectores en captura local.
- `device-navigation.py`: perfil y actividad visibles en Instagram autenticado tras cargar recomendaciones. Barra global duplicada oculta sin ocultar el contenido.

No se publicaron contenidos ni se borró la sesión. No se guardaron capturas ni datos de la cuenta en el repositorio. El visor de clips conserva sus controles específicos. Para revertir la presentación, revertir este commit completo con sus recursos y APK; los arreglos previos de perfiles y actividad no dependen de esta presentación.
