# Parakeet Web Ultra — D&D-voorleesbenchmark

Test van [Parakeet Web](https://parakeetweb.olicorne.org/) (model `Olicorne/parakeet-tdt-0.6b-v3-ultra-onnx`) op onze [Nederlandstalige D&D-referentie](../../reference.md).

- [**Baseline zonder boosting — 14 oktober 2026**](2026-10-14/README.md): zes configuraties en vergelijking van herkenningsfouten.
- [**Test B — phrase boosting, fp16 en Beam Width 1**](2026-10-14-phrase-boosting-fp16-beam1/README.md): WER 13,04%, met beide onbewerkte JSON-exports en foutanalyse.
- [**Test C — phrase boosting, fp16 en Beam Width 5**](2026-10-14-phrase-boosting-fp16-beam5/README.md): WER 12,29%, Veyra tweemaal correct, met beide onbewerkte JSON-exports en prestatievergelijking.
- [**Test D — Beam Width 5, Boost Strength 2**](2026-10-14-phrase-boosting-fp16-beam5-strength2/README.md): **ongewijzigde transcriptie en WER 12,29%** tegenover test C; beide originele JSON-exports en analyse.
- [**Ruwe WER-export en transcripties**](2026-10-14/parakeet-web-custom-mp3-wer.json): ongewijzigde JSON met de letterlijke uitvoer van alle zes configuraties.
- [**Parakeet Web-supportlog**](2026-10-14/parakeetweb-log.json): ongewijzigde omgevings- en instellingengegevens.
- [**DevTools-hulpscript**](custom-audio-expected-console.js): vervangt tijdelijk de standaard benchmarkaudio en -referentietekst en berekent afzonderlijk WER.

**Beste gemeten WER:** **12,29%** in zowel [test C (Beam Width 5, Strength 1)](2026-10-14-phrase-boosting-fp16-beam5/README.md) als [test D (Beam Width 5, Strength 2)](2026-10-14-phrase-boosting-fp16-beam5-strength2/README.md), tegenover **13,04%** in test B (Beam 1) en **13,80%** zonder boosting. De transcripties van C en D zijn **letterlijk identiek**. Beam 5 herkent *Veyra* op beide plaatsen, maar belangrijke andere namen en *gewond → gewoon* blijven problematisch. Het ingesproken audiobestand is niet onafhankelijk geverifieerd.

We bewaren hier de geldige D&D-baseline en gerichte vervolgexperimenten. De vroegere JFK-baseline en een eerdere MP3-run met een ongeschikte expected text zijn bewust verwijderd om verwarring te voorkomen. De oude versies blijven terug te vinden in Git-historiek.

## Phrase boosting — uitgevoerde tests B, C en D

Gebruik [**phrase-boosting-test-b.txt**](phrase-boosting-test-b.txt) als **Custom**-woordenlijst in Parakeet Web. Het bestand bevat precies 11 phrases, één per regel, zonder toelichting of extra parameters, zodat je de inhoud rechtstreeks kunt plakken.

- **Model:** Parakeet Web Ultra, **WebGPU-hybrid fp16**.
- **Phrase boosting:** aan; **Boost strength 1** en **min-p 0.1**.
- **Beam Width: handmatig op 1 instellen**. De automatische beam-instelling kan anders tegelijk veranderen wanneer boosting aan gaat.
- **Audio:** exact dezelfde D&D-MP3 als de baseline. Andere parameters ongewijzigd laten.
- **Meten:** exporteer WER en transcripties en controleer vooral namen, D&D-termen en eventuele extra hallucinaties. Vergelijk daarna desgewenst boosting + Beam Width 5 als een **aparte** test C.

**Tests B, C en D zijn uitgevoerd**: vergelijk [Beam Width 1, Strength 1](2026-10-14-phrase-boosting-fp16-beam1/README.md), [Beam Width 5, Strength 1](2026-10-14-phrase-boosting-fp16-beam5/README.md) en [Beam Width 5, Strength 2](2026-10-14-phrase-boosting-fp16-beam5-strength2/README.md). Strength 2 levert hier geen andere transcriptie; de volgende zinvolle proef is een **nieuwe D&D-opname**. De lijst is samengesteld met kennis van fouten in **dezelfde** D&D-opname. Een verbetering op deze opname toont het effect van deze gerichte correctie, maar voorspelt nog niet automatisch de prestaties met onbekende campagnes of namen. Bewaar nieuwe outputs gewoon onder deze map, zonder verplicht template.
