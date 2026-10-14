# Phrase boosting — fp16, Beam Width 1 (14 oktober 2026)

Dit is **test B** van onze Nederlandse D&D-transcriptiebenchmark, vergeleken met de [bestaande fp16-baseline zonder boosting](../2026-10-14/README.md).

## Originele exports

- [wer.json](wer.json) — volledig, onbewerkt `parakeet-web-custom-mp3-wer (1).json`, inclusief ruwe modeltranscriptie.
- [benchmark.json](benchmark.json) — volledig, onbewerkt `logs.json`, dat in werkelijkheid een Parakeet Web-**benchmarkrapport** is.
- [Beoogde lijst met 11 phrases](../phrase-boosting-test-b.txt).

## Configuratie en betrouwbaarheid

Parakeet Web **11.4.0**, model `Olicorne/parakeet-tdt-0.6b-v3-ultra-onnx`, backend **WebGPU-hybrid fp16**, **boosting actief**, **boost strength 1**, **Beam Width 1**, 4 CPU-threads, parallel encoding en 60-secondenchunking aan. Long Audio Profile **uit**. Eén geslaagde meetrij (`warmup: true`, `repeats: 1`).

Audio volgens export: `dnd-demo.mp3`, **3.409.388 bytes**, **209,43 seconden**, net als bij de baseline. Zonder audiobestand/hash zijn identieke audio-inhoud en een volledig letterlijke voorlezing niet onafhankelijk geverifieerd (`verifiedAgainstActualRecording: false`). De WER-referentie is dezelfde, met **529** genormaliseerde woorden.

**Beperking:** `benchmark.json` bevestigt dat boosting **aan** was, maar bevat **niet** de werkelijk geladen phrases of de min-p-instelling. De 11-termige lijst en min-p **0.1** waren de afgesproken instellingen, niet iets wat uit deze export bewijsbaar is. Ook `clip.source=JFK` is onjuiste ingebouwde metadata: het testfragment werd via de console vervangen.

## Resultaten

| Metriek | Zonder boosting | Met boosting | Verschil |
|---|---:|---:|---:|
| **WER** | **13,80%** | **13,04%** | **−0,76 procentpunt** |
| Substituties | 59 | 58 | −1 |
| Weglatingen | 10 | 7 | −3 |
| Toevoegingen | 4 | 4 | 0 |
| **Woordfouten** | **73** | **69** | **−4** |
| Aanvullende getalgenormaliseerde WER | 10,21% | 9,45% | −0,76 procentpunt |

De aanvullende getalnormalisatie gebruikt dezelfde beperkte omzetting van Nederlandse losse getalwoorden naar cijfers als de baseline. Ze verwijdert bij beide runs **19** fouten: 54 → 50. Geen andere normalisatie of eigennamencorrecties.

### Wat verandert werkelijk in de ruwe transcriptie?

Na lowercase- en leestekennormalisatie zijn er **slechts drie** verschillen, allemaal woordscheiding:

| Referentieterm | Baseline | Met boosting | Effect |
|---|---|---|---|
| `healing potion` | `healingpotion` | `healing potion` | 2 fouten minder |
| `Mage Hand` (eerste keer) | `magehand` | `mage hand` | 2 fouten minder |
| `Nerin Vale` (eerste keer) | `nerenveil` | `neren veil` | 0 fouten minder: naam nog verkeerd |

**Alle overige genormaliseerde herkenningstekst is identiek.** De totale WER-verbetering komt dus uit twee juiste woordgrenzen, niet uit het corrigeren van de belangrijkste namen.

### Letterlijk correcte doeltermen

| Phrase | Referentie | Zonder | Met boosting |
|---|---:|---:|---:|
| `Grijzehaven` | 3 | 0 | 0 |
| `Het Koperen Hert` | 1 | 0 | 0 |
| `Edda Voss` | 1 | 0 | 0 |
| `Nerin Vale` | 2 | 0 | 0 |
| `Veyra` | 2 | 0 | 0 |
| `Perception check` | 1 | 1 | 1 |
| `Insight check` | 1 | 0 | 0 |
| `Stealth check` | 1 | 0 | 0 |
| `modifier` | 2 | 1 | 1 |
| `healing potion` | 1 | 0 | 1 |
| `Mage Hand` | 2 | 1 | 2 |

De namen **Edda Voss**, **Nerin Vale**, **Veyra** en **Grijzehaven** blijven onjuist. Ook `Insight check → inside check`, `Stealth check → stijlcheck`, `modifier → motherfire` en de betekenisvolle vergissing `gewond → gewoon` blijven staan. Het experiment toont **beperkte verbetering in woordsegmentatie**, maar geen overtuigend effect op de belangrijkste inhoudelijke ASR-fouten.

## Snelheid

Het benchmarkrapport meet **7,594 s** verwerking voor 209,43 s audio (~**27,6× realtime**) met **61,026 s model-laadtijd**, `loadCached=false`. De WER-baseline heeft geen gekoppelde, rechtstreeks vergelijkbare meting in de behouden bestanden. Uit één run kunnen we **geen snelheidswinst door phrase boosting** afleiden.

## Vervolg

**Test C:** dezelfde opname, **dezelfde woordenlijst** en boost strength **1**, met alleen **Beam Width 5** in plaats van 1. Exporteer opnieuw zowel WER-transcriptie als benchmarkrapport. Let op de foutieve namen en skilltermen én mogelijke nieuwe hallucinerende woordtoevoegingen.
