# Performancebenchmarks

Hier bewaren we de **ruwe exportbestanden** van ingebouwde hardware- en snelheidsbenchmarks en een daarvan afgeleide, leesbare analyse.

- [Parakeet Web: vaste JFK-clip (14 oktober 2026)](2026-10-14/README.md): Parakeet Ultra, WASM en WebGPU-hybrid, 11 s/90 s testfragment.
- [Parakeet Web: eigen MP3 van 209,43 seconden (14 oktober 2026)](2026-10-14/custom-mp3-long-profile-run-01/README.md): dezelfde opname in short en long, met incorrecte standaard-JFK-similarity; inclusief [console-helper voor eigen audio, expected text en WER](custom-audio-expected-console.js).

Dit zijn **geen** resultaten van de Nederlandse D&D-voorleesbenchmark en bevatten geen D&D-transcriptie of D&D-WER. Zie voor de eigenlijke herkenningsvergelijkingen [de D&D-benchmark](../dnd-session-nl/README.md).

## Eigen MP3 met correcte WER: tijdelijke DevTools-helper

[**custom-audio-expected-console.js**](custom-audio-expected-console.js) (getest met een gesimuleerde Parakeet Web 11.4.0-uitvoering, **niet** op de live website. De referentietekst wordt lokaal uit de helper geladen).

1. Open [Parakeet Web](https://parakeetweb.olicorne.org/) en druk op **F12 → Console**. Kopieer de **volledige inhoud** van de JavaScript-helper en voer deze uit. Kies de eigen MP3.
2. De helper bevat een **ingebouwde momentopname** van [reference.md](../dnd-session-nl/reference.md), zodat Parakeet Web geen door zijn Content Security Policy geblokkeerde verbinding met GitHub hoeft te maken. Voor een afwijkende opname kun je **vóór het uitvoeren** `window.__dndBenchReferenceText = "je gecontroleerde letterlijke transcript hier"` instellen. De ingebouwde tekst wordt niet automatisch bijgewerkt als `reference.md` later verandert.
3. Zet bij MP3-bestanden **langer dan 90 seconden Long Audio Profile uit**: die stand verwerkt dan exact dezelfde audio een tweede keer en kost dubbel rekenwerk.
4. Start de normale ingebouwde benchmark met de gewenste precisies/backends. In de Console verschijnt na elke geslaagde *short*-profile-uitvoer een `[D&D WER]`-regel.
5. Na afloop typ je `__dndBenchShowWer()` in de Console voor een tabel. Download met `__dndBenchDownloadWer()` een **extra JSON-bestand**, inclusief WER, substituties/deleties/inserties en het **letterlijke ruwe transcript** per geslaagde modelcombinatie.
6. Bewaar zowel de **originele Parakeet Web performance-export** als de **aparte WER-export**. De ingebouwde `similarity` is en blijft **LCS-overeenkomst**, geen WER; het oorspronkelijke rapportveld `clip.source` blijft verkeerdelijk JFK vermelden. **Herlaad de pagina om alle tijdelijke console-patches te verwijderen.**

**Beperkingen:** de helper gebruikt tijdelijke JavaScript-hooks in de pagina. Bij een nieuwe Parakeet Web-versie kan de methode stukgaan. De WER-hook onderschept alleen de **laatste getimede uitvoer per succesvolle short-profile-rij**, niet alle repeats of de long-profile-rijen. Alleen wanneer voor **alle geplande** configuraties een score gevangen is, koppelt de helper automatisch de modelnamen; anders blijven deze expliciet *unverified*. Controleer telkens of de verwachte aantallen kloppen.

WER gebruikt woord-Levenshteinafstand: `(substituties + deleties + inserties) / aantal referentiewoorden`. Normalisatie: lowercase, leestekens als scheiding, behoud van accenten en cijfers. Daardoor kunnen bijvoorbeeld `21` versus `eenentwintig` als verschillende woorden tellen. De *Numbers as Digits*-instelling verandert **niet** de ruwe benchmarktekst: de benchmark-code retourneert die tekst vóór die nabewerking.

De WER-export bevat de complete herkenningstekst en is **niet geanonimiseerd**. Controleer hem vóór je hem deelt of in GitHub commit. De WER-score is pas een zuivere accuraatheidsmeting als de referentietekst werkelijk overeenkomt met het uitgesproken audiobestand.
