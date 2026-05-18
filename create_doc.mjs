import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, PageBreak, LevelFormat,
  TableOfContents
} from "docx";
import fs from "fs";

// ── helpers ──────────────────────────────────────────────────────────────────
const DARK_BLUE = "1F3864";
const ACCENT_BLUE = "2E5DA6";
const LIGHT_BLUE = "D0E2F3";
const BORDER_GRAY = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const CELL_BORDERS = {
  top: BORDER_GRAY, bottom: BORDER_GRAY,
  left: BORDER_GRAY, right: BORDER_GRAY
};
const CELL_MARGINS = { top: 100, bottom: 100, left: 150, right: 150 };

function spacer(lines = 1) {
  return Array.from({ length: lines }, () =>
    new Paragraph({ children: [new TextRun("")], spacing: { after: 0 } })
  );
}

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    pageBreakBefore: true,
    spacing: { before: 0, after: 240 },
    children: [new TextRun({ text, bold: true, size: 32, font: "Calibri", color: DARK_BLUE })]
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 160 },
    children: [new TextRun({ text, bold: true, size: 26, font: "Calibri", color: ACCENT_BLUE })]
  });
}

function heading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 120 },
    children: [new TextRun({ text, bold: true, size: 24, font: "Calibri", color: "333333" })]
  });
}

function body(runs) {
  const runObjects = runs.map(r => {
    if (typeof r === "string") return new TextRun({ text: r, size: 22, font: "Calibri" });
    return new TextRun({ size: 22, font: "Calibri", ...r });
  });
  return new Paragraph({ spacing: { after: 160 }, children: runObjects });
}

function bullet(runs, level = 0) {
  const runObjects = runs.map(r => {
    if (typeof r === "string") return new TextRun({ text: r, size: 22, font: "Calibri" });
    return new TextRun({ size: 22, font: "Calibri", ...r });
  });
  return new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { after: 100 },
    children: runObjects
  });
}

function numbered(runs, level = 0) {
  const runObjects = runs.map(r => {
    if (typeof r === "string") return new TextRun({ text: r, size: 22, font: "Calibri" });
    return new TextRun({ size: 22, font: "Calibri", ...r });
  });
  return new Paragraph({
    numbering: { reference: "numbers", level },
    spacing: { after: 100 },
    children: runObjects
  });
}

function headerCell(text, widthDXA) {
  return new TableCell({
    width: { size: widthDXA, type: WidthType.DXA },
    borders: CELL_BORDERS,
    margins: CELL_MARGINS,
    shading: { fill: DARK_BLUE, type: ShadingType.CLEAR },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, bold: true, size: 20, font: "Calibri", color: "FFFFFF" })]
    })]
  });
}

function dataCell(text, widthDXA, { bold = false, center = false, shade = false } = {}) {
  return new TableCell({
    width: { size: widthDXA, type: WidthType.DXA },
    borders: CELL_BORDERS,
    margins: CELL_MARGINS,
    shading: shade ? { fill: LIGHT_BLUE, type: ShadingType.CLEAR } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({ text, bold, size: 20, font: "Calibri" })]
    })]
  });
}

// ── PORTADA ───────────────────────────────────────────────────────────────────
function buildCover() {
  return [
    ...spacer(8),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: "IntelliDoc", bold: true, size: 64, font: "Calibri", color: DARK_BLUE })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [new TextRun({ text: "Entrega Final — Proyecto Intermodular", size: 36, font: "Calibri", color: "555555" })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: ACCENT_BLUE } },
      spacing: { before: 400, after: 200 },
      children: [new TextRun("")]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: "Mario Cuadrado Medina", bold: true, size: 28, font: "Calibri" })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: "2\u00BA DAW \u2014 Desarrollo de Aplicaciones Web", size: 24, font: "Calibri", color: "555555" })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0 },
      children: [new TextRun({ text: "Curso 2024\u20132025", size: 24, font: "Calibri", color: "555555" })]
    }),
  ];
}

