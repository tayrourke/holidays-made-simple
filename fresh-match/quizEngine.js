import { FACE, BODY, SUPP } from "./ringana-products.js";

function item(product, step, why, extra) {
  return { ...product, step, why, ...extra };
}

/** Really-clean wash is FRESH soap liquid, not the bar and not the body wash. */
function liquidSoap() {
  return {
    ...BODY.soapLiquid,
    kind: "Microbiome-friendly liquid soap",
    desc: "FRESH soap liquid. NBC7 prebiotic and postbiotic care, so a proper wash can feel really clean without stripping the barrier. This is the liquid soap, not the body wash and not the bar.",
    use: "Wet your face, work a small amount into a lather, massage, rinse. Morning and night if this is your cleanse. Moisturizer after.",
  };
}

export function buildFace(a) {
  const am = [];
  const pm = [];
  const weekly = [];
  const minimal = a.depth === "minimal";
  const full = a.depth === "full";
  const ex = a.extras || [];
  const also = new Set(a.also || []);
  const oilyish = a.skinType === "oily" || a.concern === "breakouts";
  const dryClimate = a.climate === "dryAir";
  const cityStress = a.climate === "city";
  const humid = a.climate === "humidity";
  const wantsMakeup = a.makeup === "yes" || a.makeup === "sometimes";
  const sensitiveAging = a.skinType === "sensitive" && a.concern === "aging";
  const hasConcern = (c) => a.concern === c || also.has(c);

  // —— Cleanse. Their answer picks the products. Makeup only changes how they use them. ——
  const cleanse = a.cleanse || (minimal && !wantsMakeup ? "cream" : "both");
  const makeupDays = a.makeup === "yes";
  if (cleanse === "soap") {
    am.push(
      item(
        liquidSoap(),
        "Cleanse",
        makeupDays
          ? "You like a really clean wash. FRESH soap liquid morning and night, makeup days included. Work it over the makeup until it lifts, then rinse. Moisturizer after so it doesn't finish tight."
          : "You like a really clean wash. This is FRESH soap liquid, the microbiome-friendly liquid soap. Not the body wash. Lather, rinse, then moisturize so it doesn't finish tight."
      )
    );
    pm.push(
      item(
        liquidSoap(),
        "Cleanse",
        "Same liquid soap at night. Microbiome-friendly soap, not the body wash."
      )
    );
  } else if (cleanse === "cream") {
    const creamCleanse = makeupDays
      ? "Cream cleanser on its own. It takes makeup and sunscreen off. No second cleanse."
      : "You wanted the cream cleanser by itself. Morning and night, then rinse. No micellar step.";
    am.push(item(FACE.cleanser, "Cleanse", creamCleanse));
    pm.push(item(FACE.cleanser, "Cleanse", "Same cream cleanser at night. One step, then the rest of the routine."));
  } else if (cleanse === "water") {
    const waterOnly = {
      desc: "Micellar water. This is the whole cleanse, morning and night — not a second step after a cream cleanser.",
      use: "Cotton pad, morning and night. It can stay on. No cream cleanser before it.",
    };
    am.push(
      item(
        FACE.cleansingWater,
        "Cleanse",
        "Cleansing water on a cotton pad. It can stay on. This is the micellar cleanse, not a sink wash.",
        waterOnly
      )
    );
    pm.push(
      item(
        FACE.cleansingWater,
        "Cleanse",
        makeupDays
          ? "Same at night. On makeup days, use a fresh side of the pad until the cotton comes away clean."
          : "Same at night. A cotton pad, and it can stay on.",
        makeupDays
          ? {
              ...waterOnly,
              use: "On makeup days, use a fresh side of the pad until the cotton comes away clean. No cream cleanser before it.",
            }
          : waterOnly
      )
    );
  } else {
    am.push(
      item(
        FACE.cleansingWater,
        "Cleanse",
        makeupDays
          ? "Morning is the micellar water. Last night did the heavy lift."
          : "Morning cleanse is the micellar water. Light, and it can stay on."
      )
    );
    pm.push(
      item(
        FACE.cleanser,
        "Cleanse",
        makeupDays
          ? "Night: cream cleanser first. It melts makeup, sunscreen, and the day."
          : "Night: the cream cleanser. One real wash, not a foam strip."
      )
    );
    pm.push(
      item(
        FACE.cleansingWater,
        "Cleansing water",
        "Then cleansing water. The cream starts it. The micellar water finishes it."
      )
    );
  }

  // —— Tone (skip when lean) ——
  if (!minimal) {
    const t = oilyish || humid ? FACE.tonicPure : FACE.tonicCalm;
    const tWhy =
      oilyish || humid
        ? "Pure is the clarifying one — mulberry extract regulates oil and discourages blackheads"
        : a.skinType === "sensitive"
          ? "Calm is Ringana's tonic for skin prone to redness and irritation — harmonising, not astringent"
          : "Calm is the one for dry and normal skin; pure would be over-clarifying for you";
    am.push(item(t, "Tone", tWhy));
    pm.push(item(t, "Tone", "Same step, evening — toned skin absorbs what comes next"));
  }

  // —— Primary treat: one needle-mover path (not every serum at once) ——
  if (sensitiveAging) {
    am.push(item(FACE.hydroSerum, "Hydrate", "Sensitive skin doing anti-ageing — hydration and barrier first, always"));
    pm.push(
      item(
        FACE.antiWrinkle,
        "Treat · gentle",
        "Your firmness goal — every other night to start; this formula is gentler than classic retinol"
      )
    );
  } else if (a.concern === "aging") {
    am.push(
      item(FACE.hydroSerum, "Hydrate", "Retinoid-type actives work better on well-hydrated skin — hydro serum first")
    );
    pm.push(item(FACE.antiWrinkle, "Treat", "Evening is prime time for retinoid-type actives — this is your firmness step"));
  } else if (a.concern === "breakouts") {
    am.push(
      item(
        FACE.hydroSerum,
        "Hydrate",
        "Properly hydrated skin produces less compensatory oil — this is the fix under the fix"
      )
    );
    if (!minimal) {
      pm.push(
        item(FACE.addsRepair, "Treat", "Your #1 goal — natural salicylic acid to clear, probiotics to protect the barrier")
      );
    } else {
      pm.push(item(FACE.hydroSerum, "Hydrate", "Keep hydration steady while skin settles — add a clear step when you're ready"));
    }
  } else if (a.concern === "dullness" || a.concern === "brightening" || a.concern === "scarring") {
    am.push(
      item(
        FACE.hydroSerum,
        "Hydrate",
        "Hydrated skin is what makes brightness show. Glow starts with water."
      )
    );
    const glowWhy =
      a.concern === "scarring"
        ? "Glow booster is the one for marks left behind. On a leftover mark, it can go on that spot undiluted. Not around the eyes. Shake first."
        : a.concern === "brightening"
          ? "Glow booster for dark spots and uneven color. Vitamin C, niacinamide, EGCG, and licorice. One pump into your serum. Shake first."
          : cityStress
            ? "Flat, tired skin in city air. Glow booster — vitamin C, niacinamide, and the anti-pollution complex. One pump into your serum."
            : "Dullness is the brief. Glow booster on top of the hydro serum, so skin has something to reflect.";
    am.push(item(FACE.addsGlow, "Treat", glowWhy));
    pm.push(
      item(
        FACE.hydroSerum,
        "Hydrate",
        a.concern === "scarring"
          ? "Night stays on hydration. The mark treatment is the morning glow booster."
          : "Twice-daily hydration keeps the brightening from looking flat by evening."
      )
    );
  } else if (a.concern === "eyes") {
    am.push(item(FACE.hydroSerum, "Hydrate", "Whole-face hydration supports the eye area too"));
    am.push(item(FACE.eyeSerum, "Eyes", "Your top concern — face cream is too heavy for skin this thin"));
    pm.push(item(FACE.eyeSerum, "Eyes", "Morning and night; results here take about four weeks"));
  } else {
    // dehydration / default
    const serumWhy =
      a.concern === "dehydration"
        ? "Six hyaluronic acid types means hydration at six depths, not just a surface film"
        : "Hydration supports the whole face — the highest-leverage step for most skin";
    am.push(item(FACE.hydroSerum, "Treat", serumWhy));
    // If evening firmness is coming as a secondary, don't also run hydro at night
    if (!(full && also.has("aging"))) {
      pm.push(item(FACE.hydroSerum, "Treat", "Twice daily for round-the-clock hydration"));
    }
  }

  // —— One secondary (also) treat max, evening only, and only on a fuller ritual ——
  if (full && also.size) {
    if (also.has("aging") && a.concern !== "aging" && !sensitiveAging) {
      pm.push(
        item(FACE.antiWrinkle, "Treat · firmness", "You also flagged firmness — evening only, every other night to start")
      );
    } else if (also.has("breakouts") && a.concern !== "breakouts" && !hasConcern("aging")) {
      pm.push(item(FACE.addsRepair, "Spot treat", "Secondary congestion — zone it; don't run a second full face serum"));
    } else if (
      (also.has("dullness") || also.has("brightening") || also.has("scarring")) &&
      a.concern !== "dullness" &&
      a.concern !== "brightening" &&
      a.concern !== "scarring" &&
      a.concern !== "breakouts"
    ) {
      const why = also.has("scarring")
        ? "Marks you also flagged. Glow booster in the morning. Undiluted only on a leftover mark, never around the eyes."
        : also.has("brightening")
          ? "Dark spots you also flagged. Glow booster in the morning, one pump into your serum."
          : "Dullness you also flagged. Glow booster in the morning, on top of hydration.";
      am.push(item(FACE.addsGlow, "Boost", why));
    }
  }

  const glowAlready =
    a.concern === "dullness" ||
    a.concern === "brightening" ||
    a.concern === "scarring" ||
    am.some((p) => p.id === "addsGlow") ||
    pm.some((p) => p.id === "addsGlow");
  if (
    !glowAlready &&
    (also.has("scarring") || also.has("brightening") || (full && also.has("dullness")))
  ) {
    const why = also.has("scarring")
      ? "Marks you also flagged. Glow booster in the morning. Undiluted only on a leftover mark, never around the eyes. Shake first."
      : also.has("brightening")
        ? "Dark spots you also flagged. Glow booster in the morning, one pump into your serum. Shake first."
        : "Dullness you also flagged. Glow booster in the morning, on top of hydration.";
    am.push(item(FACE.addsGlow, "Boost", why));
  }

  // Eyes as add-on (not already primary) — secondary concern only, not every extra checkbox
  if (a.concern !== "eyes" && also.has("eyes")) {
    pm.push(
      item(FACE.eyeSerum, "Eyes", "You also flagged the eye area — evening is enough to start")
    );
  } else if (a.concern !== "eyes" && ex.includes("eyes") && full && a.concern !== "breakouts") {
    pm.push(item(FACE.eyeSerum, "Eyes", "Dedicated eye care for the thinnest skin on your face"));
  }

  // —— One booster max when it sharpens the #1 goal (full ritual only) ——
  if (full) {
    if (a.concern === "aging" && !sensitiveAging && a.skinType !== "sensitive") {
      am.push(
        item(
          FACE.addsEffect,
          "Boost",
          "Ringana pairs this with anti wrinkle serum — paracress for expression lines"
        )
      );
    }
  }

  // —— Moisturise (essential seal) ——
  let cream;
  if (ex.includes("men")) {
    cream = FACE.menMoisturiser;
  } else if (
    a.skinType === "oily" ||
    (a.concern === "breakouts" && a.skinType !== "dry" && !hasConcern("dehydration"))
  ) {
    cream = FACE.creamLight;
  } else if (a.skinType === "dry" || hasConcern("dehydration") || dryClimate || sensitiveAging) {
    cream = FACE.creamRich;
  } else {
    cream = FACE.creamMedium;
  }

  const creamWhy = ex.includes("men")
    ? "One-step men's care — plant-active moisture without a long ritual"
    : cream.id === "creamLight"
      ? "Copper PCA regulates sebum and cellulose mattes — formulated for oil, not just thinned down"
      : cream.id === "creamRich"
        ? sensitiveAging
          ? "Sensitive + firmness goals — a cushioning cream so retinoid-type actives don't leave you tight"
          : hasConcern("dehydration")
            ? "Thirsty skin needs butters and plant oils — not a thinner cream"
            : "Butters and plant oils for skin that loses moisture faster than it holds it"
        : a.skinType === "sensitive"
          ? "Medium is the one sensitive skin most often gets along with"
          : "The balanced middle ground for combination skin";

  am.push(item(cream, "Moisturise", creamWhy));
  pm.push(item(cream, "Moisturise", "Seal everything in overnight"));

  // Recovery — only when they flagged barrier, and not on top of a clear-out treat
  if (!minimal && also.has("barrier") && a.concern !== "breakouts") {
    pm.push(
      item(FACE.skinPerfection, "Recover", "Stressed barrier — rebuild before you pile on more actives")
    );
  }

  // Nice-to-haves — only when explicitly asked, and never in the morning pile for after sun
  if (full && ex.includes("tint")) {
    am.push(item(FACE.tinted, "Perfect", "Light coverage over your moisturiser — skincare first"));
  }
  if (full && ex.includes("lips")) {
    am.push(item(FACE.lipBalm, "Lips", "Clean, intensive lip care — zero petroleum"));
  }

  // After sun: only when they asked for it — never from climate alone, never AM
  if (ex.includes("afterSun")) {
    pm.push(
      item(
        FACE.afterSun,
        "As needed · after sun",
        "After-sun care with a soft glow boost — use after outdoor days, not as a morning step"
      )
    );
  }

  // Weekly — prefer one polish, not mask + scrub stacked
  const wantMask = full || ex.includes("mask");
  const wantScrub =
    ex.includes("scrub") || (full && hasConcern("dullness") && a.skinType !== "sensitive" && !also.has("barrier"));

  if (wantMask) {
    const oilyishMask = a.skinType === "oily" || a.concern === "breakouts";
    const gentleMask = a.skinType === "sensitive" || a.skinType === "dry" || also.has("barrier");
    let mask = FACE.exfoliatingMask;
    let maskWhy = "Fruit enzymes plus mild PHA — the weekly reset without grit";
    if (gentleMask) {
      mask = FACE.enzymeMask;
      maskWhy = "Enzymes, not grit — and every other week is plenty for your skin";
    } else if (oilyishMask) {
      mask = FACE.purifyingMask;
      maskWhy = "Clay that drinks extra oil, with panthenol so you don't end up tight";
    } else if (a.concern === "aging" || also.has("aging")) {
      mask = FACE.peptideMask;
      maskWhy = "Peptides and paracress for a weekly firming pause — rinse off or leave on";
    }
    weekly.push(item(mask, "1–2× weekly", maskWhy));
  }
  if (wantScrub && !wantMask) {
    weekly.push(
      item(FACE.scrub, "1× weekly", "Gentle face & body polish — once a week is plenty")
    );
  } else if (wantScrub && wantMask && ex.includes("scrub")) {
    weekly.push(
      item(
        FACE.scrub,
        "1× weekly · alternate",
        "Skip the same week as your mask if your skin is easily stressed"
      )
    );
  }

  return { am, pm, weekly };
}

