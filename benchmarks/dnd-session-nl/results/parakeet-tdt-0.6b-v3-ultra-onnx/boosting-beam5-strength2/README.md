# Test D — Boost Strength 2, Beam Width 5 (14 oktober 2026)

## Kernresultaat: identieke transcriptie

Bij de test met boost strength **2** en beam width **5** is de herkende transcriptie **letterlijk identiek (volledige string gelijk)** aan [test C met strength 1](../boosting-beam5-strength1/README.md), met hetzelfde aantal woordfouten. **Er is dus geen aantoonbare kwaliteitswinst** in deze opname door de boost strength van 1 naar 2 te verhogen.

## Originele uploads

- [**wer.json**](wer.json) — ongewijzigde upload `parakeet-web-custom-mp3-wer-beam5-strength2.json`, inclusief volledige ruwe transcriptie.
- [**benchmark.json**](benchmark.json) — ongewijzigde upload `benchmark-beam5-strength2.json`, inclusief verwerkingstijd en configuratie.
- Vergelijkingsbasis: [**test C (strength 1)**](../boosting-beam5-strength1/README.md); oorspronkelijke [**baseline zonder boosting**](../baseline-no-boosting/README.md).
- Beoogde woordenlijst: [**11 custom phrases**](../phrase-boosting-test-b.txt).

De bronbestanden werden bij het committen **byte-voor-byte** gecontroleerd aan de hand van hun Git-blobhashes. SHA-256 van de originele uploads: WER `ee9a09bcbcb171b631487cd7e61fd57dc0632f60360c25421a01e721105e9685`; benchmark `617d0f0827180703a4b88c287a1d320479461e0b81cdd98408b7463cd90c5f04`.

## Instellingen

- App **Parakeet Web 11.4.0**, model `Olicorne/parakeet-tdt-0.6b-v3-ultra-onnx`, backend **webgpu-hybrid:fp16**.
- `phraseBoostActive: true`, **boostStrength: 2**, **beamWidth: 5**. Overige geëxporteerde instellingen: 4 WASM-threads, parallel encoding aan, chunks van 60 seconden.
- **Long Audio Profile uit**, één warmup en één getimede verwerking.
- Audio: `dnd-demo.mp3`, **3.409.388 bytes**, volgens rapport **209,43 seconden**, dezelfde naam en bestandsgrootte als test C. Omdat de daadwerkelijke audio niet is bijgevoegd en een audiohash ontbreekt, blijft byte-identiteit van de opname onbewezen.
- De WER-referentie en modelconfiguratie zijn gelijk aan die van test C; **529 referentiewoorden**. `verifiedAgainstActualRecording: false`; de letterlijke voorlezing is niet onafhankelijk gecontroleerd.
- Let op: de benchmark meldt onterecht `clip.source: John F. Kennedy` omdat onze DevTools-helper de audio vervangt maar die metadata niet wijzigt. De werkelijke benchmark is de D&D-MP3.
- De JSON bevestigt wel dat boosting **aan** stond, maar bevat **niet** de inhoud van de 11 frases of het min-p-niveau. Het werkelijk geladen lexicon/min-p 0,1 kunnen dus niet uit de export worden bewezen.

## Resultaten: vier vergelijkbare nauwkeurigheidsmetingen

| Experiment | Beam Width | Boost Strength | Fouten (S/D/I) | WER | Getalgenormaliseerde WER¹ |
|---|---:|---:|---:|---:|---:|
| Baseline, boosting uit | 1 | uit | 73 (59/10/4) | 13,80% | 10,21% |
| Test B, boosting aan | 1 | 1 | 69 (58/7/4) | 13,04% | 9,45% |
| Test C, boosting aan | 5 | 1 | **65 (55/6/4)** | **12,29%** | **8,70%** |
| **Test D, boosting aan** | **5** | **2** | **65 (55/6/4)** | **12,29%** | **8,70%** |

¹ Aanvullende, beperkte normalisatie van losse Nederlandse getalwoorden naar cijfers, identiek aan de [baselineanalyse](../baseline-no-boosting/README.md). Omdat test C en D letterlijk dezelfde herkende tekst én referentie hebben, is ook deze afgeleide score noodzakelijk gelijk (**46 woordbewerkingen op 529 woorden**).

## Belangrijkste betekenisvolle fouten blijven aanwezig

De ruwe transcriptie is identiek aan test C. Daardoor worden **Veyra** (beide voorkomens), **healing potion** en **Mage Hand** nog altijd correct herkend, maar blijven dezelfde knelpunten over:

| Referentie | Herkend in zowel test C als D | Betekenis voor D&D Notulist |
|---|---|---|
| `Edda Voss` | `en Alfos` in de naamcontext | NPC-identiteit ontbreekt |
| `Nerin Vale` | `Neren Veil`, `neren veel` | Eigennamen niet stabiel/correct |
| `Grijzehaven` | `Grijze haven`, ook `grijze haar` | Plaatsnaam niet betrouwbaar |
| `Insight check` | `inside check` | D&D-skill wordt gewoon Engels |
| `Stealth check` | `stijlcheck` | D&D-skill gaat verloren |
| `gewond` | `gewoon` | **Een cruciaal verhaalfeit verandert** |

Een sterkere bias van 1 naar 2 kan de tokenkansen beïnvloeden zonder de uiteindelijk gekozen woorden te wijzigen. De identieke tekst bewijst daarom alleen dat **deze instelling voor deze opname geen uitvoerverandering veroorzaakt**, niet dat de interne boosting geen effect heeft.

## Verwerkingssnelheid

| Metriek | Test C: Strength 1 | Test D: Strength 2 |
|---|---:|---:|
| Verwerking van 209,43 s audio | **9,544 s** | **9,861 s** |
| Relatieve snelheid | ~21,9× realtime | ~21,2× realtime |
| Laadtijd model | 5,047 s | 5,283 s |
| Model uit browsercache | ja | ja |

Test D was **0,317 s** of **3.32%** trager op de transcriptiewalltime, maar dit zijn afzonderlijke, eenmalige metingen; die afwijking kan gewone runtimevariatie zijn en bewijst **niet** dat strength 2 extra rekentijd veroorzaakt.

## Interpretatie en volgende stap

**Geen reden om Strength 2 als nieuwe standaard te nemen.** Strength 1 bij Beam Width 5 is de eenvoudige voorlopige keuze zolang beide identieke uitvoer geven. Na meerdere experimenten op exact dezelfde opname is een **nieuwe, ongeziene D&D-opname** nuttiger dan verder afstemmen op deze tekst. Maak voor die opname een gecontroleerd letterlijk referentietranscript en meet naast WER ook of namen, beslissingen en verhaalfeiten correct in notities terechtkomen.

De uitkomst van test D is een **negatief resultaat dat bewaard wordt**; de eerdere geldige runs blijven ongewijzigd.