// ── SECCIÓN 0: INTRODUCCIÓN ──────────────────────────────────────────────────
function buildSection0() {
  return [
    heading1("0. Introducción"),

    heading2("0.1 Descripción del Proyecto"),
    body(["IntelliDoc es una plataforma web de gestión documental empresarial basada en un modelo ",
      { text: "SaaS (Software as a Service)", bold: true },
      ", desarrollada como proyecto intermodular del ciclo formativo de ",
      { text: "Desarrollo de Aplicaciones Web (DAW)", bold: true },
      "."
    ]),
    body(["El proyecto nace de la necesidad real que tienen muchas pequeñas y medianas empresas de gestionar su documentación digital de forma centralizada, segura y eficiente, sin depender de carpetas compartidas, correos electrónicos o dispositivos de almacenamiento físico."]),
    body(["A lo largo del desarrollo se han aplicado de forma integrada los conocimientos adquiridos en los distintos módulos del ciclo: diseño de bases de datos relacionales, desarrollo frontend con frameworks modernos, construcción de APIs REST, despliegue con contenedores Docker, autenticación y seguridad web, y gestión de proyectos ágiles."]),

    heading2("0.2 Objetivos del Proyecto"),

    heading3("Objetivo General"),
    body(["Diseñar, desarrollar y desplegar ",
      { text: "IntelliDoc", bold: true },
      ", una aplicación web Full-Stack basada en arquitectura SaaS para la gestión documental empresarial, aplicando metodologías modernas de desarrollo de software, desde el análisis de requisitos hasta la implementación funcional."
    ]),

    heading3("Objetivos Específicos"),
    bullet([{ text: "API RESTful con NestJS", bold: true }, ": desarrollo del backend con Node.js + TypeScript, incluyendo autenticación JWT, OAuth con Google, RBAC y auditoría de acciones."]),
    bullet([{ text: "Frontend con React 19 + Vite", bold: true }, ": arquitectura de componentes moderna con TanStack Router, TanStack Query y Zustand."]),
    bullet([{ text: "Base de datos relacional PostgreSQL", bold: true }, " mediante el ORM Prisma, con un esquema que cubre usuarios, workspaces, documentos, versionado, roles y permisos."]),
    bullet([{ text: "Almacenamiento de ficheros con MinIO", bold: true }, " (compatible con S3) para la subida, versionado y descarga de documentos."]),
    bullet([{ text: "Comunicación en tiempo real", bold: true }, " mediante WebSockets (Socket.IO) para notificaciones y eventos dentro de los workspaces."]),
    bullet([{ text: "Entorno reproducible con Docker Compose", bold: true }, " que orquesta los servicios de base de datos (PostgreSQL), caché (Redis) y almacenamiento (MinIO)."]),
    bullet([{ text: "Gestión de suscripciones con Stripe", bold: true }, " para planes de pago por workspace."]),
    bullet([{ text: "Buenas prácticas de seguridad web", bold: true }, ": Helmet, CORS, rate limiting con Redis y encriptación de contraseñas con bcrypt."]),

    heading3("Objetivos Educativos"),
    bullet(["Integrar de forma práctica los conocimientos de todos los módulos del ciclo DAW en un proyecto real y funcional."]),
    bullet(["Demostrar capacidad para tomar decisiones de arquitectura justificadas técnicamente."]),
    bullet(["Aplicar metodología ágil (Scrum) en un proyecto individual, con sprints definidos y entregas parciales."]),
    bullet(["Desarrollar habilidades en el uso de herramientas profesionales del sector: Git, Docker, GitHub Projects."]),
  ];
}

