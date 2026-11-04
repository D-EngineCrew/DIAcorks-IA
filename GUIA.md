# Guía de DIAcorks IA (v1.1.0)

App de chat para Android hecha con Expo. Usa **Claude** (por OpenRouter) para el texto y **Gemini (Firebase)** para imágenes y voz. Recuerda tus chats aunque cierres la app.

## 1. Estructura de archivos

```
DIAcorks/
├── .github/workflows/android-build.yml   ← receta que compila el APK
├── assets/                               ← icon.png, adaptive-icon.png, splash.png
├── src/
│   ├── theme.js                          ← colores
│   └── components/
│       ├── ChatInterface.js              ← pantalla principal + guardado de chats
│       ├── Menu.js                       ← menú lateral (modos, historial)
│       ├── MessageBubble.js              ← burbujas de mensaje
│       ├── SettingsModal.js              ← API key y memoria de la IA
│       └── services/
│           ├── aiService.js              ← habla con Claude (OpenRouter)
│           ├── geminiService.js          ← imágenes y voz con Gemini
│           ├── chatStore.js              ← guarda/lee los chats en el teléfono
│           ├── storage.js                ← guarda la API key y la memoria
│           └── utils/fileHandler.js      ← adjuntar archivos
├── App.js, app.json, babel.config.js, metro.config.js, package.json
├── google-services.json                  ← Firebase
└── .gitignore
```

## 2. Qué recuerda la IA

- **Tus chats:** se guardan solos en el teléfono. Al abrir la app vuelve el último chat, y en **☰ → Historial** están los demás. La IA usa los últimos mensajes del chat abierto para seguir la conversación.
- **Memoria:** en **☰ → Configuración y memoria** escribes lo que debe recordar siempre (tu nombre, tus gustos, cómo quieres que te hable). Se usa en todos los chats.
- Las imágenes generadas se guardan como archivos en el teléfono. Si borras un chat, se borran sus imágenes.
- Todo queda **solo en tu teléfono**. Si desinstalas la app, se pierde.

## 3. Primer uso

1. Abre **☰ → Configuración y memoria**.
2. Pega tu API key de OpenRouter (`sk-or-...`) y toca **Guardar clave**. Nunca la compartas por chat ni la subas a GitHub.
3. Escribe, adjunta con 📎 o pide una imagen.

Modos del menú: **Automático**, **Solo Claude**, **Imágenes**, **Respuestas con voz**.

## 4. Cambiar el código desde GitHub y sacar un APK nuevo

**Editar un archivo desde el navegador:**
1. Abre tu repositorio en GitHub y entra al archivo (por ejemplo `src/components/services/aiService.js`).
2. Toca el ícono del lápiz ✏️ para editar.
3. Haz el cambio y toca **Commit changes** → **Commit directly to main**.
4. Ve a la pestaña **Actions**: el build arranca solo.

**Bajar el APK:**
1. En **Actions** abre la ejecución más reciente (con ✓ verde).
2. Baja hasta **Artifacts** y toca **DIAcorks-Release**.
3. Descomprime el ZIP, instala `app-release.apk` encima de la app anterior. Tus chats se conservan al actualizar.

**Si editaste en GitHub y luego quieres subir cambios desde Termux**, trae primero lo de GitHub:
```bash
cd ~/DIAcorks
git pull --rebase origin main
```

## 5. Actualizar con este ZIP desde Termux

```bash
pkg install -y unzip
ls /storage/emulated/0/Download | grep -i diacorks     # busca dónde quedó el ZIP
mkdir -p ~/nuevo && unzip -o /storage/emulated/0/Download/DIAcorks.zip -d ~/nuevo
cp -r ~/nuevo/DIAcorks/. ~/DIAcorks/
cd ~/DIAcorks
git add -A
git commit -m "v1.1.0 memoria y historial"
git pull --rebase origin main
git push
```

## 6. Errores comunes

| Error | Solución |
|---|---|
| "API key inválida" | La llave debe ser de OpenRouter (`sk-or-...`). Vuelve a pegarla en Configuración. |
| "Sin créditos" | Agrega saldo en tu cuenta de OpenRouter. |
| Imagen o voz fallan | Lee el texto de **Detalle:** en el mensaje. Revisa que AI Logic esté activado en Firebase y que App Check no esté en "Enforce". |
| El build falla con Node 24 | En `android-build.yml` cambia `'24'` por `'20'`. |
| `google-services.json is missing` | El archivo tiene que estar en la raíz del repo. |
| El APK nuevo no instala | Es de otra firma. Desinstala la app anterior (se pierden los chats) e instala de nuevo. |
