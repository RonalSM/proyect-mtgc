# Avisos de Terceros y Licencias de Software (Third-Party Notices)

Este documento contiene los avisos legales, licencias y atribuciones de componentes de código abierto y fuentes de terceros utilizados en **Mesa Virtual de Commander (MTGC)**.

---

## 1. Aviso de No Afiliación con Wizards of the Coast

**Mesa Virtual de Commander (MTGC)** es un proyecto no oficial creado por y para aficionados, permitido estrictamente de acuerdo con la **Política de Contenido de Fans de Wizards of the Coast** (Wizards of the Coast Fan Content Policy).

- Magic: The Gathering, sus expansiones, símbolos de maná, símbolos de expansión, textos de reglas, artes de cartas y mecánicas de juego son marcas registradas y propiedad intelectual exclusiva de **Wizards of the Coast LLC**, subsidiaria de Hasbro, Inc.
- Este software y sus desarrolladores **NO** están afiliados, respaldados, patrocinados ni específicamente aprobados por Wizards of the Coast LLC.

---

## 2. Mana Font

- **Autor:** Andrew Gioia (<andrew@gioia.email>)
- **Repositorio:** [https://github.com/andrewgioia/mana](https://github.com/andrewgioia/mana)
- **Licencia de Fuentes:** SIL Open Font License, Version 1.1 (SIL OFL 1.1)
- **Licencia de Código y Hojas de Estilo CSS/LESS:** MIT License

### Texto de la Licencia MIT (Mana Font CSS/Code):
```text
The MIT License (MIT)

Copyright (c) Andrew Gioia

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

### Texto de la Licencia SIL Open Font License 1.1 (Mana Font Files):
```text
SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007

PREAMBLE
The goals of the Open Font License (OFL) are to stimulate worldwide
development of collaborative font projects, to support the font creation
efforts of academic and linguistic communities, and to provide a free and
open framework in which fonts may be shared and improved in partnership
with others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The
fonts, including any derivative works, can be bundled, embedded, 
redistributed and/or sold with any software provided that any reserved
names are not used by derivative works. The fonts and derivatives,
however, cannot be released under any other type of license. The
requirement for fonts to remain under this license does not apply
to any document created using the fonts or their derivatives.

DEFINITIONS
"Font Software" refers to the set of files released by the Copyright
Holder(s) under this license and clearly marked as such. This may include
source files, build scripts and documentation.

"Reserved Font Name" refers to any names specified as such after the
copyright statement(s).

"Original Version" refers to the collection of Font Software components as
distributed by the Copyright Holder(s).

"Modified Version" refers to any derivative made by adding to, deleting,
or substituting -- in part or in whole -- any of the components of the
Original Version, by changing formats or by porting the Font Software to a
new environment.

"Author" refers to any designer, engineer, programmer, technical
writer or other person who contributed to the Font Software.

PERMISSION & CONDITIONS
Permission is hereby granted, free of charge, to any person obtaining
a copy of the Font Software, to use, study, copy, merge, embed, modify,
redistribute, and sell modified and unmodified copies of the Font
Software, subject to the following conditions:

1) Neither the Font Software nor any of its individual components,
in Original or Modified Versions, may be sold by itself.

2) Original or Modified Versions of the Font Software may be bundled,
redistributed and/or sold with any software, provided that each copy
contains the above copyright notice and this license. These can be
included either as stand-alone text files, human-readable headers or
in the appropriate machine-readable metadata fields within text or
binary files as long as those fields can be easily viewed by the user.

3) No Modified Version of the Font Software may use the Reserved Font
Name(s) unless prominent written permission is granted by the corresponding
Copyright Holder. This restriction only applies to the primary font name as
presented to the users.

4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
Software shall not be used to promote, endorse or advertise any
Modified Version, except to acknowledge the contribution(s) of the
Copyright Holder(s) and the Author(s) or with their explicit written
permission.

5) The Font Software, modified or unmodified, in part or in whole,
must be distributed entirely under this license, and must not be
distributed under any other license. The requirement for fonts to
remain under this license does not apply to any document created
using the Font Software.

TERMINATION
This license becomes null and void if any of the above conditions are
not met.

DISCLAIMER
THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
OTHER DEALINGS IN THE FONT SOFTWARE.
```

---

## 3. Keyrune Font

- **Autor:** Andrew Gioia (<andrew@gioia.email>)
- **Repositorio:** [https://github.com/andrewgioia/keyrune](https://github.com/andrewgioia/keyrune)
- **Licencia de Fuentes:** SIL Open Font License, Version 1.1 (SIL OFL 1.1)
- **Uso en MTGC:** Para evitar arrastrar obligaciones copyleft de la GPL 3.0 asociadas al código y hojas de estilo de Keyrune (`keyrune.css`), **este proyecto utiliza exclusivamente los archivos de fuente compilados de Keyrune (`.woff2`, `.woff`, `.ttf`) bajo la licencia permisiva SIL OFL 1.1**. La aplicación utiliza una hoja de estilos propia (`apps/web/src/styles/keyrune-custom.css`) con licencia MIT que mapea los códigos de set a sus glifos Unicode correspondientes. **No se distribuye, enlaza ni incluye ningún archivo de código ni CSS bajo GPL 3.0.**
- **Licencia Original de Glifos SVG y Código upstream:** GNU General Public License v3.0 (GPL 3.0) — *No utilizada en este proyecto*.

Los símbolos que representan estas fuentes identifican productos y colecciones de Wizards of the Coast conforme a la política de materiales del Wizards Play Network.

---

## 4. MTG Vectors (Investigamer)

- **Repositorio:** [https://github.com/Investigamer/mtg-vectors](https://github.com/Investigamer/mtg-vectors)
- **Licencia:** Mozilla Public License 2.0 (MPL-2.0)
- **Uso en MTGC:** Reservado exclusivamente como respaldo de vectores de símbolos de set o marcas de agua que pudiesen faltar en Keyrune. No se emplea para palabras clave ni para contadores. Los archivos y marcas se conservan sin modificaciones bajo su respectiva licencia MPL-2.0.

### Resumen de Términos MPL-2.0:
El código fuente y vectores cubiertos bajo MPL-2.0 están disponibles bajo los términos de la Mozilla Public License, v. 2.0. Una copia íntegra de la licencia puede consultarse en [https://www.mozilla.org/MPL/2.0/](https://www.mozilla.org/MPL/2.0/).

---

## 5. Scryfall API

Los datos, imágenes y dictámenes oficiales de las cartas son proporcionados de forma pública y no comercial por la API de **Scryfall** ([https://scryfall.com](https://scryfall.com)).