export function buildBody(a) {
  const out = [];
  const raw = a.swaps || [];
  const auto = raw.includes("auto") || raw.length === 0;
  const has = (k) => auto || raw.includes(k);
  const bx = a.bodyExtras || [];

  const milk = a.bodySkin === "veryDry" ? BODY.bodyMilkRich : BODY.bodyMilk;
  const skinWhy = {
    veryDry: "Body milk rich — oat cushion for flaky, itchy, winter-worn skin",
    normal: "Body milk light — enough to matter without feeling heavy",
    sensitiveBody: "Oat is one of the most reliably calming ingredients there is",
  }[a.bodySkin] || "Long-lasting body hydration";

  // Auto path: smart everyday base
  if (auto) {
    out.push(item(BODY.bodyWash, "Shower", a.bodySkin === "sensitiveBody"
      ? "NBC7's prebiotics and postbiotics rebuild the barrier instead of stripping it"
      : "The microbiome-friendly swap — seven pre- and postbiotic ingredients"));
    out.push(item(milk, "Body", skinWhy));
    out.push(item(BODY.deodorant, "Deodorant", "No aluminium salts; lemon verbena supports sweat regulation rather than blocking it"));
    out.push(item(BODY.handBalm, "Hands", "Light enough to reapply constantly — and it works on pigment spots"));
    if (bx.includes("legs")) {
      out.push(item(BODY.lightLegs, "Legs", "Cooling care for heavy, tired, end-of-day legs"));
    }
    if (bx.includes("afterSun")) {
      out.push(item(FACE.afterSun, "After sun", "Post-outdoor soothe + soft glow — for body as much as face"));
    }
    if (bx.includes("scrub")) {
      out.push(item(FACE.scrub, "Polish", "Face & body scrub when you want a physical reset"));
    }
    if (a.hairType !== "skipHair") {
      out.push(a.hairType === "fine"
        ? item(BODY.volumeShampoo, "Shampoo", "Fine hair — mushroom complex and fermented rice water for body and strength")
        : item(BODY.shampoo, "Shampoo", a.hairType === "dry"
          ? "Repair shampoo — scalp microbiome care when hair feels dry or brittle"
          : "NBC7 supports the scalp microbiome, plus rosemary for antioxidant protection"));
      out.push(item(BODY.hairTreatment, "Condition", a.hairType === "dry"
        ? "Dry, brittle hair needs nutrients sealed in — that's this product's job"
        : "Detangling, shine, and care that stays put"));
    }
    return out;
  }

  const wantsTrio = has("lotion") && has("hands") && has("feet");
  if (wantsTrio) {
    out.push(item(BODY.bodySet, "Head to toe", "You want body, hands and feet — Ringana's own base-care trio, in one"));
  } else {
    if (has("lotion")) out.push(item(milk, "Body", skinWhy));
    if (has("hands") || bx.includes("handsExtra")) {
      out.push(item(BODY.handBalm, "Hands", bx.includes("handsExtra")
        ? "Hands that take a beating — reapply after every wash"
        : "Light enough to reapply constantly — and it works on pigment spots"));
    }
    if (has("feet") || bx.includes("feetExtra")) {
      out.push(item(BODY.footBalm, "Feet", "Fast-absorbing repair for the part of you that works hardest"));
    }
  }

  if (has("wash")) {
    out.push(item(BODY.bodyWash, "Shower", a.bodySkin === "sensitiveBody"
      ? "NBC7's prebiotics and postbiotics rebuild the barrier instead of stripping it"
      : "The microbiome-friendly swap — seven pre- and postbiotic ingredients"));
  }
  if (has("handSoap")) out.push(item(BODY.soapLiquid, "Hand soap", "The bottle your family touches twenty times a day — worth getting right"));
  if (has("deo")) out.push(item(BODY.deodorant, "Deodorant", "No aluminium salts; lemon verbena supports sweat regulation rather than blocking it"));
  if (has("legs") || bx.includes("legs")) {
    out.push(item(BODY.lightLegs, "Legs", "Cooling botanical care for heavy, tired, or heat-swollen legs"));
  }
  if (bx.includes("afterSun")) {
    out.push(item(FACE.afterSun, "After sun", "Soothe after outdoor days and support a soft, even glow — not SPF"));
  }
  if (bx.includes("scrub")) {
    out.push(item(FACE.scrub, "Polish", "Gentle face & body scrub — once a week is plenty"));
  }

  const includeHair =
    a.hairType !== "skipHair" && (has("shampoo") || has("conditioner"));

  if (includeHair) {
    if (has("shampoo")) {
      out.push(a.hairType === "fine"
        ? item(BODY.volumeShampoo, "Shampoo", "Fine hair — mushroom complex and fermented rice water for body and strength")
        : item(BODY.shampoo, "Shampoo", a.hairType === "dry"
          ? "Repair shampoo when hair feels dry or brittle"
          : "NBC7 supports the scalp microbiome, plus rosemary for antioxidant protection"));
    }
    if (has("conditioner") || a.hairType === "dry") {
      out.push(item(BODY.hairTreatment, "Condition", a.hairType === "dry"
        ? "Dry, brittle hair needs nutrients sealed in — that's this product's job"
        : "Detangling, shine, and care that stays put"));
    }
  }

  if (has("oral")) out.push(item(BODY.toothOil, "Oral care", "Certified-organic oil pulling for teeth and gums"));
  if (has("wipes")) out.push(item(BODY.stayFresh, "Fresh-up", "Plastic-free, and genuinely more effective than a dry-paper compromise"));

  return out;
}

