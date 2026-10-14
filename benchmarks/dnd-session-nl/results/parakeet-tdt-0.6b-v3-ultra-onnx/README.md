# Parakeet TDT 0.6B v3 Ultra — Nederlandse D&D-transcriptie

**Voorlopige conclusie:** op onze opgenomen D&D-scène is **WebGPU fp16 met phrase boosting, Beam Width 5 en Boost Strength 1** de interessantste configuratie. Ze verlaagt de WER van **13,80% naar 12,29%** ten opzichte van fp16 zonder boosting en verwerkt ruim drie minuten audio in ongeveer **9,5 seconden**. De belangrijkste winst is dat *Veyra* tweemaal juist wordt herkend. De overige personagenamen en enkele verhaalfeiten blijven kwetsbaar.

Dit is een resultaat op **één bekende opname**, geen bewezen beste instelling voor alle D&D-sessies. Vooral de fout **‘gewond’ → ‘gewoon’** maakt duidelijk waarom een lagere WER op zichzelf onvoldoende is voor betrouwbare notities.

## Wat hebben we gemeten?

We vergeleken [Parakeet Web](https://parakeetweb.olicorne.org/) 11.4.0 met model `Olicorne/parakeet-tdt-0.6b-v3-ultra-onnx` op `dnd-demo.mp3`: **209,43 seconden** Nederlandstalige D&D-dialogen, met Engelse speltermen, plaatsnamen en personages. De [referentie](../../reference.md) omvat **529 woorden** na de gebruikte tokennormalisatie. Alle gerichte vervolgtests gebruiken **WebGPU-hybrid fp16**, dezelfde beoogde audio, en de [11 phrase-boosting-termen](phrase-boosting-test-b.txt).

### WER en instellingen

| Experiment | Beam | Boosting | WER | Woordfouten | WER na getalnormalisatie¹ | Transcriptietijd² |
|---|---:|---|---:|---:|---:|---:|
| [Baseline, fp16](baseline-no-boosting/README.md) | 1 | uit | 13,80% | 73 | 10,21% | niet opgeslagen |
| [Boosting, Beam 1](boosting-beam1-strength1/README.md) | 1 | strength 1 | 13,04% | 69 | 9,45% | 7,594 s |
| [**Boosting, Beam 5**](boosting-beam5-strength1/README.md) | **5** | **strength 1** | **12,29%** | **65** | **8,70%** | **9,544 s** |
| [Boosting, Beam 5](boosting-beam5-strength2/README.md) | 5 | strength 2 | 12,29% | 65 | 8,70% | 9,861 s |

¹ **Eigen aanvullende normalisatie**, niet de WER uit de export: losse Nederlandse getalwoorden worden gelijkgetrokken met cijfers (bijvoorbeeld `negen` en `9`). Het verlaagt het aantal getelde fouten in de beste configuratie van **65 naar 46**, zonder de onderlinge rangorde te veranderen.

² Gemeten wall-clock transcriptietijd, **exclusief model laden**. De drie vervolgtests hebben elk maar één getimede herhaling; de verschillen zijn dus indicatief, niet statistisch vastgesteld. Bij Beam 5/strength 1 is de verwerking ongeveer **22× sneller dan de duur van de audio**.

### Wat zegt de baseline over de backend en quantisatie?

De eerste proef zonder boosting vergeleek **zes** configuraties. WebGPU fp16 haalde de laagste WER (**13,80%**); WASM int8 volgde met **14,37%**, beide fp32-varianten met **14,56%**, WebGPU w4a8 met **15,88%** en WASM w4a8 met **16,45%**. De volledige transcripties van **WASM fp32 en WebGPU fp32 waren exact gelijk**. Daarom kozen we fp16 voor de gerichte boostingproeven; één opname volstaat niet om de andere varianten algemeen af te schrijven.

## Welke ingreep hielp, en waarom?

- **Phrase boosting bij Beam 1:** vier woordfouten minder (73 → 69), maar uitsluitend doordat `healingpotion` → `healing potion` en `magehand` → `Mage Hand` correct als twee woorden verschenen. De NPC-namen werden niet correcter.
- **Beam Width 1 → 5 met dezelfde boosting:** opnieuw vier fouten minder (69 → 65). Nu werd **`Veyra` tweemaal correct** in plaats van `Veira`. De twee andere weggevallen fouten betreffen kleine woordvorm-/segmentatieverschillen en geen nieuwe verhaalfeiten.
- **Boost Strength 1 → 2 bij Beam 5:** **geen enkele verandering**. De volledige ruwe transcripties van de twee runs zijn byte voor byte identiek, inclusief de overblijvende fouten. Hogere strength is dus voor dit fragment geen verbetering.
- **Kosten van Beam 5:** 9,544 s tegenover 7,594 s bij Beam 1: circa **26% hogere walltime** in deze afzonderlijke metingen, nog steeds ruim sneller dan realtime. Dit bewijst geen precieze gemiddelde vertraging.

### De fouten die voor sessienotities blijven tellen

| Bedoeld in de scène | Nog steeds herkend als | Risico voor D&D Notulist |
|---|---|---|
| **Edda Voss** | `Wardin en Alfos` (naamcontext) | Verkeerde of verdwenen NPC-identiteit |
| **Nerin Vale** | `Neren Veil`, `neren veel` | Questpersoon is moeilijk te koppelen aan eerdere notities |
| **Grijzehaven** | `Grijze haven`, op het einde `grijze haar` | Plaatsnaam inconsistent |
| **Insight check** | `inside check` | Skillnaam verandert in een gewone Engelse uitdrukking |
| **Stealth check** | `stijlcheck` | D&D-regelterm ontbreekt |
| **gewond** | **`gewoon`** | **Betekenisfout:** de gevonden NPC lijkt niet gewond |

Daar staat tegenover dat belangrijke gebeurtenissen **grotendeels** herkenbaar blijven: de correctie van het *gouden medaillon* naar de *zilveren sleutel*, het ongeopend laten van de kist en de keuze om geen gevecht te beginnen. Dat betekent nog niet dat een samenvattend taalmodel daar steeds juiste notities van zal maken: **feitgetrouwheid van notities is een aparte test**.

## Wat mogen we nog niet concluderen?

- De tests draaien op één **vooraf bekende** D&D-opname. De 11 gebooste termen werden gekozen na inspectie van de fouten op precies die opname. Dat maakt dit een gerichte verbetering, geen onafhankelijke validatie op onbekende namen.
- De referentie is het **bedoelde voorleesscript**, geen aan de opname gecontroleerde letterlijke transcriptie (`verifiedAgainstActualRecording: false`). WER blijft daardoor **voorlopig**.
- Van het MP3-bestand hebben we in de exports wel naam en grootte, maar **geen audiocontrolehash**; identieke audio-inhoud tussen runs is niet onafhankelijk bewezen.
- De benchmarkexports vermelden wel of phrase boosting actief was, de strength en de Beam Width, maar **niet** de echt geladen phrases of min-p. De [woordenlijst](phrase-boosting-test-b.txt) en min-p `0.1` komen uit het afgesproken protocol.
- De oorspronkelijke Parakeet-benchmarkcode noemt bij onze vervangen MP3 ten onrechte **JFK** als `clip.source`. Dat is *verkeerde metadata*, geen resterende JFK-test. De ruwe exports bewaren we ongewijzigd.

## Betekenis voor de volgende iteratie

**Voorlopig testen met fp16 + Beam 5 + Strength 1**, maar niet verder blijven optimaliseren op deze ene tekst. De nuttigste volgende proef is een **nieuwe, ongeziene D&D-opname**, met een achteraf gecontroleerd letterlijk transcript. Vergelijk dan enerzijds **WER en eigennamen**, en anderzijds of de notulist **personen, beslissingen, voorwerpen en toestanden** correct als sessienotities vastlegt.

De individuele experimenten bevatten telkens de gedetailleerde analyse en originele JSON-exports. Voor reproductie zijn er ook het [consolehulpscript](custom-audio-expected-console.js) en de [boostinglijst](phrase-boosting-test-b.txt); beide behoren bij **Parakeet Web** en niet bij de eigen Notulist-inferentie.
