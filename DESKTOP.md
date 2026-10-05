# Pausa para escritorio

La aplicación usa Electron para ejecutarse como una ventana independiente y
compacta en Windows y macOS. Los datos continúan guardándose localmente en el
perfil de la aplicación de cada ordenador.

## Probar la aplicación

El servidor de Vite debe estar activo. Después, ejecuta:

```bash
pnpm desktop
```

## Crear el instalador de Windows

Ejecuta este comando desde un equipo Windows:

```bash
pnpm desktop:windows
```

Los instaladores se generan en `release/`. El instalador permite elegir la
ubicación y crea un acceso directo en el escritorio.

## Crear la aplicación para macOS

Ejecuta este comando desde un Mac:

```bash
pnpm desktop:mac
```

En `release/` se generan un archivo DMG y un ZIP. Para distribuir la aplicación
fuera de tu propio Mac, Apple puede requerir firma y notarización con una cuenta
de desarrollador.

## Compartirla con otro ordenador

Copia el instalador de `release/` al otro dispositivo e instálalo allí. Windows
y macOS necesitan instaladores diferentes. Los perfiles y sesiones no se
sincronizan entre ordenadores porque se almacenan localmente.

## Actualizaciones automáticas

Desde la versión 1.0.1, Pausa busca actualizaciones al abrirse usando las
releases públicas de `https://github.com/jose8604/PAUSA`. Si encuentra una
versión superior, pregunta si debe descargarla y, cuando termina, ofrece
reiniciar la aplicación para instalarla.

La versión que estuviera instalada antes de incorporar este sistema no puede
actualizarse por sí sola. Instala manualmente la versión 1.0.1 una vez en cada
ordenador. A partir de entonces se podrán recibir las siguientes versiones de
forma automática.

### Publicar una versión para Windows

1. Cambia `version` en `package.json` por un número superior, por ejemplo
   `1.0.2`. No vuelvas a publicar un número de versión ya utilizado.
2. Crea en GitHub un token de acceso personal con permiso de escritura en
   `jose8604/PAUSA` (`Contents: Read and write`). No guardes ni subas el token
   al repositorio.
3. Abre PowerShell en Windows y define el token solo para esa terminal:

   ```powershell
   $env:GH_TOKEN="TU_TOKEN_DE_GITHUB"
   ```

4. Genera y publica la release:

   ```powershell
   pnpm desktop:windows:publish
   ```

El comando compila la web, crea los instaladores x64 y arm64 y publica en
GitHub tanto los `.exe` como `latest.yml` y los archivos `.blockmap`. Todos son
necesarios para que la actualización automática funcione.

### Publicar una versión para macOS

En un Mac, configura `GH_TOKEN` para esa terminal y ejecuta:

```bash
GH_TOKEN="TU_TOKEN_DE_GITHUB" pnpm desktop:mac:publish
```

Para distribuir actualizaciones de macOS fuera del equipo de desarrollo se
deben firmar y notarizar las aplicaciones con una cuenta de Apple Developer.

### Probar el aviso de actualización

1. Instala manualmente Pausa 1.0.1 en el ordenador de prueba.
2. Confirma que la release `v1.0.1` está publicada, no como borrador, y que
   contiene `latest.yml`, los instaladores y los `.blockmap`.
3. Cambia la versión del proyecto a `1.0.2` y vuelve a publicar desde Windows.
4. Cierra Pausa por completo y abre la versión 1.0.1 instalada.
5. Aparecerá el aviso para descargar Pausa 1.0.2. Después de la descarga,
   acepta reiniciar e instalar.

El actualizador solo se ejecuta en aplicaciones instaladas y empaquetadas. No
se activa con `pnpm desktop` ni en la vista previa de Vite.
