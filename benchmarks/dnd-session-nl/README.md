# D&D-voorleesbenchmark (NL met Engelse speltermen)

Eén **Nederlandstalig** fictief Dungeons & Dragons-gesprek met gangbare **Engelse D&D-termen**. Dit is een vaste referentie voor het vergelijken van lokale spraakherkenningsmodellen en modellen die sessienotities maken. Er is bewust **geen aparte Engelse scriptversie**.

## Bestanden

- [reference.md](reference.md) — letterlijk voor te lezen testtekst; **alleen deze tekst is audio-input**.
- [expected-facts.md](expected-facts.md) — feitenchecklist voor de kwaliteit van sessienotities; niet meegeven als modelcontext.
- [results/](results/) — bewaar de ruwe transcripties, eventuele sessienotities en de modelinstellingen per run.

## Zo test je reproduceerbaar

1. Lees `reference.md` volledig en in dezelfde volgorde voor. Iedere alinea stelt een andere spreekbeurt voor; **spreek alle alinea's uit**, maar voeg geen sprekerslabels, tussentitels of andere woorden toe. Verander de tekst niet tussen runs.
2. **Voor een eerlijke modelvergelijking: neem het script bij voorkeur één keer op en gebruik exact hetzelfde audiobestand voor elk model.** Anders vergelijk je ook variatie in uitspraak, tempo, microfoon en achtergrondgeluid. Live microfoontests kunnen daarnaast apart, met vermelding van de omstandigheden.
3. Noteer modelnaam én versie/revisie, runtime, quantisatie, taalinstelling, prompt, hardware, opnamebron en eventuele preprocessing. Laat een transcriptie- of notitiemodel niet de referentietekst of de feitenchecklist zien.
4. Bewaar de **onbewerkte** modeluitvoer in een eigen submap onder `results/`. Corrigeer spelling, eigennamen, leestekens of weglatingen niet in de ruwe output.
5. Vergelijk voor spraakherkenning de herkende woorden met de voorgelezen tekst (bijvoorbeeld WER/CER, na **dezelfde** expliciet gedocumenteerde normalisatie voor alle modellen). Vergelijk sessienotities **apart** met `expected-facts.md`: juiste feiten, belangrijke weglatingen, correcties en verzonnen details. Een lage WER bewijst niet automatisch goede notities.

**Let op:** `reference.md` is de beoogde tekst, geen geverifieerd transcript van een daadwerkelijke opname. Als je tijdens het inspreken woorden overslaat, toevoegt of jezelf verspeekt, maak dan ook een *gecontroleerd letterlijk transcript van de opname* voor een betrouwbare WER-berekening. Bewaar de originele referentie onveranderd. Voor vaktermen zoals `d20`, `gold pieces` en `Mage Hand` kan tokenisatie/normalisatie de ruwe score beïnvloeden; rapporteer altijd wat je genormaliseerd hebt.

Deze dataset bevat nog geen audiobestand en voert nog geen automatische scoreberekening uit.