/** Normalize approach + goals + lifestyle from new or legacy answer shapes. */
function resolveSuppAnswers(a) {
  let approach = a.approach;
  if (!approach) {
    if (a.foundation === "foundation") approach = "both";
    else if (a.foundation === "targeted") approach = "targeted";
    else if (a.goal === "energy") approach = "overall";
    else approach = "targeted";
  }

  let goals = Array.isArray(a.goals) ? [...a.goals] : [];
  if (!goals.length && a.goal) {
    if (a.goal === "gut") goals.push("gut");
    else if (a.goal === "gutMicro" || a.goal === "gutFibre") goals.push("gut");
    else goals.push(a.goal);
  }
  // Legacy extras → lifestyle
  const lifestyle = [
    ...(Array.isArray(a.lifestyle) ? a.lifestyle : []),
    ...(a.suppExtras || []),
  ];
  (a.suppExtras || []).forEach((x) => {
    if (x === "nofish" && !lifestyle.includes("lowFish")) lifestyle.push("lowFish");
    if (x === "meals" && !lifestyle.includes("heavyMeals")) lifestyle.push("heavyMeals");
  });

  goals = [...new Set(goals)].slice(0, 3);
  const life = [...new Set(lifestyle)].slice(0, 4);
  const depth = a.suppDepth || "balanced";
  return { approach, goals, lifestyle: life, depth };
}

