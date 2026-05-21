// ================= IMPORTACIONES =================
const path = require("path");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ================= MULTER =================
const upload = multer({ dest: "uploads/" });

// ================= BASE DE CONOCIMIENTO =================
let baseConocimiento = [];

// ================= PROCESAR TXT =================
function procesarTXT(ruta) {

    const texto = fs.readFileSync(ruta, "utf8");

    // separar por bloques
    const bloques = texto.split(/\n\s*\n/);

    baseConocimiento = bloques
        .map(b => b.trim())
        .filter(b => b.length > 20);

    console.log("✅ Base cargada:", baseConocimiento.length, "bloques");
}

// ================= SUBIR TXT =================
app.post("/subir-txt", upload.single("archivo"), (req, res) => {

    if (!req.file) {

        return res.status(400).json({
            error: "No se envió archivo"
        });

    }

    procesarTXT(req.file.path);

    res.json({
        mensaje: "TXT cargado correctamente",
        bloques: baseConocimiento.length
    });

});

// ================= LIMPIAR TEXTO =================
function limpiar(texto) {

    return texto
        .toLowerCase()

        // quitar signos
        .replace(/[¿?¡!.,:;]/g, "")

        // sinónimos
        .replace(/tec/g, "tecnologico")
        .replace(/itp/g, "tecnologico")
        .replace(/direccion/g, "ubicacion")

        // quitar palabras basura
        .replace(
            /\b(cuando|como|donde|que|cual|para|porque|por|del|de|la|el|los|las|una|unos|unas|y|en|a|es|son|al|se|me|mi|esta|este|hay)\b/g,
            ""
        )

        // espacios dobles
        .replace(/\s+/g, " ")

        .trim();
}

// ================= BUSCAR RESPUESTA =================
function buscarRespuesta(pregunta) {

    const limpia = limpiar(pregunta);

    const palabras = limpia
        .split(" ")
        .filter(p => p.length > 2);

    let mejor = null;
    let mejorScore = 0;

    baseConocimiento.forEach(bloque => {

        const lineas = bloque.split("\n");

        // 🔥 PRIMERA LÍNEA = PALABRAS CLAVE
        const claves = lineas[0].toLowerCase();

        let score = 0;

        palabras.forEach(palabra => {

            // 🔥 buscar SOLO en palabras clave
            if (claves.includes(palabra)) {
                score += 5;
            }

        });

        // 🔥 bonus por frase exacta
        if (claves.includes(limpia)) {
            score += 10;
        }

        if (score > mejorScore) {

            mejorScore = score;
            mejor = bloque;

        }

    });

    // si no encontró nada
    if (mejorScore === 0) {
        return null;
    }

    return mejor;
}

// ================= RESPUESTA HUMANA =================
function hacerRespuestaHumana(texto) {

    if (!texto) {
        return "No encontré información clara.";
    }

    // separar líneas
    let lineas = texto.split("\n");

    // 🔥 quitar palabras clave
    lineas.shift();

    texto = lineas.join("\n").trim();

    // devolver listas completas
    if (
        texto.toLowerCase().includes("debes") ||
        texto.toLowerCase().includes("documentos") ||
        texto.toLowerCase().includes("requisitos") ||
        texto.includes("\n")
    ) {

        return texto;
    }

    // limpiar espacios
    texto = texto.replace(/\s+/g, " ");

    // resumir
    const frases = texto
        .split(".")
        .map(f => f.trim())
        .filter(f => f.length > 10);

    let respuesta =
        frases.slice(0, 3).join(". ");

    if (!respuesta.endsWith(".")) {
        respuesta += ".";
    }

    return respuesta;
}

// ================= RUTA PRINCIPAL =================

// ================= CHAT =================
app.post("/chat", (req, res) => {

    try {

        // validar base
        if (baseConocimiento.length === 0) {

            return res.json({
                respuesta:
                "Primero sube un archivo TXT desde Postman."
            });

        }

        const pregunta = req.body.mensaje;

        // validar pregunta
        if (!pregunta) {

            return res.json({
                respuesta:
                "No recibí ninguna pregunta."
            });

        }

        console.log("📩 Pregunta:", pregunta);

        // buscar respuesta
        const bloque = buscarRespuesta(pregunta);

        // si no encontró
        if (!bloque) {

            return res.json({
                respuesta:
                "No encontré información relacionada. Intenta con otras palabras."
            });

        }

        // generar respuesta limpia
        const respuesta =
        hacerRespuestaHumana(bloque);

        console.log("🤖 Respuesta enviada");

        // responder
        res.json({ respuesta });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            respuesta:
            "Ocurrió un error en el servidor."
        });

    }

});

// ================= SERVIDOR =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log("🚀 Servidor corriendo en:");
    console.log(`http://localhost:${PORT}`);

});
