# Test C — phrase boosting met Beam Width 5 (14 oktober 2026)

Vergelijking van **dezelfde beoogde D&D-opname** met eerdere tests: [zonder boosting (baseline)](../baseline-no-boosting/README.md) en [phrase boosting met Beam Width 1 (test B)](../boosting-beam1-strength1/README.md).

## Originele bestanden

- [**wer.json**](wer.json) — ongewijzigde upload `parakeet-web-custom-mp3-wer-beam5.json`, met de volledige herkende tekst en WER.
- [**benchmark.json**](benchmark.json) — ongewijzigde upload `logbeam5.json`, met configuratie en snelheid; dit is een benchmarkrapport, geen applicatiediagnostiek.
- [**Beoogde boostinglijst: 11 phrases**](../phrase-boosting-test-b.txt).

## Omstandigheden en beperkingen

- Parakeet Web `11.4.0`, `Olicorne/parakeet-tdt-0.6b-v3-ultra-onnx`, **WebGPU-hybrid fp16**.
- **Phrase boosting actief**, boost strength **1**, **Beam Width 5**; verder 4 WASM-threads, 60 s chunking en parallel encoding. **Long Audio Profile uit**, één succesvolle meting, één warmup en één getimede herhaling.
- Referentie: **529 woorden** na dezelfde normalisatie (lowercase, leestekens als scheiding, accenten/cijfers behouden).
- Audio-identificatie: `dnd-demo.mp3`, **3.409.388 bytes**, **209,43 s**. Naam en bestandsgrootte komen overeen met tests A en B; **de audiobytes zijn niet gehasht of onafhankelijk gecontroleerd**.
- De sidecar bevat `verifiedAgainstActualRecording: false`, dus WER kan ook voorleesafwijkingen omvatten.
- Het rapport bevestigt dat boosting **actief** was, maar exporteert de daadwerkelijke woordenlijst noch min-p. Het hergebruik van [de 11 phrases](../phrase-boosting-test-b.txt) en **min-p 0.1** is het afgesproken testprotocol, niet apart aantoonbaar uit dit rapport.
- `clip.source` vermeldt nog altijd **JFK** doordat de lokale DevTools-override alleen de opgehaalde audio vervangt; de clipduur van **209,43 s** en de bijgevoegde transcriptie zijn van de eigen D&D-opname. Dit is géén JFK-test.

## Vergelijking accuraatheid

| Metric | Baseline: geen boosting, Beam 1 | Test B: boosting, Beam 1 | **Test C: boosting, Beam 5** |
|---|---:|---:|---:|
| WER (529 woorden) | 13,80% | 13,04% | **12,29%** |
| Fouten (substituties/deleties/inserties) | 73 (59/10/4) | 69 (58/7/4) | **65 (55/6/4)** |
| Beperkt getalgenormaliseerde WER¹ | 10,21% | 9,45% | **8,70%** |

**Resultaat:** Test C vermindert de WER met **0,75 procentpunt (4 woordfouten)** t.o.v. test B en met **1,51 procentpunt (8 fouten)** t.o.v. de baseline.

¹ Extra analyse, **niet** de Parakeet Web-score: dezelfde beperkte, expliciete normalisatie van losse Nederlandse getalwoorden naar cijfers als bij de baseline. In test C wordt de Levenshteinafstand daardoor **46** i.p.v. **65** fouten. De hoofdrangschikking verandert niet.

## Wat is er echt veranderd in de transcriptie?

De genormaliseerde transcripties van **Beam 1** en **Beam 5** verschillen op zes lokale plaatsen (in totaal 7 woordbewerkingen tussen de twee outputs):

| Bij Beam 1 | Bij Beam 5 | Inhoudelijke betekenis |
|---|---|---|
| `Kapitein Veira` (eerste vermelding) | **`Kapitein Veyra`** | **NPC-naam correct** |
| `kapitein Veira` (tweede vermelding) | **`kapitein Veyra`** | **NPC-naam opnieuw correct** |
| `de Wardin en de Alfos` | `de Wardin en Alfos` | Eén overbodig woord minder; **Edda Voss blijft fout** |
| `rol 22` | `rol 22's` | Iets betere tokenafstemming op `rol twee d20's`, maar **de dobbelsteenformulering blijft fout** |
| `nerenveil` (tweede vermelding) | `neren veel` | Geen correctie van **Nerin Vale** |
| `golpices` | `golpieces` | Andere spelling, maar **gold pieces blijft fout** |

Van de **vier** WER-verbeteringen komen er **twee door Veyra**. De andere twee komen uit het verdwijnen van een overbodig `de` en de extra `s` bij `22's`. Dat zijn geen belangrijke verhaalfeiten. **Beam Width 5 verbetert dus deels de inhoud, maar de totale WER-winst overschat mogelijk de semantische vooruitgang.**

Onopgeloste fouten zijn onder andere `Edda Voss`, `Nerin Vale`, `Grijzehaven`, `Insight check → inside check`, `Stealth check → stijlcheck` en **`gewond → gewoon`**. De laatste fout verandert een belangrijk feit over de teruggevonden NPC.

### Exact correcte phrases uit onze lijst

Een phrase telt alleen als correct wanneer haar genormaliseerde opeenvolgende woorden letterlijk voorkomen (dus `Grijze haven` telt niet als `Grijzehaven`). De getallen zijn de aantallen voorkomens.

| Phrase | In referentie | Test B (Beam 1) | Test C (Beam 5) |
|---|---:|---:|---:|
| `Grijzehaven` | 3 | 0 | 0 |
| `Het Koperen Hert` | 1 | 0 | 0 |
| `Edda Voss` | 1 | 0 | 0 |
| `Nerin Vale` | 2 | 0 | 0 |
| `Veyra` | 2 | 0 | 2 |
| `Perception check` | 1 | 1 | 1 |
| `Insight check` | 1 | 0 | 0 |
| `Stealth check` | 1 | 0 | 0 |
| `modifier` | 2 | 1 | 1 |
| `healing potion` | 1 | 1 | 1 |
| `Mage Hand` | 2 | 2 | 2 |

## Verwerkingssnelheid

| Metriek | Test B (Beam 1) | Test C (Beam 5) |
|---|---:|---:|
| Audio | 209,43 s | 209,43 s |
| Gemeten transcriptiewalltime | **7,594 s** | **9,544 s** |
| Snelheid t.o.v. realtime | 27.6× | 21.9× |
| Model geladen uit browsercache? | **nee** | **ja** |
| Model-laadtijd (niet in transcriptiewalltime) | 61,026 s | 5,047 s |

Beam 5 is **25.7% trager** in deze metingen, maar nog steeds circa **21.9× realtime**. De laadtijden zijn **niet vergelijkbaar** vanwege koud/niet-cached tegenover uit cache geladen model. Er is maar één getimede herhaling per configuratie; het verschil in walltime is een indicatie, geen betrouwbare gemiddelde meerkost over meerdere runs.

## Conclusie en volgende proef

**Test C (fp16, boosting, Beam 5)** is voorlopig het beste resultaat voor deze opname: **12,29% WER** met verbeterde herkenning van **Veyra**, tegen een beperkte absolute vertraging.

Als vervolg kan een gecontroleerde test met **boost strength 2 en dezelfde Beam Width 5** interessant zijn om te kijken of Edda Voss en Nerin Vale alsnog herkend worden — maar controleer dan nadrukkelijk op onterechte ingevoegde namen. Omdat de woordenlijst is gebaseerd op fouten in **dezelfde opname**, moet de methode ook op andere, nog niet gebruikte D&D-audio worden gevalideerd voordat je algemene conclusies trekt.