// ── SECCIÓN 1: IDEA DE NEGOCIO ───────────────────────────────────────────────
function buildSection1() {
  // Tabla: público objetivo  (2 cols: 3800 + 5560 = 9360)
  const publicoTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [3400, 5960],
    rows: [
      new TableRow({ children: [headerCell("Perfil", 3400), headerCell("Necesidad principal", 5960)] }),
      new TableRow({ children: [dataCell("PYMEs (5–200 empleados)", 3400, { bold: true }), dataCell("Centralizar y securizar su gestión documental sin grandes inversiones en infraestructura", 5960)] }),
      new TableRow({ children: [dataCell("Empleados / usuarios finales", 3400, { bold: true }), dataCell("Acceder, subir y gestionar documentos de forma sencilla desde cualquier dispositivo", 5960)] }),
      new TableRow({ children: [dataCell("Administradores de TI", 3400, { bold: true }), dataCell("Controlar permisos, auditar acciones y gestionar el almacenamiento del workspace", 5960)] }),
      new TableRow({ children: [dataCell("Directivos", 3400, { bold: true }), dataCell("Visibilidad sobre el flujo documental y cumplimiento normativo (RGPD)", 5960)] }),
    ]
  });

  // Tabla comparativa (5 cols: 3000 + 1590 + 1590 + 1590 + 1590 = 9360)
  const tick = "\u2714";
  const cross = "\u2718";
  const compTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [3000, 1590, 1590, 1590, 1590],
    rows: [
      new TableRow({ children: [
        headerCell("Funcionalidad", 3000),
        headerCell("Alfresco", 1590),
        headerCell("M-Files", 1590),
        headerCell("Google WS", 1590),
        headerCell("IntelliDoc", 1590),
      ]}),
      ...[
        ["Gestión de documentos", tick, tick, tick, tick],
        ["Control de versiones", tick, tick, tick, tick],
        ["Clasificación por carpetas", tick, tick, tick, tick],
        ["Búsqueda avanzada", tick, tick, tick, tick],
        ["Gestión de usuarios y roles", tick, tick, tick, tick],
        ["Acceso desde cualquier dispositivo", tick, tick, tick, tick],
        ["Auditoría completa de acciones", tick, tick, cross, tick],
        ["Permisos granulares (carpeta/usuario)", tick, cross, cross, tick],
        ["Tiempo real (WebSockets)", cross, cross, cross, tick],
        ["Modelo SaaS nativo", cross, cross, tick, tick],
        ["Precio accesible para PYMEs", cross, cross, tick, tick],
        ["API REST pública", tick, tick, tick, tick],
      ].map((row, i) => new TableRow({
        children: [
          dataCell(row[0], 3000, { shade: i % 2 === 1 }),
          dataCell(row[1], 1590, { center: true, shade: i % 2 === 1 }),
          dataCell(row[2], 1590, { center: true, shade: i % 2 === 1 }),
          dataCell(row[3], 1590, { center: true, shade: i % 2 === 1 }),
          dataCell(row[4], 1590, { center: true, shade: i % 2 === 1, bold: true }),
        ]
      }))
    ]
  });

  return [
    heading1("1. La Idea de Negocio"),

    heading2("1.1 Descripción de la Idea"),

    heading3("Problema que resuelve"),
    body(["En muchas pequeñas y medianas empresas, la gestión de documentos digitales sigue realizándose de forma desorganizada, apoyándose en sistemas no diseñados para ello: carpetas compartidas en red, adjuntos por correo electrónico o almacenamiento en dispositivos físicos. Esta situación genera problemas concretos y costosos:"]),
    bullet([{ text: "Pérdida de tiempo", bold: true }, ": los empleados dedican una media de 2,5 horas diarias a buscar documentos (IDC, 2020)."]),
    bullet([{ text: "Falta de control de versiones", bold: true }, ": sin un sistema estructurado, es habitual trabajar con versiones desactualizadas, generando errores o duplicidades."]),
    bullet([{ text: "Acceso limitado", bold: true }, ": el trabajo remoto se convierte en un obstáculo cuando los documentos residen en servidores locales o dispositivos físicos."]),
    bullet([{ text: "Seguridad insuficiente", bold: true }, ": la ausencia de control de accesos granular expone información confidencial, incumpliendo el RGPD."]),
    bullet([{ text: "Sin trazabilidad", bold: true }, ": no existe registro de quién ha accedido, modificado o eliminado un documento, imposibilitando auditorías."]),

    heading3("Solución propuesta"),
    body([{ text: "IntelliDoc", bold: true }, " es una plataforma SaaS de gestión documental que permite a las empresas:"]),
    bullet([{ text: "Centralizar", bold: true }, " toda su documentación en un único espacio organizado por workspaces."]),
    bullet([{ text: "Controlar el acceso", bold: true }, " a través de un sistema de roles y permisos granular por workspace, carpeta e incluso usuario individual."]),
    bullet([{ text: "Versionar documentos", bold: true }, " automáticamente: cada subida genera una versión inmutable, con acceso al historial completo."]),
    bullet([{ text: "Auditar", bold: true }, " todas las acciones realizadas: subidas, modificaciones, eliminaciones y accesos."]),
    bullet([{ text: "Trabajar en tiempo real", bold: true }, " con notificaciones instantáneas via WebSockets."]),
    bullet([{ text: "Escalar", bold: true }, " bajo un modelo de suscripción SaaS, sin infraestructura propia."]),

    heading3("Público objetivo"),
    ...spacer(1),
    publicoTable,
    ...spacer(1),

    heading2("1.2 Principales Competidores"),

    body([{ text: "Alfresco Content Services", bold: true }, ": plataforma ECM de código abierto orientada a grandes empresas. Ofrece control de versiones y flujos de trabajo, pero su complejidad de implementación y coste de licencias la hacen inaccesible para la mayoría de PYMEs."]),
    body([{ text: "M-Files", bold: true }, ": sistema de gestión documental basado en metadatos. Muy potente para clasificación y búsqueda, pero con curva de aprendizaje elevada y precios enterprise."]),
    body([{ text: "Google Workspace (Drive)", bold: true }, ": suite de productividad con alta adopción. Accesible y familiar, pero carece de auditoría detallada, versionado avanzado y control de permisos granular a nivel de carpeta."]),

    heading3("Tabla Comparativa de Funcionalidades"),
    ...spacer(1),
    compTable,
    ...spacer(1),

    heading2("1.3 Ventajas Competitivas y Valor Diferencial"),
    body(["IntelliDoc se posiciona en el espacio entre la sencillez de Google Workspace y la potencia de Alfresco, siendo la opción más completa y accesible para PYMEs:"]),
    numbered([{ text: "Modelo SaaS nativo y asequible", bold: true }, ": diseñado para que cualquier PYME pueda empezar sin instalaciones ni infraestructura propia, con planes de suscripción escalables."]),
    numbered([{ text: "Sistema de permisos dual y granular", bold: true }, ": combina permisos basados en roles (heredados en la jerarquía de carpetas) con permisos de usuario específicos que pueden sobreescribir los del rol. Ningún competidor analizado ofrece esta granularidad."]),
    numbered([{ text: "Tiempo real nativo (WebSockets)", bold: true }, ": notificaciones instantáneas de cambios en documentos compartidos mediante Socket.IO, sin necesidad de recargar la página."]),
    numbered([{ text: "Auditoría completa desde el primer día", bold: true }, ": registro automático de todas las acciones del sistema, facilitando el cumplimiento del RGPD y auditorías internas."]),
    numbered([{ text: "Versionado inmutable de archivos", bold: true }, ": cada versión se almacena con una clave única e inmutable en MinIO. El historial completo siempre está disponible."]),
    numbered([{ text: "Interfaz moderna y accesible", bold: true }, ": construida con React 19, shadcn/ui y Tailwind CSS, priorizando la usabilidad y reduciendo la curva de aprendizaje."]),
  ];
}

