# Artemis para diagnosticar Calma en un teléfono

Sí: Artemis permite automatizar recorridos Android reales y obtener capturas y Logcat. Requiere un dispositivo accesible mediante ADB autorizado o un emulador. Su consola ofrece espejo de pantalla y repeticiones de ejecución. También incluye integración MCP para asistentes de desarrollo. [README oficial](https://github.com/google/artemis#quick-start)

Para investigar el fallo de Calma, la propuesta es repetir Buscar → perfil → Updates con la sesión del teléfono, registrar cuándo desaparece el contenido y comparar el resultado al desactivar temporalmente el filtro. Esto es una propuesta de diagnóstico, no una garantía de que Artemis identifique la causa.

La configuración de ejemplo pide al menos un proveedor de modelos mediante una clave API; admite configuración de host, puerto y dispositivo ADB. No es necesario compartir claves por el chat. [.env.example oficial](https://github.com/google/artemis/blob/main/.env.example)

El MCP expone observación de pantalla y jerarquía, inspección de trazas y diagnóstico del entorno, incluida autorización ADB y credenciales. Su guía recomienda Pro cuando se necesita diagnóstico con ADB, video o logs. [Documentación MCP](https://github.com/google/artemis/blob/main/mcp_server/README.md)

El inicio automático puede instalar dependencias y ofrecer cambios globales de MCP/reglas. La primera tarea instala por defecto un helper de accesibilidad; existe una opción para impedir esa instalación automática. Conviene revisar esas opciones antes de ejecutar el arranque en un equipo o teléfono personal. [Instalación y helper](https://github.com/google/artemis#what-artemis-installs-on-your-phone)

Artemis automatiza la prueba; no reemplaza el inicio de sesión ni corrige por sí solo una incompatibilidad de Instagram con WebView. Para separar sesión, red y filtro hacen falta evidencias del fallo real.

En esta investigación se usaron directamente ADB inalámbrico y DevTools de la WebView. Se reprodujo el fallo y se verificó la corrección 0.3.5 en el teléfono, sin instalar Artemis. Ver [evidencias](../entrega/Pruebas-0.3.5.md).