export function buildSupp(a) {
  const { approach, goals, lifestyle, depth } = resolveSuppAnswers(a);
  const daily = [];
  const targeted = [];
  const seen = new Set();
  const life = (k) => lifestyle.includes(k);

  const addDaily = (p, why) => {
    if (!p?.id || seen.has(p.id)) return;
    seen.add(p.id);
    daily.push({ ...p, why });
  };
  const addTargeted = (p, why) => {
    if (!p?.id || seen.has(p.id)) return;
    seen.add(p.id);
    targeted.push({ ...p, why });
  };

  const wantFoundation = approach === "overall" || approach === "both";
  const wantTargeted = approach === "targeted" || approach === "both";

  if (wantFoundation) {
    addDaily(
      SUPP.packsABC,
      "Overall foundation — freeze-dried antiox, balancing greens, and fibre + cultures in one daily trio"
    );
  }

  const mapGoal = (g) => {
    switch (g) {
      case "immune":
        addTargeted(SUPP.immu, "Everyday immune resilience — medicinal mushrooms with vitamins C and D3");
        if (!wantFoundation) addTargeted(SUPP.packAntiox, "Plant antioxidant backup that pairs with CAPS immu");
        break;
      case "gut":
      case "gutMicro":
      case "gutFibre":
        addTargeted(SUPP.biotic, "Multi-strain live cultures for microbiome support");
        if (!wantFoundation) {
          addTargeted(SUPP.packCleansing, "Plant fibre that feeds the cultures and supports regularity");
        }
        break;
      case "meals":
        addTargeted(SUPP.dgest, "Digestive enzyme support for meals that sit heavy");
        break;
      case "focus":
        addTargeted(SUPP.cerebro, "Formulated for concentration, learning and recall");
        break;
      case "mood":
        addTargeted(SUPP.moodoo, "Plant extracts with magnesium and B vitamins for calm balance");
        break;
      case "joints":
        addTargeted(SUPP.flx, "A daily mobility drink — vegan collagen-type amino acids, chondroitin, and the minerals bones and muscles actually use");
        if (depth === "layered") {
          addTargeted(SUPP.move, "Capsule backup — highly absorbable turmeric and frankincense alongside the drink");
        }
        break;
      case "beauty":
        addTargeted(SUPP.beautyHair, "Beauty from within — skin, hair and nails");
        if (!life("lowFish") && !life("plantHeavy") && !goals.includes("omega")) {
          addTargeted(SUPP.omega, "Plant omega-3 that rounds out beauty-from-within");
        }
        break;
      case "energy":
        if (!wantFoundation) {
          addTargeted(SUPP.packBalancing, "Greens and minerals for acid–base balance and everyday steadiness");
        }
        break;
      case "longevity":
        addTargeted(SUPP.spermidine, "Cellular renewal support for the long game");
        break;
      case "screens":
        addTargeted(SUPP.protect, "Inner antioxidant shield for screen-heavy, light-exposed days");
        break;
      case "omega":
      case "nofish":
        addTargeted(SUPP.omega, "Plant omega-3 (DHA/EPA) from microalgae — no fish required");
        break;
      case "women":
        addTargeted(SUPP.fem, "Women's nutritional balance — iron, folate and plant extracts (not a diagnosis)");
        break;
      case "men":
        addTargeted(SUPP.mascu, "Formulated for men's everyday vitality");
        break;
      case "bladder":
        addTargeted(SUPP.hydro, "Gentle support for bladder and mucous-membrane wellbeing");
        break;
      case "antiox":
        if (!wantFoundation) {
          addTargeted(SUPP.packAntiox, "Freeze-dried plant antioxidants for oxidative-stress support");
        }
        break;
      default:
        break;
    }
  };

  const applyLifestyle = () => {
    if (life("heavyMeals") || life("meals")) {
      addTargeted(SUPP.dgest, "You noted meals that sit heavy — enzyme support with the meal");
    }
    if (life("lowFish") || life("nofish") || life("plantHeavy")) {
      addTargeted(SUPP.omega, "Little fish / plant-forward diet — algae DHA and EPA fill the gap");
    }
    if (life("screens") || life("outdoor")) {
      addTargeted(
        SUPP.protect,
        life("screens")
          ? "Screen-lit days — inner support for light and oxidative stress"
          : "Outdoors a lot — inner antioxidant support for light and environmental stress"
      );
    }
    if (life("women")) {
      addTargeted(SUPP.fem, "Women's nutritional balance for this season of life (educational support only)");
    }
    if (life("men")) {
      addTargeted(SUPP.mascu, "Men's vitality support matched to what you selected");
    }
    if (life("bladder")) {
      addTargeted(SUPP.hydro, "Bladder comfort interest — gentle botanical and micronutrient support");
    }
    if (life("stressed") || life("darkerMonths")) {
      if (!goals.includes("mood")) {
        addTargeted(SUPP.moodoo, "High-stress or darker-month stretch — calm and balance support");
      }
      if (life("stressed") && !goals.includes("immune") && depth !== "lean") {
        addTargeted(SUPP.immu, "Busy seasons often call for immune resilience backup");
      }
    }
    if (life("active") && !goals.includes("joints")) {
      addTargeted(SUPP.flx, "Active weeks — a daily sip for joints, cartilage and muscles, not just another capsule");
    }
  };

  const shouldLayer =
    wantTargeted || (approach === "overall" && (goals.length > 0 || lifestyle.length > 0));

  if (shouldLayer) {
    goals.forEach(mapGoal);
    applyLifestyle();
  }

  // Overall-only with nothing selected
  if (approach === "overall" && goals.length === 0 && lifestyle.length === 0) {
    return { daily, targeted: [], approach, goals, lifestyle, depth };
  }

  // Targeted with nothing selected: suggest foundation
  if (approach === "targeted" && targeted.length === 0) {
    addDaily(
      SUPP.packsABC,
      "No specific goals selected — starting with the overall daily foundation is the safest first step"
    );
  }

  const maxTargeted =
    depth === "lean" ? 2 : depth === "layered" ? approach === "overall" ? 4 : 6 : approach === "overall" ? 3 : 5;

  return {
    daily,
    targeted: targeted.slice(0, maxTargeted),
    approach,
    goals,
    lifestyle,
    depth,
  };
}

