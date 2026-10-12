# DnD Notulist

**DnD Notulist** is een slimme, privacyvriendelijke notulist voor Dungeons & Dragons-sessies. Je zet de website open tijdens het spelen, laat de app meeluisteren en krijgt automatisch een overzicht van wat er in het avontuur gebeurt.

De bedoeling is niet om elk woord letterlijk uit te schrijven, maar om **bruikbare sessienotities** te maken: wie de groep ontmoet, welke informatie de Dungeon Master geeft, waar de personages naartoe gaan, welke keuzes ze maken, welke voorwerpen ze vinden en wat er tijdens belangrijke gevechten gebeurt. Ook opvallende of grappige momenten mogen een plaats krijgen.

## Wat willen we bereiken?

- **Live notities:** belangrijke gebeurtenissen verschijnen tijdens het spelen, niet pas na de sessie.
- **Gewoon een website:** bruikbaar op Android, laptop en andere geschikte toestellen, zonder verplichte app-installatie.
- **Privacy voorop:** audio wordt lokaal verwerkt en nooit als opname bewaard of naar een AI-server gestuurd.
- **Offline bruikbaar:** na het eenmalig downloaden van de benodigde bestanden moet de app zonder internet kunnen werken.
- **Vlaams en D&D-taalgebruik:** gesprekken in het Nederlands/Vlaams, afgewisseld met Engelse namen en speltermen.
- **Je houdt de controle:** je kunt notities verbeteren en aanvullen; je eigen correcties krijgen altijd voorrang.
- **Aanpasbaar aan je campagne:** namen, locaties en begrippen uit eerdere sessieverslagen kunnen helpen bij het herkennen van nieuwe gebeurtenissen.
- **Verschillende AI-modellen:** de app is niet afhankelijk van één model. Een blijvende testmodus helpt modellen en instellingen vergelijken op snelheid, geheugenverbruik en kwaliteit.

DnD Notulist moet vooral **weinig rekenkracht en geheugen gebruiken**, terwijl de notities snel, correct en nuttig blijven. Een Google Pixel 6a is het belangrijkste testtoestel; dezelfde webapp moet ook op een laptop kunnen draaien.

## Status

Er is nu een werkende browserapp met campagnes, bewerkbare sessienotities, lokale opslag, Markdown-export, een campagnewoordenboek en een permanente testmodus. De lokale AI-integratie gebruikt **Gemma 4 E2B Mobile QAT ONNX** (circa 2,57 GB modelgewichten) via WebGPU. De oude ~4GB-variant is niet langer de modelstandaard. Je kiest eerst een campagne; modellen en tests staan achter het instellingenicoon. Bij een opname of test wordt het model automatisch gedownload indien nodig en geladen, en daarna hergebruikt zolang de pagina openblijft. Een voorafgaande test is aanbevolen, maar blokkeert de opnameknop niet.

De app is een **experimenteel prototype**. De QAT-migratie vereist nog een echte volledige audio-naar-notitiesproef op de Pixel 6a (en een laptop); CI zonder WebGPU bewijst geen werkende mobiele inferentie. Nederlandse notitiekwaliteit, realtime verwerking en geheugenverbruik op een echte Pixel 6a zijn nog geen bewezen eigenschappen. De testmodus maakt deze grenzen zichtbaar; er is geen terugval naar cloud-AI.

### Lokaal starten

Gebruik Node.js 24 (minimaal 22.12):

```bash
ONNXRUNTIME_NODE_INSTALL=skip npm ci
npm run dev
```

De omgevingsvariabele slaat alleen de optionele native CUDA-download over; de app gebruikt ONNX Runtime in de browser. Voor offline gebruik maak je de productiebuild:

```bash
npm run build
npm run preview
```

Voor **Cloudflare Pages** gebruik je `npm run build:cloudflare` als buildcommando en `dist` als outputdirectory. Stel `NODE_VERSION=24` en `ONNXRUNTIME_NODE_INSTALL=skip` in als omgevingsvariabelen. Deze build houdt rekening met de maximale bestandsgrootte van Pages.

Lees **[Ontwikkeling en testen](docs/DEVELOPMENT.md)** voor browservereisten, de testcommando's, hosting en privacycontroles. De volledige voortgang tegenover de blauwdruk staat in **[Implementatiestatus](docs/IMPLEMENTATION_STATUS.md)**.

## Voor ontwikkelaars en AI coding agents

De technische blauwdruk, architectuurbeslissingen, interfaces, teststrategie en acceptatiecriteria staan in **[docs/TECHNICAL_DESIGN.md](docs/TECHNICAL_DESIGN.md)**. Lees dat document voordat je de implementatie opzet.
