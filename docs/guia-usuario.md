# IntelliDocs — Guía de usuario

**Aplicación:** https://intellidocs-web.vercel.app

---

## Registro e inicio de sesión

Al entrar en la aplicación verás la página de inicio con la opción de registrarte o iniciar sesión.

**Registro con email:**
1. Haz clic en *Registrarse*
2. Introduce tu nombre, email y contraseña
3. Recibirás un email de verificación — haz clic en el enlace para activar tu cuenta
4. Una vez verificado, ya puedes iniciar sesión

**Inicio de sesión con Google:**
1. Haz clic en *Continuar con Google*
2. Selecciona tu cuenta de Google
3. Si ya tenías cuenta con ese email, se vinculará automáticamente

---

## Crear un workspace

Un workspace es el espacio de trabajo de tu equipo. Cuando entras por primera vez, la aplicación te pedirá que crees uno.

1. Ponle un nombre a tu workspace
2. Opcionalmente sube una imagen de portada
3. Haz clic en *Crear*

Ya estás dentro. En la barra lateral izquierda encontrarás todas las secciones.

---

## Drive — subir y organizar archivos

El Drive es el sistema de archivos del workspace.

### Crear carpetas

Antes de subir archivos necesitas crear al menos una carpeta.

1. Haz clic en *Nueva carpeta* (esquina superior derecha)
2. Escribe el nombre
3. Puedes elegir un color para identificarla visualmente
4. Haz clic en *Crear*

Para crear subcarpetas, entra en una carpeta y repite el proceso.

### Subir archivos

1. Entra en la carpeta donde quieras subir
2. Haz clic en *Subir* (botón verde)
3. Arrastra los archivos o haz clic para seleccionarlos (máximo 4 a la vez)
4. Verás el progreso de subida y, una vez procesados, aparecerán en la cuadrícula

La aplicación procesa automáticamente cada archivo: extrae el texto de los PDFs, obtiene las dimensiones de las imágenes y calcula un identificador único. Este proceso dura unos segundos.

### Buscar archivos

La barra de búsqueda (parte superior) busca tanto por nombre de archivo como **dentro del contenido** de los documentos. Por ejemplo, si buscas "contrato" encontrará todos los PDFs que contengan esa palabra.

### Filtrar por etiquetas

Si tienes etiquetas creadas, puedes filtrar los archivos por etiqueta usando el botón con el icono de etiqueta junto a la búsqueda.

### Acciones sobre archivos y carpetas

Haz clic derecho (o en el menú de tres puntos) sobre cualquier archivo o carpeta para ver las opciones disponibles:

- **Renombrar**
- **Mover** a otra carpeta
- **Etiquetar**
- **Ver propiedades** — tamaño, fecha, texto extraído, etc.
- **Descargar**
- **Ver versiones** — historial de versiones del archivo
- **Enviar a papelera**

---

## Etiquetas

Las etiquetas sirven para clasificar archivos de forma transversal, independientemente de en qué carpeta estén.

1. Ve a *Etiquetas* en la barra lateral
2. Haz clic en *Nueva etiqueta*
3. Ponle un nombre y elige un color
4. Para asignarla a un archivo, haz clic derecho sobre el archivo → *Etiquetar*

---

## Miembros

Para invitar a alguien a tu workspace:

1. Ve a *Miembros* en la barra lateral
2. Haz clic en *Invitar*
3. Introduce el email de la persona
4. Se enviará un email con un enlace de invitación válido durante 72 horas

La persona invitada deberá tener una cuenta en IntelliDocs (o crearla) con ese mismo email para aceptar la invitación.

Para eliminar a un miembro, pasa el cursor sobre su nombre y haz clic en el icono de papelera. Solo el propietario del workspace puede hacerlo.

---

## Papelera

Cuando eliminas un archivo o carpeta, no se borra directamente — va a la papelera.

En *Papelera* (barra lateral) puedes:
- **Restaurar** — el archivo vuelve a su ubicación original
- **Eliminar definitivamente** — esto sí es irreversible
- **Vaciar papelera** — elimina todo de una vez

---

## Actividad

En *Actividad* puedes ver un registro de todo lo que ha pasado en el workspace: subidas, eliminaciones, cambios de nombre, miembros añadidos, etc. Es útil para saber qué ha cambiado y quién lo ha hecho.

---

## Perfil y configuración

### Cambiar nombre o foto de perfil

Haz clic en tu avatar (esquina superior derecha del header) → *Editar perfil*.

### Cambiar contraseña

Mismo sitio → *Cambiar contraseña*. Si iniciaste sesión con Google y no tienes contraseña, esta opción no estará disponible.

### Configuración del workspace

En *Configuración* (barra lateral) puedes cambiar el nombre del workspace, su imagen y ver el estado de tu plan de almacenamiento.

### Planes

En *Planes* puedes ver qué plan tienes activo y cambiar a uno superior. Los planes determinan cuánto almacenamiento y cuántos miembros puede tener el workspace.

| Plan | Almacenamiento | Miembros |
|---|---|---|
| Free | 1 GB | 5 |
| Pro | 100 GB | 25 |
| Enterprise | 1 TB | 100 |

---

## Cerrar sesión

Haz clic en tu avatar → *Cerrar sesión*.

---

## Preguntas frecuentes

**¿Qué formatos de archivo se aceptan?**
Cualquier tipo de archivo. El procesamiento de texto funciona con PDFs. Para otros formatos (Word, Excel, etc.) se guarda el archivo pero no se extrae el texto.

**¿Puedo pertenecer a varios workspaces?**
Sí. En la barra lateral, haz clic en el nombre del workspace (arriba del todo) para cambiar entre los workspaces a los que perteneces o crear uno nuevo.

**¿Qué pasa si cierro el navegador con una subida en curso?**
La subida se interrumpe. Tendrás que volver a subir el archivo.

**¿Los cambios se sincronizan en tiempo real?**
Sí. Si tienes la aplicación abierta en dos ventanas o dos personas están en el mismo workspace, los cambios aparecen al instante sin recargar la página.