export function summarizeAnswers(ans, path) {
  const bits = [];
  if (path === "skin" || path === "both") {
    const skin = { dry: "Dry skin", oily: "Oily skin", combo: "Combination skin", sensitive: "Sensitive skin" }[ans.skinType];
    const concern = {
      aging: "fine lines & firmness",
      dehydration: "dehydration",
      breakouts: "breakouts",
      dullness: "dullness",
      brightening: "dark spots & brightening",
      scarring: "marks & scarring",
      eyes: "eye care",
    }[ans.concern];
    const cleanseLabel = {
      soap: "liquid soap cleanse",
      cream: "cream cleanser only",
      water: "micellar water",
      both: "cream at night, water in the morning",
    }[ans.cleanse];
    if (skin) bits.push(skin);
    if (concern) bits.push(concern);
    if (cleanseLabel) bits.push(cleanseLabel);
    if ((ans.also || []).includes("barrier")) bits.push("barrier support");
    if (ans.makeup === "yes") bits.push("makeup days");
    if (ans.climate === "sunSeason") bits.push("outdoor / sun season");
    if (ans.depth === "minimal") bits.push("lean ritual");
    if (ans.depth === "full") bits.push("full ritual");
  }
  if (path === "supp" || path === "both") {
    const { approach, goals, lifestyle, depth } = resolveSuppAnswers(ans);
    const approachLabel = {
      overall: "overall foundation",
      targeted: "targeted support",
      both: "foundation + targeted",
    }[approach];
    if (approachLabel) bits.push(approachLabel);
    const goalLabels = {
      immune: "immune resilience",
      gut: "gut & digestion",
      gutMicro: "gut & digestion",
      gutFibre: "gut & digestion",
      focus: "focus",
      mood: "calm & balance",
      joints: "joints & mobility",
      beauty: "beauty from within",
      energy: "everyday energy",
      longevity: "long-game vitality",
    };
    goals.slice(0, 3).forEach((g) => {
      if (goalLabels[g]) bits.push(goalLabels[g]);
    });
    const lifeLabels = {
      stressed: "high-stress stretch",
      heavyMeals: "heavy meals",
      lowFish: "low fish",
      plantHeavy: "plant-based",
      screens: "screen-heavy days",
      active: "active lifestyle",
      women: "women's balance",
      men: "men's vitality",
      bladder: "bladder comfort",
      darkerMonths: "darker months",
      outdoor: "outdoors a lot",
    };
    lifestyle.slice(0, 2).forEach((k) => {
      if (lifeLabels[k]) bits.push(lifeLabels[k]);
    });
    if (depth === "lean") bits.push("lean stack");
    if (depth === "layered") bits.push("layered stack");
  }
  if (ans.intent === "starter") bits.push("first order");
  if (ans.intent === "upgrade") bits.push("fuller ritual");
  if (ans.intent === "curious") bits.push("learning");
  return bits.join(" · ");
}

/**
 * Rank unique products from the full match into a 3–5 item Start here set.
 */
