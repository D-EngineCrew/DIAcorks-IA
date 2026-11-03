# Guía de DIAcorks IA

App de chat para Android hecha con Expo. Usa **Claude** para el texto y **Gemini (Firebase)** para imágenes y voz.

## 1. Estructura de archivos

Crea exactamente estas carpetas y archivos (los nombres y mayúsculas importan):

```
DIAcorks/
├── .github/
│   └── workflows/
│       └── android-build.yml
├── assets/
│   ├── icon.png
│   └── adaptive-icon.png
├── src/
│   ├── theme.js
│   └── components/
│       ├── ChatInterface.js
│       ├── Menu.js
│       ├── MessageBubble.js
│       ├── SettingsModal.js
│       └── services/
│           ├── aiService.js
│           ├── geminiService.js
│           ├── storage.js
│           └── utils/
│               └── fileHandler.js
├── .gitignore
├── App.js
├── app.json
├── babel.config.js
├── google-services.json
├── metro.config.js
└── package.json
```

Qué hace cada uno:

| Archivo | Para qué sirve |
|---|---|
| `App.js` | Punto de entrada. Solo muestra el chat. |
| `ChatInterface.js` | Pantalla principal: mensajes, adjuntar archivo, enviar. |
| `Menu.js` | Menú lateral (☰): nuevo chat, modos y configuración. |
| `MessageBubble.js` | Cada burbuja de mensaje (texto, imagen, botón 🔊). |
| `SettingsModal.js` | Pantalla donde pegas tu API key de Claude. |
| `aiService.js` | Habla con Claude. |
| `geminiService.js` | Genera imágenes y voz con Gemini. |
| `storage.js` | Guarda tu API key cifrada en el teléfono. |
| `fileHandler.js` | Elige y lee archivos (texto, código, imágenes, PDF). |
| `theme.js` | Colores y bordes de toda la app. |
| `app.json` | Nombre de la app, paquete `com.dfpmprojects.DIAcorks`, íconos. |
| `metro.config.js` | Necesario para que funcione Firebase. |
| `google-services.json` | Configuración de Firebase (el que descargaste). |
| `android-build.yml` | Receta de GitHub para compilar el APK. |

## 2. Compilar el APK con GitHub

1. Crea un repositorio en GitHub. **Ponlo privado**, porque `google-services.json` lleva tu API key de Firebase.
2. Sube **todo el contenido** de la carpeta `DIAcorks` a la raíz del repo (no la carpeta en sí). `.github` y `google-services.json` tienen que quedar en la raíz.
3. Ve a la pestaña **Actions**. El build arranca solo con cada push, o tócalo a mano en *Build DIAcorks APK → Run workflow*.
4. Espera unos 10 a 20 minutos. Cuando termine, entra a la ejecución y baja **DIAcorks-Release** desde *Artifacts*.
5. Descomprime el ZIP, pasa `app-release.apk` al teléfono e instálalo (hay que permitir "instalar apps de origen desconocido").

El APK sale firmado con una llave de prueba. Sirve para uso personal, pero para subirlo a Google Play hará falta tu propia llave.

## 3. Primer uso

1. Abre la app y toca el aviso rojo, o ve a **☰ → Configuración**.
2. Pega tu API key de Claude (`sk-ant-...`) y toca **Guardar clave**. Queda guardada cifrada en el teléfono, no en el código.
3. Escribe, adjunta con 📎 o pide una imagen ("dibuja un dragón").

Modos del menú:
- **Automático**: Claude responde; si pides una imagen, la hace Gemini.
- **Solo Claude**: texto, código y archivos.
- **Imágenes**: cada mensaje genera una imagen.
- **Respuestas con voz**: Claude responde y Gemini lo lee en voz alta.

En cualquier respuesta de texto puedes tocar **🔊 Escuchar**.

## 4. Firebase (Gemini)

- En la consola de Firebase entra a **AI Logic** y activa el servicio.
- Revisa que existan los modelos que usa la app (están al inicio de `geminiService.js`): `gemini-2.5-flash-image` para imágenes y `gemini-3.1-flash-tts-preview` para voz. Si Google cambia un nombre, edita esa constante.
- La API key de Firebase va dentro del APK. En Google Cloud Console → Credenciales, limita esa clave solo a las APIs de IA que usas y pon una alerta de presupuesto.

## 5. Errores comunes

| Error | Solución |
|---|---|
| El build falla con Node 24 en `expo prebuild` | En `android-build.yml` cambia `'24'` por `'20'`. |
| `google-services.json is missing` | El archivo no está en la raíz del repo. |
| `Unable to resolve firebase/ai` | Revisa que `metro.config.js` esté en la raíz. |
| Error de Gradle por memoria | Vuelve a ejecutar el workflow; si se repite, avísame. |
| Imagen o voz: "modelo no disponible" | El nombre del modelo no existe en tu Firebase. Cámbialo en `geminiService.js`. |
| Claude: "API key inválida" | Vuelve a pegar la clave en Configuración. |
| Claude: error 4xx de crédito | Tu cuenta de Anthropic no tiene saldo. |

Esto no se probó compilando en un teléfono real. Si algo falla, copia el mensaje exacto del error del paso que se puso rojo en Actions.
