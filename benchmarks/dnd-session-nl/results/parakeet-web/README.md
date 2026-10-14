# Parakeet Web Ultra — D&D-voorleesbenchmark

Test van [Parakeet Web](https://parakeetweb.olicorne.org/) (model `Olicorne/parakeet-tdt-0.6b-v3-ultra-onnx`) op onze [Nederlandstalige D&D-referentie](../../reference.md).

- [**WER-analyse van 14 oktober 2026**](2026-10-14/README.md): zes configuraties en vergelijking van herkenningsfouten.
- [**Ruwe WER-export en transcripties**](2026-10-14/parakeet-web-custom-mp3-wer.json): ongewijzigde JSON met de letterlijke uitvoer van alle zes configuraties.
- [**Parakeet Web-supportlog**](2026-10-14/parakeetweb-log.json): ongewijzigde omgevings- en instellingengegevens.
- [**DevTools-hulpscript**](custom-audio-expected-console.js): vervangt tijdelijk de standaard benchmarkaudio en -referentietekst en berekent afzonderlijk WER.

**Beste gemeten WER:** 13,80% (WebGPU-hybrid fp16); met de gedocumenteerde beperkte getalnormalisatie 10,21%. Dat zegt nog niets definitiefs over de prestaties bij andere opnames. De feitelijke uitspraak in het MP3-bestand is nog niet onafhankelijk geverifieerd.

Dit is de enige bewaarde **inhoudelijke Parakeet Web-test** in deze benchmarkmap. De vroegere JFK-baseline en een eerdere MP3-run met een ongeschikte expected text zijn bewust verwijderd om verwarring te voorkomen. De oude versies blijven terug te vinden in Git-historiek.

## Volgende proef — phrase boosting (test B)

Gebruik [**phrase-boosting-test-b.txt**](phrase-boosting-test-b.txt) als **Custom**-woordenlijst in Parakeet Web. Het bestand bevat precies 11 phrases, één per regel, zonder toelichting of extra parameters, zodat je de inhoud rechtstreeks kunt plakken.

- **Model:** Parakeet Web Ultra, **WebGPU-hybrid fp16**.
- **Phrase boosting:** aan; **Boost strength 1** en **min-p 0.1**.
- **Beam Width: handmatig op 1 instellen**. De automatische beam-instelling kan anders tegelijk veranderen wanneer boosting aan gaat.
- **Audio:** exact dezelfde D&D-MP3 als de baseline. Andere parameters ongewijzigd laten.
- **Meten:** exporteer WER en transcripties en controleer vooral namen, D&D-termen en eventuele extra hallucinaties. Vergelijk daarna desgewenst boosting + Beam Width 5 als een **aparte** test C.

De lijst is samengesteld met kennis van fouten in **dezelfde** D&D-opname. Een verbetering op deze opname toont het effect van deze gerichte correctie, maar voorspelt nog niet automatisch de prestaties met onbekende campagnes of namen. Bewaar nieuwe outputs gewoon onder deze map, zonder verplicht template.
