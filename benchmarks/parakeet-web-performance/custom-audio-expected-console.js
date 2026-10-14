// Parakeet Web 11.4.0: temporary Chrome DevTools console helper.
// Use only on https://parakeetweb.olicorne.org/ after a fresh page load.
// - Replaces the hardcoded benchmark/jfk.mp3 with your own MP3.
// - Substitutes the JFK expected sentence with your D&D reference for the
//   existing in-app LCS similarity metric.
// - Captures the last timed SHORT-profile transcript for each successful model
//   combination; computes REAL WER (S+D+I)/referenceWords separately.
// - Exports a SIDE-CAR JSON with WER and raw transcripts, NOT a modified
//   Parakeet benchmark report. It does not modify the app or its source field.
// Warning: uses short-lived monkey patches on String.prototype and console.log;
// refresh the page to restore all browser behavior if anything looks odd.
(async () => {
  const REFERENCE_URL =
    "https://raw.githubusercontent.com/sander-van-damme/dnd-notulist/main/benchmarks/dnd-session-nl/reference.md";
  const JFK_EXPECTED =
    "And so, my fellow Americans, ask not what your country can do for you, ask what you can do for your country.";

  // Clean up a previous invocation of this helper if one is installed.
  if (typeof window.__dndBenchRestore === "function") {
    window.__dndBenchRestore();
  }

  // Optional: set window.__dndBenchReferenceText to a verified literal
  // transcript BEFORE running this script, overriding reference.md.
  const manualRef = window.__dndBenchReferenceText;
  let expected;
  let referenceSource;
  if (typeof manualRef === "string" && manualRef.trim()) {
    expected = manualRef;
    referenceSource = "window.__dndBenchReferenceText";
  } else {
    const response = await fetch(REFERENCE_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Cannot load D&D expected text: HTTP " + response.status);
    }
    expected = await response.text();
    referenceSource = REFERENCE_URL;
  }
  expected = expected.replace(/\s+/g, " ").trim();
  if (expected.length < 100) {
    throw new Error("Expected text is too short for this D&D benchmark.");
  }

  const picker = document.createElement("input");
  picker.type = "file";
  picker.accept = ".mp3,audio/mpeg";
  const mp3 = await new Promise((resolve) => {
    picker.addEventListener("change", () => resolve(picker.files?.[0] || null), { once: true });
    picker.addEventListener("cancel", () => resolve(null), { once: true });
    picker.click();
  });
  if (!mp3) {
    console.info("[D&D WER] Cancelled: no audio selected.");
    return;
  }

  // Reuse the original fetch from the earlier audio-only snippet if present.
  const originalFetch = window.__originalBenchmarkFetch || window.fetch.bind(window);
  const originalLower = String.prototype.toLowerCase;
  const originalLog = console.log;
  const expectedLower = originalLower.call(expected);

  // Mirror normalizeForCompare() from Parakeet Web benchmark.js.
  // Numbers stay as spoken/recognized, accents are kept; hyphens split words.
  function tokens(text) {
    const normalized = originalLower.call(String(text || ""))
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
    return normalized ? normalized.split(" ") : [];
  }

  // Word-level Levenshtein distance with S/D/I breakdown, O(N*M) time and
  // O(M) memory. On ties prefer substitution, then deletion, then insertion.
  function calculateWer(referenceWords, hypothesisWords) {
    const n = referenceWords.length;
    const m = hypothesisWords.length;
    if (n === 0) throw new Error("No reference words; WER is undefined.");

    let prevCost = new Uint32Array(m + 1);
    let prevSub = new Uint32Array(m + 1);
    let prevDel = new Uint32Array(m + 1);
    let prevIns = new Uint32Array(m + 1);
    let curCost = new Uint32Array(m + 1);
    let curSub = new Uint32Array(m + 1);
    let curDel = new Uint32Array(m + 1);
    let curIns = new Uint32Array(m + 1);
    for (let j = 0; j <= m; j++) {
      prevCost[j] = j;
      prevIns[j] = j;
    }

    for (let i = 1; i <= n; i++) {
      curCost[0] = i;
      curSub[0] = 0;
      curDel[0] = i;
      curIns[0] = 0;
      for (let j = 1; j <= m; j++) {
        const same = referenceWords[i - 1] === hypothesisWords[j - 1];
        const diagCost = prevCost[j - 1] + (same ? 0 : 1);
        const delCost = prevCost[j] + 1;
        const insCost = curCost[j - 1] + 1;

        if (diagCost <= delCost && diagCost <= insCost) {
          curCost[j] = diagCost;
          curSub[j] = prevSub[j - 1] + (same ? 0 : 1);
          curDel[j] = prevDel[j - 1];
          curIns[j] = prevIns[j - 1];
        } else if (delCost <= insCost) {
          curCost[j] = delCost;
          curSub[j] = prevSub[j];
          curDel[j] = prevDel[j] + 1;
          curIns[j] = prevIns[j];
        } else {
          curCost[j] = insCost;
          curSub[j] = curSub[j - 1];
          curDel[j] = curDel[j - 1];
          curIns[j] = curIns[j - 1] + 1;
        }
      }
      [prevCost, curCost] = [curCost, prevCost];
      [prevSub, curSub] = [curSub, prevSub];
      [prevDel, curDel] = [curDel, prevDel];
      [prevIns, curIns] = [curIns, prevIns];
    }

    const errors = prevCost[m];
    return {
      referenceWords: n,
      recognizedWords: m,
      substitutions: prevSub[m],
      deletions: prevDel[m],
      insertions: prevIns[m],
      errors,
      wer: errors / n,
      werPercent: +(errors * 100 / n).toFixed(2),
    };
  }

  const referenceWords = tokens(expected);
  const captures = [];
  let plannedCombos = [];
  let nextIsHypothesis = false;
  let benchmarkStartedAt = null;

  // Parakeet logs its selected combo order at the start. If ANY planned
  // combination fails before reaching scoring, do NOT assign combo names.
  console.log = function (...args) {
    const msg = args[0];
    const prefix = "[Benchmark] Starting: ";
    if (typeof msg === "string" && msg.startsWith(prefix)) {
      plannedCombos = msg.slice(prefix.length).split(",").map((x) => x.trim()).filter(Boolean);
      captures.length = 0;
      nextIsHypothesis = false;
      benchmarkStartedAt = new Date().toISOString();
      console.info("[D&D WER] Started; planned configurations:", plannedCombos);
    }
    return originalLog.apply(this, args);
  };

  window.fetch = (resource, options) => {
    const url = resource instanceof Request ? resource.url : String(resource);
    if (new URL(url, document.baseURI).pathname.endsWith("/benchmark/jfk.mp3")) {
      console.info("[D&D WER] Supplying custom MP3:", mp3.name);
      return Promise.resolve(new Response(mp3, {
        status: 200,
        headers: { "Content-Type": "audio/mpeg" },
      }));
    }
    return originalFetch(resource, options);
  };

  // transcriptSimilarity() first normalizes JFK_EXPECTED, then last.text.
  // The *very next* toLowerCase() call is the raw model transcript for that
  // scored profile. Capture it once; compute WER outside the timed portion.
  String.prototype.toLowerCase = function (...args) {
    const input = String(this);
    if (input === JFK_EXPECTED) {
      nextIsHypothesis = true;
      return expectedLower;
    }
    if (nextIsHypothesis) {
      nextIsHypothesis = false;
      try {
        const stats = calculateWer(referenceWords, tokens(input));
        const index = captures.length + 1;
        captures.push({
          ordinal: index,
          ...stats,
          transcript: input, // RAW recognition result, not hand-edited.
        });
        console.info(
          "[D&D WER] Score #" + index +
          ": " + stats.werPercent.toFixed(2) + "% " +
          "(S=" + stats.substitutions +
          ", D=" + stats.deletions +
          ", I=" + stats.insertions +
          ", reference=" + stats.referenceWords + " words)"
        );
      } catch (error) {
        console.error("[D&D WER] Could not score captured transcript:", error);
      }
    }
    return originalLower.apply(this, args);
  };

  window.__dndBenchWerResults = captures;

  window.__dndBenchShowWer = () => {
    if (!captures.length) {
      console.warn("[D&D WER] No scored model output captured yet.");
      return;
    }
    const completePlan = plannedCombos.length > 0 &&
      plannedCombos.length === captures.length;
    console.table(captures.map((r, i) => ({
      model: completePlan ? plannedCombos[i] : "unverified #" + (i + 1),
      werPercent: r.werPercent,
      substitutions: r.substitutions,
      deletions: r.deletions,
      insertions: r.insertions,
      referenceWords: r.referenceWords,
      recognizedWords: r.recognizedWords,
    })));
    if (!completePlan) {
      console.warn(
        "[D&D WER] Number of scores doesn't match the plan. " +
        "Do not assign model names without checking the original report."
      );
    }
  };

  window.__dndBenchDownloadWer = () => {
    if (!captures.length) {
      console.warn("[D&D WER] No results to export; run the benchmark first.");
      return;
    }
    const completePlan = plannedCombos.length > 0 &&
      plannedCombos.length === captures.length;
    const payload = {
      format: "dnd-notulist-parakeet-wer/1",
      createdAt: new Date().toISOString(),
      benchmarkStartedAt,
      application: "Parakeet Web 11.4.0 (console override)",
      audio: { name: mp3.name, sizeBytes: mp3.size },
      reference: {
        source: referenceSource,
        text: expected,
        verifiedAgainstActualRecording: false,
      },
      normalization: "lowercase; remove punctuation (split hyphens); preserve accents, digits and word order",
      captureScope: "last timed transcript per successful short-profile row only",
      modelMappingVerified: completePlan,
      plannedConfigurations: plannedCombos,
      caveat: "If the read-aloud differs from the reference, WER is provisional. " +
        "Parakeet's native JSON still says JFK and contains LCS similarity, not WER.",
      results: captures.map((r, i) => ({
        ...r,
        model: completePlan ? plannedCombos[i] : null,
      })),
    };

    // The file contains FULL recognized transcripts: review before sharing.
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2) + "\n"], { type: "application/json" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "parakeet-web-custom-mp3-wer.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    window.__dndBenchShowWer();
    console.info("[D&D WER] Download started. Contains raw model transcripts.");
    return payload;
  };

  window.__dndBenchRestore = () => {
    window.fetch = originalFetch;
    String.prototype.toLowerCase = originalLower;
    console.log = originalLog;
    console.info("[D&D WER] Hooks removed; captured results remain available.");
  };

  console.info(
    "[D&D WER] Ready with", mp3.name,
    "and", referenceWords.length, "reference words.",
    "Turn LONG AUDIO PROFILE OFF for recordings >90 s.",
    "After the benchmark, run __dndBenchShowWer()",
    "then __dndBenchDownloadWer().",
    "Native similarity remains LCS, NOT WER."
  );
})().catch((err) => console.error("[D&D WER] Setup failed:", err));
