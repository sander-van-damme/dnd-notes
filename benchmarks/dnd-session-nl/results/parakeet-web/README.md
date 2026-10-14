# Parakeet Web Ultra — D&D-voorleesbenchmark

Test van [Parakeet Web](https://parakeetweb.olicorne.org/) (model `Olicorne/parakeet-tdt-0.6b-v3-ultra-onnx`) op onze [Nederlandstalige D&D-referentie](../../reference.md).

- [**WER-analyse van 14 oktober 2026**](2026-10-14/README.md): zes configuraties en vergelijking van herkenningsfouten.
- [**Ruwe WER-export en transcripties**](2026-10-14/parakeet-web-custom-mp3-wer.json): ongewijzigde JSON met de letterlijke uitvoer van alle zes configuraties.
- [**Parakeet Web-supportlog**](2026-10-14/parakeetweb-log.json): ongewijzigde omgevings- en instellingengegevens.
- [**DevTools-hulpscript**](custom-audio-expected-console.js): vervangt tijdelijk de standaard benchmarkaudio en -referentietekst en berekent afzonderlijk WER.

**Beste gemeten WER:** 13,80% (WebGPU-hybrid fp16); met de gedocumenteerde beperkte getalnormalisatie 10,21%. Dat zegt nog niets definitiefs over de prestaties bij andere opnames. De feitelijke uitspraak in het MP3-bestand is nog niet onafhankelijk geverifieerd.

Dit is de enige bewaarde **inhoudelijke Parakeet Web-test** in deze benchmarkmap. De vroegere JFK-baseline en een eerdere MP3-run met een ongeschikte expected text zijn bewust verwijderd om verwarring te voorkomen. De oude versies blijven terug te vinden in Git-historiek.

## Volgende proef

Voer hetzelfde audiofragment opnieuw uit met en zonder **phrase boosting**, en vergelijk vooral de herkenning van personagenamen, locaties en D&D-termen. Bewaar nieuwe outputs gewoon op een herkenbare plaats onder deze map, zonder verplicht template.