export function buildHero(ans, path, face, body, supp) {
  const intent = ans.intent || "starter";
  const max =
    intent === "curious" ? 3 : intent === "starter" || ans.depth === "minimal" ? 4 : 5;

  const scores = new Map(); // id -> { product, score, why }

  const bump = (p, score, why) => {
    if (!p?.id) return;
    const prev = scores.get(p.id);
    if (!prev || score > prev.score) {
      scores.set(p.id, {
        ...p,
        step: "Start here",
        why: why || p.why,
        _score: score,
      });
    } else if (prev && score === prev.score && why && !prev.why) {
      scores.set(p.id, { ...prev, why });
    }
  };

  // Face priorities
  if (face) {
    const allFace = [...(face.am || []), ...(face.pm || []), ...(face.weekly || [])];
    const byId = {};
    allFace.forEach((p) => {
      if (!byId[p.id]) byId[p.id] = p;
    });

    // Core treat
    const sensitiveAging = ans.skinType === "sensitive" && ans.concern === "aging";
    if (ans.concern === "aging") {
      if (sensitiveAging) {
        bump(byId.hydroSerum || FACE.hydroSerum, 100, "Sensitive + firmness — barrier hydration leads");
        bump(byId.antiWrinkle || FACE.antiWrinkle, 92, "Your firmness goal — introduce every other night");
        bump(byId.skinPerfection || FACE.skinPerfection, 86, "Recovery support while you renew");
      } else {
        bump(byId.antiWrinkle || FACE.antiWrinkle, 100, "Your #1 face goal — retinoid-grade renewal without the irritation trade-off");
        if (intent !== "curious" && ans.depth !== "minimal") {
          bump(byId.addsEffect || FACE.addsEffect, 88, "Ringana pairs this with anti wrinkle serum for expression lines");
        }
        bump(byId.hydroSerum || FACE.hydroSerum, 72, "Hydration underneath makes retinoid-type actives play nicer");
      }
    } else if (ans.concern === "breakouts") {
      bump(byId.addsRepair || FACE.addsRepair, 98, "Your #1 face goal — clear without wrecking your barrier");
      bump(byId.hydroSerum || FACE.hydroSerum, 85, "Hydrated skin produces less compensatory oil");
      bump(byId.creamLight || FACE.creamLight, 78, "Formulated for oil — Copper PCA, not just a thinner cream");
    } else if (ans.concern === "dullness" || ans.concern === "brightening" || ans.concern === "scarring") {
      const glowHero =
        ans.concern === "scarring"
          ? "Your #1 — glow booster on the marks left behind"
          : ans.concern === "brightening"
            ? "Your #1 — glow booster for dark spots and uneven color"
            : "Your #1 — glow booster for skin that looks flat";
      bump(byId.addsGlow || FACE.addsGlow, 98, glowHero);
      bump(byId.hydroSerum || FACE.hydroSerum, 86, "Hydration underneath, so the brightening has something to sit on");
    } else if (ans.concern === "eyes") {
      bump(byId.eyeSerum || FACE.eyeSerum, 100, "Your #1 concern — dedicated care for the thinnest skin on your face");
      bump(byId.hydroSerum || FACE.hydroSerum, 80, "Whole-face hydration supports the eye area too");
    } else {
      bump(byId.hydroSerum || FACE.hydroSerum, 95, "Your #1 face goal — deep, lasting moisture at six depths");
    }

    // Cream always earns a seat for starters
    const cream =
      byId.menMoisturiser ||
      byId.creamRich ||
      byId.creamLight ||
      byId.creamMedium ||
      FACE.creamMedium;
    bump(cream, 70, cream.why || "Seals your treat step — matched to your skin type");

    const wantsMakeup = ans.makeup === "yes" || ans.makeup === "sometimes";
    const cleansePick = ans.cleanse || (ans.depth === "minimal" && !wantsMakeup ? "cream" : "both");
    if (cleansePick === "soap") {
      bump(byId.soapLiquid || BODY.soapLiquid, 74, "Your cleanse — FRESH soap liquid, the microbiome-friendly liquid soap, not the body wash");
    } else if (cleansePick === "water") {
      bump(byId.cleansingWater || FACE.cleansingWater, 74, "Your cleanse — micellar cleansing water");
    } else if (cleansePick === "cream") {
      bump(byId.cleanser || FACE.cleanser, 74, "Your cleanse — the cream cleanser, and nothing else");
    } else if (intent === "starter" || intent === "curious") {
      bump(byId.cleanser || FACE.cleanser, 68, "Night cream cleanser, morning cleansing water");
      bump(byId.cleansingWater || FACE.cleansingWater, 64, "The morning half of the cleanse");
    }

    if (ans.concern === "breakouts" || ans.skinType === "oily") {
      bump(byId.tonicPure || FACE.tonicPure, 68, "Clarifying tonic for oil and congestion");
    }
    if (byId.afterSun) {
      bump(byId.afterSun, 62, byId.afterSun.why || "After-sun soothe and soft glow");
    }
    if ((ans.also || []).includes("barrier") && byId.skinPerfection) {
      bump(byId.skinPerfection, 84, "You flagged a stressed barrier — recovery earns a Start here seat");
    }
  }

  // Body priorities — quieter on "both" so face/supp can share the shortlist
  const bodyScale = path === "both" ? 0.72 : 1;
  if (body?.length) {
    body.forEach((p) => {
      let score = 40;
      if (p.id === "deodorant") score = 82;
      if (p.id === "bodyWash") score = 75;
      if (p.id === "bodyMilk" || p.id === "bodyMilkRich" || p.id === "bodySet") score = 74;
      if (p.id === "lightLegs") score = 80;
      if (p.id === "afterSun") score = 70;
      if (p.id === "volumeShampoo" || p.id === "shampoo") score = 55;
      if (p.id === "handBalm") score = 50;
      if (p.id === "footBalm") score = 52;
      /* Pages exist. They are not orderable yet, so they stay in the routine
         and off the first-order shortlist. */
      if (p.id === "deodorant" || p.id === "lightLegs" || p.id === "hairTreatment") score = Math.min(score, 36);
      bump(p, Math.round(score * bodyScale), p.why);
    });
  }

  // Supp priorities — on "both", don't let ABC drown face heroes
  if (supp) {
    const dailyScore = path === "both" ? 78 : 92;
    const targetedBase = path === "both" ? 74 : 90;
    (supp.daily || []).forEach((p) => bump(p, dailyScore, p.why || "Your daily foundation"));
    (supp.targeted || []).forEach((p, idx) => {
      bump(p, targetedBase - idx * 8, p.why);
    });
  }

  // Starter / curious: prefer fewer boosters & extras
  if (intent === "starter" || intent === "curious" || ans.depth === "minimal") {
    ["addsEffect", "addsGlow", "addsRepair", "enzymeMask", "exfoliatingMask", "peptideMask", "purifyingMask", "tinted", "lipBalm", "skinPerfection"].forEach((id) => {
      const row = scores.get(id);
      if (row) scores.set(id, { ...row, _score: row._score - 25 });
    });
  }

  // Curious: soft buy — still show heroes but keep list tiny (already max 3)
  const ranked = [...scores.values()]
    .sort((a, b) => b._score - a._score)
    .slice(0, max)
    .map(({ _score, ...p }, idx) => ({
      ...p,
      step: `Priority ${idx + 1}`,
    }));

  const title =
    intent === "upgrade"
      ? "Your ritual shortlist"
      : intent === "curious"
        ? "Start learning here"
        : "Your first order";

  const subtitle =
    intent === "upgrade"
      ? "The ones worth starting with from your full match."
      : intent === "curious"
        ? "A few products to learn the line — start here, no rush."
        : "If you only order a handful, make it these.";

  return { title, subtitle, items: ranked };
}

