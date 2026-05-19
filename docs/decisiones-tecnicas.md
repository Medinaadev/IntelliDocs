# IntelliDocs — Decisiones técnicas

Este documento explica por qué elegí cada tecnología y qué alternativas consideré. No es un listado de tecnologías, sino la justificación detrás de las elecciones.

---

## Monorepo con Turborepo

Desde el principio quería que el frontend y el backend compartiesen tipos TypeScript. Si el backend devuelve un objeto `File` con ciertos campos, el frontend tiene que saberlo, y hacerlo a mano (copiar tipos entre proyectos) es una fuente constante de bugs.

Turborepo me permite tener ambas aplicaciones en el mismo repositorio, con un paquete `@intellidocs/types` compartido. Cuando cambio un tipo en el backend, TypeScript me avisa en el frontend inmediatamente.

Consideré un repositorio separado para cada app, pero habría perdido esa sincronización y el proceso de desarrollo sería más tedioso.

---

## NestJS para el backend

La razón principal fue que quería aprenderlo. Había visto NestJS en varios proyectos y me llamaba la atención su enfoque modular, así que este proyecto fue la oportunidad para explorarlo de verdad y entender cómo funciona por dentro.

Más allá de eso, encajaba bien con lo que necesitaba: la aplicación tiene bastantes módulos (autenticación, drive, procesamiento, tiempo real, pagos...) y NestJS obliga a una estructura modular desde el principio. Con Express todo puede ir al mismo sitio y el código se vuelve difícil de mantener rápido.

NestJS usa decoradores para definir rutas, guards, interceptores y demás, lo cual hace el código más legible. Además tiene integración oficial con Passport, BullMQ y WebSockets, así que no tuve que buscar librerías de terceros para ninguna de esas partes.

---

## Prisma como ORM

Ya había usado Prisma en proyectos anteriores con Next.js, así que me sentía cómodo con él y sabía cómo funcionaba. Tenía sentido aprovecharlo en vez de aprender un ORM nuevo al mismo tiempo que aprendía NestJS.

La alternativa más obvia era TypeORM, que es el ORM más usado con NestJS. Pero Prisma genera los tipos TypeScript automáticamente a partir del esquema, lo que significa que si añado un campo a la base de datos, inmediatamente tengo el tipo actualizado en todo el proyecto sin hacer nada más. TypeORM requiere definir los modelos en clases con decoradores y sincronizarlos manualmente. Con Prisma el esquema es la única fuente de verdad.

---

## PostgreSQL + PgPubSub para el tiempo real

La idea me vino de usar Supabase en otros proyectos. Supabase tiene una funcionalidad que me parecía muy útil: te suscribes a una tabla y automáticamente recibes los cambios en tiempo real sin hacer nada especial. Quise tener lo mismo pero en mi propio backend.

Buscando cómo funcionaba por dentro encontré un proyecto en GitHub que implementaba algo parecido, aunque estaba hecho con TypeORM. Lo usé de referencia y con ayuda de IA fui adaptando e integrando la lógica a NestJS con Prisma hasta conseguir el mismo comportamiento.

El resultado es que cuando alguien sube un archivo, renombra una carpeta o añade un miembro, el resto de usuarios que tienen el workspace abierto lo ven al instante sin recargar la página, igual que en Supabase.

---

## BullMQ para el procesamiento de archivos

Cuando un usuario sube un archivo, hay que extraer el texto (si es PDF), calcular el checksum, obtener metadatos... eso puede tardar varios segundos. Si lo hiciera en el mismo hilo que responde la petición HTTP, el usuario tendría que esperar mirando la pantalla.

Con BullMQ encolo el trabajo en Redis y un worker lo procesa en segundo plano. La API responde inmediatamente con el archivo en estado `processing`, y cuando el worker termina, actualiza el estado a `ready`. El frontend lo ve en tiempo real gracias al sistema descrito arriba.


---

## TanStack Router para el frontend

Ya lo había usado en otros proyectos y me parece una de las mejores opciones para enrutamiento en React. El tipado completo de los parámetros de ruta y los search params me evita muchos errores tontos, y el enrutamiento basado en archivos hace que la estructura del proyecto sea fácil de entender de un vistazo. Una vez que lo usas es difícil volver a React Router.

---

## React Query para el estado del servidor

En vez de guardar los datos del servidor en Zustand o en el estado de React, uso TanStack React Query. La diferencia es que React Query trata los datos del servidor como una caché con tiempo de vida, no como estado local.

Cuando el sistema de tiempo real recibe un evento, simplemente llama a `queryClient.invalidateQueries(...)` y React Query refetcha automáticamente. No tengo que gestionar manualmente cuándo actualizar qué parte del estado.

---

## Zustand para el estado global

También lo había usado antes y es de mis librerías favoritas para manejar estado en React. Zustand es básicamente un store global — un objeto con datos y funciones para modificarlos — al que cualquier componente puede suscribirse desde cualquier parte de la aplicación sin necesidad de pasar props entre componentes.

Lo usé para cosas como la sesión del usuario, el workspace activo o el tema de la interfaz, que necesitan estar accesibles desde muchos sitios a la vez.

Redux hace lo mismo pero con mucho más código y ceremonia. Context API funciona para cosas simples pero tiene un problema: cuando cambia cualquier valor del contexto, todos los componentes que lo usan se re-renderizan aunque no les afecte ese cambio. Zustand permite suscribirse solo a la parte del estado que te interesa, así que cada componente solo se actualiza cuando cambia lo que realmente usa.

---

## Cloudflare R2 y MinIO para el almacenamiento

Para almacenar los archivos que suben los usuarios necesitaba un servicio de almacenamiento de objetos. El estándar del sector es Amazon S3, pero lo descarté porque cobra por el tráfico de salida, es decir, cada vez que un usuario descarga un archivo. Cloudflare R2 es compatible con la misma API que S3 — por lo que el código es idéntico — pero no cobra por ese tráfico, lo que lo hace mucho más económico para una aplicación donde los usuarios descargan documentos constantemente.

Para el entorno local uso MinIO, que es básicamente una versión de S3 que puedes levantar en tu propia máquina con Docker. También es compatible con la misma API, así que no hay ningún cambio en el código entre local y producción — solo cambia la URL y las credenciales en el archivo de entorno. Esto hace que cualquiera pueda ejecutar el proyecto sin necesidad de crear cuentas en ningún servicio externo.

---

## JWT con refresh token rotation

La autenticación usa dos tokens: un access token de corta duración (15 minutos) y un refresh token de larga duración (30 días). Cuando el access token expira, el cliente usa el refresh token para obtener uno nuevo.

Implementé refresh token rotation: cada vez que se usa un refresh token, se genera uno nuevo e invalida el anterior. Si alguien roba un refresh token y lo usa, el sistema detecta que el token original se está intentando reutilizar y revoca todas las sesiones del usuario. Esto hace el sistema más resistente a ataques de robo de tokens.

---

## Resend para emails

Ya lo había usado antes y es la opción más sencilla para enviar emails transaccionales desde una aplicación Node.js. Tiene SDK oficial en TypeScript y permite crear plantillas visuales desde el dashboard, que es lo que uso para los emails de verificación e invitaciones.

---

## Stripe para pagos

No consideré ninguna alternativa seria. Stripe es el estándar para pagos en aplicaciones web, tiene la mejor documentación del sector y el modo test permite probar el flujo completo de pagos sin dinero real. Los webhooks de Stripe permiten reaccionar a eventos (suscripción creada, pago fallido, etc.) de forma confiable.
