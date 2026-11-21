# Pitch: Lectura fácil para cualquier papel (5 minutos)

Spoken script in Spanish for the live pitch on 2026-11-21 at 12:00 (UTC-5). Lines marked **[CORTE 3 MIN]** are dropped to fit 3 minutes. Every number cites its source at the end; do not add numbers that are not listed there. The demo steps follow `docs/demo-runbook.md`.

Roles: **P** = presenter (talks), **O** = operator (holds the phone, mirrored on the screen).

---

## 1. Problema (0:00 – 0:45)

**P:** Imaginen recibir un papel que no pueden leer: un aviso del gobierno, una receta, una invitación.

**P:** En México, 7.3 millones de personas hablan una lengua indígena. 866 mil no hablan español. [1]

**P:** El maya es la segunda lengua indígena del país: 774 mil hablantes. [1][2]

**P:** Y esos papeles llegan en un español difícil, de oficina. **[CORTE 3 MIN]** Una de cada cinco personas hablantes de lengua indígena no sabe leer. [3] **[/CORTE]**

**P:** Las personas mayores tampoco tienen fácil el camino digital: solo 3 de cada 10 personas de 75 años o más usan internet. [4]

**P:** Si no entienden el papel, pierden la fecha, pagan recargos o no reciben lo que les toca.

## 2. Demo en vivo (0:45 – 3:15)

**P:** Esta es la app. No pide cuenta ni contraseña. Tiene un solo botón.

**O:** Toca "Tome una foto de su papel". La app explica en voz alta para qué quiere la cámara. Toma la foto del aviso impreso.

**P:** El aviso es ficticio. Nunca usamos documentos reales.

**O:** Aparecen el tipo de papel y las tarjetas.

**P:** Primero dice qué tipo de papel es: un trámite. Por eso avisa: "Esto no es asesoría legal".

**P:** Cada tarjeta es una sola idea, en frases cortas y con "usted". Fecha, monto, lugar, qué llevar.

**O:** Toca "¿De dónde salió?" en la tarjeta de la fecha.

**P:** Cada dato muestra la frase exacta del papel de donde salió. Si la inteligencia artificial no puede señalar la frase, el dato no se muestra.

**O:** Toca "Cambiar idioma" y elige "Maaya t'aan".

**P:** Ahora cada tarjeta trae el maya, y el español sigue arriba, siempre.

**O:** Toca "Escuchar" en la tarjeta del monto, en maya.

**P:** La voz en maya es automática. Por eso la etiquetamos: "Voz automática, sin revisar".

**[CORTE 3 MIN]**

**O:** Baja a la propuesta del asistente.

**P:** El asistente propone qué llevar y cuándo ir. Lee la propuesta en voz alta. No hace nada solo.

**O:** Toca el botón grande "Sí, recuérdeme".

**P:** Solo después del "Sí", el teléfono avisa un día antes y el mismo día en la mañana.

**O:** Toma la foto de la invitación impresa (solo en vivo; en modo grabado se omite).

**P:** No es solo para trámites. Esta es una invitación a una reunión de vecinos: la app la reconoce como "Reunión" y propone el recordatorio.

**[/CORTE]**

## 3. Cómo funciona (3:15 – 4:00)

**P:** La foto va a una laptop del equipo, no a la nube del teléfono. **[CORTE 3 MIN]** No guardamos llaves en el teléfono: las credenciales de Google viven solo en la laptop. **[/CORTE]**

**P:** Gemini lee el papel, decide de qué tipo es y extrae los datos, cada uno con su cita literal. Una regla del código descarta lo que no tenga cita.

**P:** Cloud Translation lo pasa a maya, y Gemini le pone voz. El español también lo lee una voz automática en la laptop. Si falla, habla una voz en español del teléfono.

**P:** El asistente usa herramientas, pero el código solo las ejecuta con un "Sí".

## 4. Límites y siguiente paso (4:00 – 5:00)

**P:** Somos honestos con los límites. No tenemos todavía una persona hablante de maya en el equipo. El maya y su voz son automáticos y van marcados "sin revisar".

**P:** Cada pantalla avisa según el papel: en trámites, que no es asesoría legal; en salud, que no sustituye al médico; en todo lo demás, que revise el papel original.

**P:** Lo siguiente: que hablantes de maya revisen las frases, y llevar el mismo flujo al náhuatl, la lengua indígena más hablada. [1]

**P:** Queremos que ningún papel sea un muro. Que se pueda escuchar, entender y cumplir a tiempo. Gracias.

---

## If something fails on stage

- **No network or Google down:** O switches the laptop to replay mode before the pitch (see the runbook). The app shows "Respuesta grabada"; P says: "Esta es una respuesta grabada hoy con el mismo aviso; la red del evento no nos dejó hacerla en vivo."
- **Camera does not focus:** O retakes once; if it fails again, P says the error the app shows ("No se ve bien la foto. Tome otra con más luz.") is part of the design, and O uses the replay laptop.
- Never claim the Maya is reviewed, that the app is official, or a number that is not in the sources below.

## Sources

1. INEGI, Comunicado 430/22, "Estadísticas a propósito del Día Internacional de los Pueblos Indígenas", 2022, pp. 2–3 (Censo 2020): "7 364 645 personas de tres años y más hablantes de alguna lengua indígena … 866 mil (11.8 %), no [hablaban español]"; "Las más frecuentes son náhuatl (22.4 %), maya (10.5 %) y tseltal (8.0 %)". https://www.inegi.org.mx/contenidos/saladeprensa/aproposito/2022/EAP_PueblosInd22.pdf
2. INEGI Cuéntame, "Lenguas indígenas y hablantes de 3 años y más, 2020": "Maya … 774,755". Archived copy (the live page did not load): https://web.archive.org/web/20221201161756/https://cuentame.inegi.org.mx/hipertexto/todas_lenguas.htm
3. INEGI, Comunicado 430/22, p. 6: "la población de 15 años y más, hablante de lengua indígena, registró una tasa de analfabetismo de 20.9 por ciento". Same URL as [1].
4. INEGI, ENDUTIH 2025, Reporte de resultados 19/26 (2026), p. 5: "los grupos de 65 a 74 años y el de 75 años y más registraron los menores porcentajes de uso, con 57.8 y 30.3, respectivamente". https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2026/endutih/ENDUTIH_25_RR.pdf
