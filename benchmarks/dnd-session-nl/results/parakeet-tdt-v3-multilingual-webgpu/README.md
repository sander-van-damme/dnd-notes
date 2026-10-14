# Parakeet TDT v3 Multilingual — WebGPU — Record & Transcribe

**Huidige testmodus: Record & Transcribe (bestand opnemen/inladen en daarna transcriberen), niet realtime.**

**Status:** [run 1](run-01/transcript.md) is aangemaakt, maar de transcriptie is nog leeg. Er zijn nog geen scores of resultaten opgeslagen.

## Testomgeving

- Beoogd model: **Parakeet TDT v3 Multilingual**. Controleer bij de run de exacte modelvariant/revisie.
- Tool voor de opgenomen-audiotest: <https://ysdede.github.io/parakeet.js/>.
- Modus: **Record & Transcribe**. Verwerk een vooraf opgenomen audiobestand; géén live streamingtest.
- Backend: **controleer bij de run** of WebGPU daadwerkelijk actief is; de mapnaam alleen is geen bewijs van de gebruikte backend.
- Quantisatie, instellingen, apparaat en verwerkingstijden: nog te documenteren.
- De eerder bekeken realtime microfoontest op <https://webgpu.studio/speech-to-text> valt **buiten deze benchmarkrun**. Resultaten van beide modi mogen niet zonder toelichting worden samengevoegd.

## Run 1 invullen

1. Gebruik de vaste [voorleestekst](../../reference.md) en, voor een eerlijke vergelijking, precies dezelfde opgenomen audio als bij andere modellen.
2. Kopieer de **volledige, ongewijzigde output** naar [`run-01/transcript.md`](run-01/transcript.md), zonder zelf fouten te verbeteren of extra kopjes toe te voegen. Het bestand is nu opzettelijk leeg.
3. Noteer bij voorkeur in `run-01/metadata.md` de gebruikte model- en toolversie, instellingen, audio-ID, backend, computer en verwerkingstijd. Gebruik daarvoor de [metadatatemplate](../_metadata-template.md).
4. Beoordeel de transcriptie pas achteraf tegenover de referentie (met dezelfde normalisatieregels voor alle modellen).

Maak voor nieuwe proeven aparte mappen (`run-02/`, `run-03/`, enzovoort), zodat de originele uitvoer van run 1 behouden blijft.