function week1Cleanse(ans = {}) {
  const minimal = ans.depth === "minimal";
  const wantsMakeup = ans.makeup === "yes" || ans.makeup === "sometimes";
  const cleanse = ans.cleanse || (minimal && !wantsMakeup ? "cream" : "both");
  if (cleanse === "soap") {
    return "Morning and night: FRESH soap liquid. Lather, rinse, then moisturize. Don't add the cream cleanser.";
  }
  if (cleanse === "cream") return "Cream cleanser morning and night. Don't add micellar water.";
  if (cleanse === "water") return "Micellar water morning and night. That's the whole cleanse.";
  return "Morning: micellar water. Night: cream cleanser, then micellar water.";
}

export function buildPlaybook(ans, path, hero, face, body, supp) {
  const heroIds = new Set((hero?.items || []).map((p) => p.id));
  const stretch = [];
  const seen = new Set(heroIds);

  const consider = (list) => {
    (list || []).forEach((p) => {
      if (!p?.id || seen.has(p.id)) return;
      seen.add(p.id);
      stretch.push(p);
    });
  };

  if (face) {
    consider(face.am);
    consider(face.pm);
    consider(face.weekly);
  }
  consider(body);
  if (supp) {
    consider(supp.daily);
    consider(supp.targeted);
  }

  const week1 = [];
  if (path === "skin" || path === "both") {
    week1.push(week1Cleanse(ans));
    week1.push("Serum → cream every morning and night — a little goes far.");
    if (ans.concern === "aging") week1.push(ans.skinType === "sensitive"
      ? "Sensitive + firmness: hydro serum daily; anti wrinkle every other night until skin stays calm."
      : "If you're new to retinoid-type actives, start the anti wrinkle serum every other night.");
    else if (ans.concern === "breakouts") week1.push("Zone clarifying booster on active spots; give it 2–3 weeks before judging.");
    else week1.push("Give any new booster 2–3 weeks before you decide it's not for you.");
  }
  if (path === "supp" || path === "both") {
    const { approach } = resolveSuppAnswers(ans);
    if (approach === "overall") {
      week1.push("Start with PACKS ABC daily — antiox, balancing, cleansing — before adding capsules.");
    } else if (approach === "both") {
      week1.push("Take PACKS ABC as your daily base; add targeted capsules with the meal pattern on each label.");
    } else {
      week1.push("Take supplements with the meal pattern on the label — consistency beats stacking.");
    }
  }
  if (body?.some((p) => p.id === "deodorant")) {
    week1.push("Coming off antiperspirant? Give FRESH deodorant 2–3 weeks to recalibrate.");
  }
  while (week1.length < 3 && path) {
    week1.push("Patch-test new skincare if you're reactive — and when in doubt, message me your match.");
    break;
  }

  return {
    buyFirst: hero?.items || [],
    addNext: stretch.slice(0, 3),
    week1: week1.slice(0, 3),
  };
}