// ── DOCUMENTO ─────────────────────────────────────────────────────────────────
const doc = new Document({
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "\u2022",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      },
      {
        reference: "numbers",
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: "%1.",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      }
    ]
  },
  styles: {
    default: {
      document: { run: { font: "Calibri", size: 22 } }
    },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Calibri", color: DARK_BLUE },
        paragraph: { spacing: { before: 0, after: 240 }, outlineLevel: 0 }
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Calibri", color: ACCENT_BLUE },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 }
      },
      {
        id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Calibri", color: "333333" },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 }
      },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 }, // A4
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: ACCENT_BLUE, space: 1 } },
          alignment: AlignmentType.RIGHT,
          spacing: { after: 120 },
          children: [
            new TextRun({ text: "IntelliDoc \u2014 Entrega Final Proyecto Intermodular", size: 18, font: "Calibri", color: "555555" }),
            new TextRun({ text: "    Mario Cuadrado Medina", size: 18, font: "Calibri", color: "555555", bold: true }),
          ]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          border: { top: { style: BorderStyle.SINGLE, size: 6, color: ACCENT_BLUE, space: 1 } },
          alignment: AlignmentType.CENTER,
          spacing: { before: 120 },
          children: [
            new TextRun({ text: "P\u00e1gina ", size: 18, font: "Calibri", color: "777777" }),
            new TextRun({ children: [PageNumber.CURRENT], size: 18, font: "Calibri", color: "777777" }),
            new TextRun({ text: " de ", size: 18, font: "Calibri", color: "777777" }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, font: "Calibri", color: "777777" }),
          ]
        })]
      })
    },
    children: [
      ...buildCover(),
      new Paragraph({ children: [new PageBreak()] }),
      ...buildSection0(),
      ...buildSection1(),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("C:/Users/Medinaa/Desktop/IntelliDocs/IntelliDoc_EntregaFinal.docx", buffer);
  console.log("Documento creado correctamente.");
}).catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