export function buildInsight(ans, path, heroItems = []) {
  const parts = [];
  const heroNames = (heroItems || []).slice(0, 3).map((p) => p.name);
  if (heroNames.length) {
    parts.push(
      `Start with ${heroNames.join(", ").replace(/, ([^,]*)$/, " and $1")} — those are the ones that fit your answers best.`
    );
  }

  if (path === "skin" || path === "both") {
    const skinLine = {
      dry: "Your skin runs dry, so we're prioritizing barrier repair and cushion — not stripping cleansers.",
      oily: "Your skin runs oilier, so clarifying steps and a sebum-smart cream lead — not just 'lighter' products.",
      combo: "Combination skin gets the balanced middle path — enough care without weighing the T-zone down.",
      sensitive: "Reactive skin needs harmony more than heroics — calm support and actives that don't pick fights.",
    }[ans.skinType];

    const concernLine = {
      aging: "Firmness and fine lines put anti wrinkle serum at the center of your treat step.",
      dehydration: "Thirst is the brief — hydro serum's six hyaluronic depths, sealed with the right cream.",
      breakouts: "Breakouts called the shot — clear, hydrate underneath, and don't strip the barrier.",
      dullness: "Dullness put hydration and the glow booster on the shortlist.",
      brightening: "Dark spots and brightening put the glow booster on the shortlist, on top of real hydration.",
      scarring: "Marks left behind put the glow booster on those spots. Undiluted only on a mark, never around the eyes.",
      eyes: "The eye area is the priority — dedicated serum, light enough for skin this thin.",
    }[ans.concern];

    if (skinLine) parts.push(skinLine);
    if (concernLine) parts.push(concernLine);
    if (ans.depth === "minimal") parts.push("You asked for lean, so the Start here list stays honest — no filler.");
  }

  if (path === "supp" || path === "both") {
    const { approach, goals, lifestyle, depth } = resolveSuppAnswers(ans);
    if (approach === "overall") {
      parts.push(
        goals.length || lifestyle.length
          ? "You chose overall foundation with focused add-ons — PACKS ABC leads, then a light targeted layer."
          : "You chose overall foundation — PACKS ABC (antiox, balancing, cleansing) is your daily base."
      );
    } else if (approach === "both") {
      parts.push("Foundation plus targeted — PACKS ABC underneath, then capsules and BEYOND matched to your goals and lifestyle notes.");
    } else {
      parts.push("Targeted support — matched from your wellbeing preferences and day-to-day notes.");
    }
    const goalLine = {
      immune: "Immune resilience sits high on your inside shortlist.",
      gut: "Gut comfort and digestion lead the targeted layer.",
      gutMicro: "Gut comfort and digestion lead the targeted layer.",
      gutFibre: "Gut comfort and digestion lead the targeted layer.",
      focus: "Focus and mental clarity called cognitive support to the front.",
      mood: "Calm and emotional balance sit at the center of your inside routine.",
      joints: "Joints and easy movement shape your mobility picks.",
      beauty: "Beauty from within means skin, hair and nails get a dedicated seat.",
      energy: "Steady everyday energy is covered by balancing greens in the foundation.",
      longevity: "Long-game vitality points to cellular renewal support.",
    };
    const first = goals.find((g) => goalLine[g]);
    if (first) parts.push(goalLine[first]);
    else if (lifestyle.includes("stressed") || lifestyle.includes("darkerMonths")) {
      parts.push("Your lifestyle notes pointed to stress or darker-month support.");
    } else if (lifestyle.includes("lowFish") || lifestyle.includes("plantHeavy")) {
      parts.push("A plant-forward or low-fish diet put plant omega-3 on the list.");
    }
    if (depth === "lean") parts.push("You asked for lean, so the inside shortlist stays tight.");
  }

  if (ans.intent === "curious") {
    parts.push("Since you're learning, treat this as a map — not a mandate to buy everything.");
  }

  return parts.slice(0, 4).join(" ");
}

export function countUniqueProducts(face, body, supp) {
  const ids = new Set();
  const add = (list) => (list || []).forEach((p) => ids.add(p.id));
  if (face) {
    add(face.am);
    add(face.pm);
    add(face.weekly);
  }
  add(body);
  if (supp) {
    add(supp.daily);
    add(supp.targeted);
  }
  return ids.size;
}

export function formatMatchSummary(summary, hero, playbook, quizUrl) {
  // Legacy alias — prefer formatTextBrief from lib/share.js
  const lines = [
    "My Fresh Match — Ringana with Taylor",
    summary ? `Profile: ${summary}` : null,
    "",
    "Start here:",
    ...(hero?.items || []).map((p, i) => `${i + 1}. ${p.name}`),
  ];
  if (playbook?.addNext?.length) {
    lines.push("", "Add next:", ...playbook.addNext.map((p) => `• ${p.name}`));
  }
  if (playbook?.week1?.length) {
    lines.push("", "Week 1:", ...playbook.week1.map((line) => `• ${line}`));
  }
  lines.push(
    "",
    "This is just a recommendation, not a prescription. Please check it with Taylor before you order.",
    "Educational match only — not medical advice.",
    quizUrl ? `Open match: ${quizUrl}` : null
  );
  return lines.filter((l) => l !== null).join("\n");
}

function shortLabel(product) {
  return String(product?.name || "").replace(/^(FRESH |CAPS |BEYOND |PACK |RINGANA )/i, "");
}

export function ritualSections(face, body, supp) {
  const sections = [];
  const pack = (title, list) => {
    const items = (list || []).filter((p) => p && (p.slug || p.id));
    if (!items.length) return;
    sections.push({
      title,
      items: items.map((p) => ({
        slug: p.slug || "",
        name: shortLabel(p),
        step: p.step || "",
        why: p.why || "",
      })),
    });
  };
  if (face) {
    pack("Morning", face.am);
    pack("Night", face.pm);
    pack("Weekly", face.weekly);
  }
  pack("Body & personal care", body);
  if (supp) {
    pack("Daily inside", supp.daily);
    pack("Targeted inside", supp.targeted);
  }
  return sections;
}

export function partnerNotes(ans = {}, path, playbook) {
  const notes = [...(playbook?.week1 || [])];
  if (ans.intent === "starter") notes.push("They asked for a first order — keep the open tight.");
  if (ans.intent === "upgrade") notes.push("They already have a ritual — treat this as upgrades, not a from-scratch kit.");
  if (ans.intent === "curious") notes.push("They're learning — a map, not a mandate to buy everything.");
  if (ans.cleanse === "soap") notes.push("They want a real wash — soap liquid only, not the cream cleanser.");
  else if (ans.cleanse === "cream") notes.push("Cream cleanser only — don't add micellar water.");
  else if (ans.cleanse === "water") notes.push("Micellar water is the whole cleanse.");
  else if (ans.cleanse === "both") notes.push("Morning is micellar water. Night is cream cleanser, then water.");
  if (ans.skinType === "sensitive") notes.push("Sensitive skin — go slow on new actives.");
  if ((ans.also || []).includes("barrier")) notes.push("Barrier is on their mind — rebuild before stacking more treat steps.");
  if (ans.climate === "sunSeason") notes.push("Outdoor / sun season — after-sun is as-needed, not a morning step.");
  if (path === "both") notes.push("Inside and out — they took the full match.");
  return [...new Set(notes.filter(Boolean))].slice(0, 7);
}

export function formatPartnerBrief({ summary = "", hero, ritual = [], notes = [] } = {}) {
  const lines = ["Took Fresh Match" + (summary ? ` — ${summary}` : ".")];
  const start = (hero?.items || []).map((p) => shortLabel(p)).filter(Boolean);
  if (start.length) {
    lines.push("");
    lines.push("Start here: " + start.join(", "));
  }
  if (ritual.length) {
    lines.push("");
    lines.push("Full match:");
    ritual.forEach((sec) => {
      const names = (sec.items || []).map((p) => p.name).filter(Boolean).join(", ");
      if (names) lines.push(`${sec.title} — ${names}`);
    });
  }
  if (notes.length) {
    lines.push("");
    lines.push("Need to know:");
    notes.forEach((n) => lines.push(`• ${n}`));
  }
  return lines.join("\n");
}
