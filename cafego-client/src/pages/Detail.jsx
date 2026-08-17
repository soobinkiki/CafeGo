import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, photo } from "../services/api";


// ============================================================
// GENERAL VISITOR HIGHLIGHTS
// ============================================================

function buildVisitorHighlights(summary) {
  if (!summary) {
    return [];
  }

  const warningWords = [
    "impolite",
    "rude",
    "unhelpful",
    "not helpful",
    "unfriendly",
    "poor service",
    "bad service",
    "terrible service",
    "slow service",

    "slow",
    "crowded",
    "noisy",
    "limited",
    "difficult",
    "inconsistent",
    "unreliable",

    "unreliable service",
    "unreliable delivery",
    "late delivery",
    "delivery issue",
    "delivery issues",

    "expensive",
    "overpriced",

    "poor",
    "bad",

    "long wait",
    "long waits",

    "complaint",
    "complaints",

    "issue",
    "issues",

    "problem",
    "problems",

    "busy",

    "lack of",

    "can be hard",
    "hard to find",

    "not enough",
    "can be difficult",
    "can be frustrating"
  ];


  let pieces = summary
    .split(/(?<=[.!?])\s+/)

    .flatMap((sentence) =>
      sentence.split(
        /,\s+(?:along with|as well as|while)\s+|;\s+/i
      )
    )

    .map((text) =>
      text
        .replace(/^People say\s+/i, "")
        .replace(/^People also say\s+/i, "")
        .replace(/^They also highlight\s+/i, "")
        .replace(/^They highlight\s+/i, "")
        .replace(/^Some reviews mention\s+/i, "")
        .replace(/^Some reviewers mention\s+/i, "")
        .replace(/^Reviewers mention\s+/i, "")
        .replace(/^Visitors mention\s+/i, "")
        .replace(/^Customers mention\s+/i, "")
        .replace(/[.!]$/, "")
        .trim()
    )

    .filter((text) =>
      text.length > 8
    );


  pieces =
    [...new Set(pieces)]
      .slice(0, 6);


  return pieces.map((text) => {
    const lower =
      text.toLowerCase();


    const isWarning =
      warningWords.some((word) =>
        lower.includes(word)
      );


    return {
      text:
        text.charAt(0).toUpperCase() +
        text.slice(1),

      type:
        isWarning
          ? "warning"
          : "positive"
    };
  });
}


// ============================================================
// TEXT HELPER
// ============================================================

function containsAny(
  source,
  phrases
) {
  return phrases.some(
    (phrase) =>
      source.includes(phrase)
  );
}


// ============================================================
// REVIEW SOURCE TEXT
// ============================================================

function buildReviewSource(
  summary,
  reviews
) {
  const reviewText =
    (reviews || [])
      .map(
        (review) =>
          review.text || ""
      )
      .join(" ");


  return `${summary || ""} ${reviewText}`
    .toLowerCase();
}


// ============================================================
// PARKING — GOOGLE STRUCTURED DATA
// ============================================================

function getParkingLabels(
  parkingOptions
) {
  if (
    !parkingOptions ||
    !parkingOptions.hasKnownInfo
  ) {
    return [];
  }


  const items = [];


  if (
    parkingOptions.freeParkingLot === true
  ) {
    items.push(
      "Free lot"
    );
  }


  if (
    parkingOptions.paidParkingLot === true
  ) {
    items.push(
      "Paid lot"
    );
  }


  if (
    parkingOptions.freeStreetParking === true
  ) {
    items.push(
      "Free street"
    );
  }


  if (
    parkingOptions.paidStreetParking === true
  ) {
    items.push(
      "Paid street"
    );
  }


  if (
    parkingOptions.freeGarageParking === true
  ) {
    items.push(
      "Free garage"
    );
  }


  if (
    parkingOptions.paidGarageParking === true
  ) {
    items.push(
      "Paid garage"
    );
  }


  if (
    parkingOptions.valetParking === true
  ) {
    items.push(
      "Valet"
    );
  }


  return items;
}


// ============================================================
// PARKING — REVIEW FALLBACK
// ============================================================

function getParkingReviewFallback(
  summary,
  reviews
) {
  const source =
    buildReviewSource(
      summary,
      reviews
    );


  const results = [];


  function add(
    text,
    type = "positive"
  ) {
    if (
      !results.some(
        (item) =>
          item.text === text
      )
    ) {
      results.push({
        text,
        type
      });
    }
  }


  // Negative first so we don't accidentally
  // label difficult parking as positive.

  if (
    containsAny(
      source,
      [
        "no parking",
        "parking is difficult",
        "parking can be difficult",
        "parking is hard",
        "parking can be hard",
        "hard to find parking",
        "difficult to find parking",
        "limited parking",
        "parking is limited",
        "not enough parking",
        "parking can be tough",
        "parking is tough"
      ]
    )
  ) {
    add(
      "Parking can be difficult",
      "warning"
    );

    return results;
  }


  if (
    containsAny(
      source,
      [
        "free parking",
        "parking is free",
        "free parking available",
        "free lot",
        "free parking lot"
      ]
    )
  ) {
    add(
      "Free parking mentioned"
    );
  }


  if (
    containsAny(
      source,
      [
        "easy parking",
        "parking is easy",
        "easy to park",
        "plenty of parking",
        "ample parking",
        "lots of parking"
      ]
    )
  ) {
    add(
      "Easy parking mentioned"
    );
  }


  if (
    containsAny(
      source,
      [
        "paid parking",
        "parking is paid",
        "paid parking lot"
      ]
    )
  ) {
    add(
      "Paid parking mentioned"
    );
  }


  if (
    containsAny(
      source,
      [
        "street parking"
      ]
    )
  ) {
    add(
      "Street parking mentioned"
    );
  }


  if (
    containsAny(
      source,
      [
        "garage parking",
        "parking garage"
      ]
    )
  ) {
    add(
      "Garage parking mentioned"
    );
  }


  if (
    containsAny(
      source,
      [
        "valet parking",
        "valet"
      ]
    )
  ) {
    add(
      "Valet parking mentioned"
    );
  }


  return results.slice(
    0,
    3
  );
}


// ============================================================
// WORK / STUDY ANALYSIS
// ============================================================

function buildWorkStudyHighlights(
  summary,
  reviews,
  parkingOptions
) {
  const source =
    buildReviewSource(
      summary,
      reviews
    );


  const results = [];


  function add(
    text,
    type = "positive"
  ) {
    if (
      !results.some(
        (item) =>
          item.text === text
      )
    ) {
      results.push({
        text,
        type
      });
    }
  }


  // ------------------------------------------------------------
  // STUDY / WORK
  // ------------------------------------------------------------

  const studyNegative =
    containsAny(
      source,
      [
        "not good for studying",
        "not ideal for studying",
        "hard to study",
        "difficult to study",
        "too noisy to study",

        "not good for working",
        "not ideal for working",
        "hard to work",

        "not laptop friendly",
        "not laptop-friendly"
      ]
    );


  const studyPositive =
    containsAny(
      source,
      [
        "good for studying",
        "great for studying",
        "ideal for studying",
        "perfect for studying",

        "great place to study",
        "good place to study",

        "study spot",
        "study cafe",
        "study café",

        "studying or working",
        "study or work",

        "good for working",
        "great for working",
        "ideal for working",

        "good place to work",
        "great place to work",

        "remote work",
        "remote working",

        "working on a laptop",

        "laptop friendly",
        "laptop-friendly"
      ]
    );


  if (studyNegative) {
    add(
      "May not be ideal for focused work or studying",
      "warning"
    );
  }

  else if (studyPositive) {
    add(
      "Good for studying or working"
    );
  }


  // ------------------------------------------------------------
  // SEATING
  // ------------------------------------------------------------

  const seatingNegative =
    containsAny(
      source,
      [
        "limited seating",
        "seating is limited",
        "few seats",
        "not enough seating",
        "hard to find a seat",
        "difficult to find a seat",
        "hard to get a seat"
      ]
    );


  const seatingPositive =
    containsAny(
      source,
      [
        "plenty of seating",
        "ample seating",
        "lots of seating",
        "a lot of seating",

        "lots of seats",
        "many seats",
        "plenty of seats",

        "spacious seating",
        "spacious cafe",
        "spacious café",
        "spacious atmosphere"
      ]
    );


  if (seatingNegative) {
    add(
      "Seating can be limited",
      "warning"
    );
  }

  else if (seatingPositive) {
    add(
      "Plenty of seating"
    );
  }


  // ------------------------------------------------------------
  // WI-FI
  // ------------------------------------------------------------

  const wifiNegative =
    containsAny(
      source,
      [
        "no wifi",
        "no wi-fi",

        "bad wifi",
        "bad wi-fi",

        "slow wifi",
        "slow wi-fi",

        "wifi issue",
        "wifi issues",

        "wi-fi issue",
        "wi-fi issues",

        "wifi problem",
        "wifi problems",

        "unreliable wifi",
        "unreliable wi-fi"
      ]
    );


  const wifiPositive =
    containsAny(
      source,
      [
        "good wifi",
        "good wi-fi",

        "great wifi",
        "great wi-fi",

        "fast wifi",
        "fast wi-fi",

        "free wifi",
        "free wi-fi",

        "reliable wifi",
        "reliable wi-fi",

        "wifi available",
        "wi-fi available"
      ]
    );


  if (wifiNegative) {
    add(
      "Wi-Fi issues are mentioned",
      "warning"
    );
  }

  else if (wifiPositive) {
    add(
      "Wi-Fi gets positive mentions"
    );
  }


  // ------------------------------------------------------------
  // OUTLETS
  // ------------------------------------------------------------

  const outletNegative =
    containsAny(
      source,
      [
        "no outlets",
        "no outlet",

        "few outlets",
        "limited outlets",

        "not enough outlets",

        "hard to find outlets",

        "lack of outlets",
        "lack of power outlets"
      ]
    );


  const outletPositive =
    containsAny(
      source,
      [
        "plenty of outlets",
        "lots of outlets",
        "many outlets",
        "ample outlets",

        "plenty of power outlets",
        "lots of power outlets",

        "outlets available",
        "power outlets available"
      ]
    );


  if (outletNegative) {
    add(
      "Power outlets may be limited",
      "warning"
    );
  }

  else if (outletPositive) {
    add(
      "Plenty of power outlets"
    );
  }


  // ------------------------------------------------------------
  // NOISE
  // ------------------------------------------------------------

  const noiseNegative =
    containsAny(
      source,
      [
        "very noisy",
        "really noisy",

        "can be noisy",
        "gets noisy",
        "too noisy",

        "very loud",
        "gets loud",
        "can get loud",

        "loud atmosphere"
      ]
    );


  const noisePositive =
    containsAny(
      source,
      [
        "quiet atmosphere",
        "quiet cafe",
        "quiet café",

        "peaceful atmosphere",
        "peaceful cafe",
        "peaceful café",

        "calm atmosphere",
        "calm environment"
      ]
    );


  if (noiseNegative) {
    add(
      "Can get noisy",
      "warning"
    );
  }

  else if (noisePositive) {
    add(
      "Quiet atmosphere"
    );
  }


  // ------------------------------------------------------------
  // CROWD
  // ------------------------------------------------------------

  if (
    containsAny(
      source,
      [
        "gets crowded",
        "can get crowded",
        "very crowded",
        "often crowded",
        "usually crowded",

        "packed during",
        "gets packed"
      ]
    )
  ) {
    add(
      "Can get crowded",
      "warning"
    );
  }


  // ------------------------------------------------------------
  // LONG STAYS
  // ------------------------------------------------------------

  if (
    containsAny(
      source,
      [
        "stayed for hours",
        "stay for hours",

        "work for hours",
        "worked for hours",

        "study for hours",
        "studied for hours",

        "long study session",
        "long study sessions",

        "long work session",
        "long work sessions"
      ]
    )
  ) {
    add(
      "Visitors mention staying for longer sessions"
    );
  }


  // ------------------------------------------------------------
  // PARKING STRUCTURED
  // ------------------------------------------------------------

  if (
    parkingOptions?.freeParkingLot === true
  ) {
    add(
      "Free parking lot available"
    );
  }


  if (
    parkingOptions?.freeGarageParking === true
  ) {
    add(
      "Free garage parking available"
    );
  }


  if (
    parkingOptions?.freeStreetParking === true
  ) {
    add(
      "Free street parking available"
    );
  }


  if (
    parkingOptions?.paidParkingLot === true
  ) {
    add(
      "Paid parking lot available"
    );
  }


  if (
    parkingOptions?.paidGarageParking === true
  ) {
    add(
      "Paid garage parking available"
    );
  }


  if (
    parkingOptions?.paidStreetParking === true
  ) {
    add(
      "Paid street parking available"
    );
  }


  if (
    parkingOptions?.valetParking === true
  ) {
    add(
      "Valet parking available"
    );
  }


  // ------------------------------------------------------------
  // PARKING REVIEW FALLBACK
  // ------------------------------------------------------------

  const structuredParkingFound =
    results.some(
      (item) =>
        item.text
          .toLowerCase()
          .includes("parking")
    );


  if (!structuredParkingFound) {
    const parkingFallback =
      getParkingReviewFallback(
        summary,
        reviews
      );


    parkingFallback.forEach(
      (item) => {
        add(
          item.text,
          item.type
        );
      }
    );
  }


  return results.slice(
    0,
    7
  );
}


// ============================================================
// REVIEW AVATAR
// ============================================================

function ReviewerAvatar({
  review
}) {
  const [
    imageFailed,
    setImageFailed
  ] =
    useState(false);


  const name =
    review.author?.displayName ||
    "Google user";


  const photoUri =
    review.author?.photoUri;


  const initial =
    name
      .charAt(0)
      .toUpperCase();


  if (
    !photoUri ||
    imageFailed
  ) {
    return (
      <div
        className="review-avatar-fallback"
        aria-label={name}
      >
        {initial}
      </div>
    );
  }


  return (
    <img
      className="review-avatar"
      src={photoUri}
      alt={name}
      referrerPolicy="no-referrer"

      onError={() =>
        setImageFailed(true)
      }
    />
  );
}


// ============================================================
// TIME / OPENING HOURS
// ============================================================

const WEEK_MINUTES =
  7 * 24 * 60;


const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];


function getCafeLocalTime(
  timeZoneId,
  nowDate
) {
  try {
    const formatter =
      new Intl.DateTimeFormat(
        "en-US",
        {
          timeZone:
            timeZoneId ||
            undefined,

          weekday:
            "long",

          year:
            "numeric",

          month:
            "2-digit",

          day:
            "2-digit",

          hour:
            "2-digit",

          minute:
            "2-digit",

          second:
            "2-digit",

          hourCycle:
            "h23"
        }
      );


    const parts =
      formatter.formatToParts(
        nowDate
      );


    const values = {};


    for (
      const part of parts
    ) {
      if (
        part.type !==
        "literal"
      ) {
        values[
          part.type
        ] =
          part.value;
      }
    }


    const dayName =
      values.weekday;


    const dayIndex =
      DAY_NAMES.indexOf(
        dayName
      );


    return {
      dayName,
      dayIndex,

      year:
        Number(
          values.year
        ),

      month:
        Number(
          values.month
        ),

      dateDay:
        Number(
          values.day
        ),

      hour:
        Number(
          values.hour
        ),

      minute:
        Number(
          values.minute
        ),

      second:
        Number(
          values.second
        )
    };
  }

  catch {
    const fallback =
      new Date(
        nowDate
      );


    return {
      dayName:
        DAY_NAMES[
          fallback.getDay()
        ],

      dayIndex:
        fallback.getDay(),

      year:
        fallback.getFullYear(),

      month:
        fallback.getMonth() +
        1,

      dateDay:
        fallback.getDate(),

      hour:
        fallback.getHours(),

      minute:
        fallback.getMinutes(),

      second:
        fallback.getSeconds()
    };
  }
}


function pointDateStamp(
  point
) {
  if (
    !point ||
    point.dateYear == null ||
    point.dateMonth == null ||
    point.dateDay == null
  ) {
    return null;
  }


  return Date.UTC(
    point.dateYear,
    point.dateMonth - 1,
    point.dateDay,

    point.hour || 0,
    point.minute || 0,
    0
  );
}


function cafeNowDateStamp(
  localTime
) {
  return Date.UTC(
    localTime.year,
    localTime.month - 1,
    localTime.dateDay,

    localTime.hour,
    localTime.minute,
    localTime.second || 0
  );
}


function getCurrentOpenStatus(
  currentPeriods,
  localTime,
  fallbackOpenNow
) {
  if (
    !Array.isArray(
      currentPeriods
    ) ||
    currentPeriods.length === 0
  ) {
    return fallbackOpenNow;
  }


  const nowStamp =
    cafeNowDateStamp(
      localTime
    );


  let foundDatePeriod =
    false;


  for (
    const period
    of currentPeriods
  ) {
    const open =
      period?.open;


    const close =
      period?.close;


    const openStamp =
      pointDateStamp(
        open
      );


    if (
      openStamp == null
    ) {
      continue;
    }


    foundDatePeriod =
      true;


    const closeStamp =
      pointDateStamp(
        close
      );


    if (
      closeStamp == null
    ) {
      if (
        nowStamp >=
        openStamp
      ) {
        return true;
      }

      continue;
    }


    if (
      nowStamp >=
        openStamp &&
      nowStamp <
        closeStamp
    ) {
      return true;
    }
  }


  if (foundDatePeriod) {
    return false;
  }


  return fallbackOpenNow;
}


function getActiveOpeningDay(
  regularPeriods,
  localTime
) {
  if (
    !Array.isArray(
      regularPeriods
    ) ||
    regularPeriods.length === 0
  ) {
    return null;
  }


  const nowWeekMinute =
    (
      localTime.dayIndex *
      24 *
      60
    ) +
    (
      localTime.hour *
      60
    ) +
    localTime.minute;


  for (
    const period
    of regularPeriods
  ) {
    const open =
      period?.open;


    const close =
      period?.close;


    if (
      open?.day == null
    ) {
      continue;
    }


    if (!close) {
      return open.day;
    }


    if (
      close.day == null
    ) {
      continue;
    }


    let openMinute =
      (
        open.day *
        24 *
        60
      ) +
      (
        (open.hour || 0) *
        60
      ) +
      (
        open.minute || 0
      );


    let closeMinute =
      (
        close.day *
        24 *
        60
      ) +
      (
        (close.hour || 0) *
        60
      ) +
      (
        close.minute || 0
      );


    if (
      closeMinute <=
      openMinute
    ) {
      closeMinute +=
        WEEK_MINUTES;
    }


    const candidateTimes = [
      nowWeekMinute,
      nowWeekMinute +
        WEEK_MINUTES
    ];


    const isInside =
      candidateTimes.some(
        (candidate) =>
          candidate >=
            openMinute &&
          candidate <
            closeMinute
      );


    if (isInside) {
      return open.day;
    }
  }


  return null;
}


// ============================================================
// VISIT DETAILS
// ============================================================

function VisitDetails({
  cafe,
  mobile = false
}) {
  return (
    <section
      className={`info visit-card ${
        mobile
          ? "mt-4"
          : "sticky"
      }`}
    >

      <div className="eyebrow">
        VISIT DETAILS
      </div>


      <h3>
        Plan your visit
      </h3>


      <p>
        {cafe.formattedAddress}
      </p>


      <div className="visit-action-stack">

        {cafe.googleMapsUri && (

          <a
            className="btn outline action-button w-100"
            href={
              cafe.googleMapsUri
            }
            target="_blank"
            rel="noreferrer"
          >
            Open in Google Maps
          </a>

        )}


        {cafe.websiteUri && (

          <a
            className="btn outline action-button w-100"
            href={
              cafe.websiteUri
            }
            target="_blank"
            rel="noreferrer"
          >
            Visit website
          </a>

        )}


        {cafe.nationalPhoneNumber && (

          <a
            className="btn outline action-button w-100"
            href={`tel:${cafe.nationalPhoneNumber}`}
          >
            Call cafe
          </a>

        )}

      </div>

    </section>
  );
}


// ============================================================
// DETAIL PAGE
// ============================================================

export default function Detail() {
  const { id } =
    useParams();


  const navigate =
    useNavigate();


  const [
    c,
    setC
  ] =
    useState(null);


  const [
    err,
    setErr
  ] =
    useState("");


  const [
    photoIndex,
    setPhotoIndex
  ] =
    useState(0);


  const [
    clockNow,
    setClockNow
  ] =
    useState(
      () => new Date()
    );


  // ============================================================
  // LOAD CAFE
  // ============================================================

  useEffect(() => {
    window.scrollTo(
      0,
      0
    );


    setPhotoIndex(0);


    api
      .detail(id)
      .then(setC)

      .catch(
        (e) =>
          setErr(
            e.message
          )
      );

  }, [id]);


  // ============================================================
  // UPDATE TIME EVERY MINUTE
  // ============================================================

  useEffect(() => {
    const timer =
      window.setInterval(
        () => {
          setClockNow(
            new Date()
          );
        },

        60 * 1000
      );


    return () => {
      window.clearInterval(
        timer
      );
    };
  }, []);


  // ============================================================
  // PHOTOS
  // ============================================================

  const pics =
    c?.photos || [];


  const visiblePhotos =
    useMemo(() => {
      if (!pics.length) {
        return [];
      }


      const count =
        Math.min(
          3,
          pics.length
        );


      return Array.from(
        {
          length: count
        },

        (_, offset) =>
          pics[
            (
              photoIndex +
              offset
            ) %
            pics.length
          ]
      );

  }, [
    pics,
    photoIndex
  ]);


  function previousPhotos() {
    if (!pics.length) {
      return;
    }


    setPhotoIndex(
      (current) =>
        (
          current -
          1 +
          pics.length
        ) %
        pics.length
    );
  }


  function nextPhotos() {
    if (!pics.length) {
      return;
    }


    setPhotoIndex(
      (current) =>
        (
          current +
          1
        ) %
        pics.length
    );
  }


  // ============================================================
  // ERROR / LOADING
  // ============================================================

  if (err) {
    return (
      <div className="container explore">

        <div className="alert alert-danger">
          {err}
        </div>

      </div>
    );
  }


  if (!c) {
    return (
      <div className="state">

        <div className="spinner-border" />

      </div>
    );
  }


  // ============================================================
  // MENU
  // ============================================================

  const foodDetails = [
    c.servesBreakfast &&
      "Breakfast",

    c.servesBrunch &&
      "Brunch",

    c.servesLunch &&
      "Lunch",

    c.servesDessert &&
      "Dessert",

    c.takeout &&
      "Takeout",

    c.servesCoffee &&
      "Coffee"

  ].filter(Boolean);


  // ============================================================
  // REVIEW SUMMARY
  // ============================================================

  const summaryText =
    c.reviewSummary?.text ||
    c.placeSummary?.text;


  const summaryDisclosure =
    c.reviewSummary
      ?.disclosureText ||
    c.placeSummary
      ?.disclosureText;


  const visitorHighlights =
    buildVisitorHighlights(
      summaryText
    );


  // ============================================================
  // PARKING
  // ============================================================

  const parkingLabels =
    getParkingLabels(
      c.parkingOptions
    );


  const parkingReviewFallback =
    getParkingReviewFallback(
      summaryText,
      c.reviews
    );


  // ============================================================
  // WORK & STUDY
  // ============================================================

  const workStudyHighlights =
    buildWorkStudyHighlights(
      summaryText,
      c.reviews,
      c.parkingOptions
    );


  // ============================================================
  // LOCAL CAFE TIME
  // ============================================================

  const cafeLocalTime =
    getCafeLocalTime(
      c.timeZoneId,
      clockNow
    );


  const calculatedOpenNow =
    getCurrentOpenStatus(
      c.currentOpeningPeriods,
      cafeLocalTime,
      c.openNow
    );


  const activeOpeningDay =
    calculatedOpenNow === true

      ? getActiveOpeningDay(
          c.regularOpeningPeriods,
          cafeLocalTime
        )

      : null;


  const highlightedDayIndex =
    calculatedOpenNow === true &&
    activeOpeningDay != null

      ? activeOpeningDay

      : cafeLocalTime.dayIndex;


  // ============================================================
  // PAGE
  // ============================================================

  return (
    <div className="container detail">


      {/* ========================================================
          BACK
      ======================================================== */}

      <button
        type="button"
        className="back back-button"
        onClick={() =>
          navigate(-1)
        }
      >

        <i className="bi bi-arrow-left" />

        <span>
          Back to results
        </span>

      </button>


      {/* ========================================================
          HEADER
      ======================================================== */}

      <div className="head">


        <div className="head-copy">

          <h1>
            {c.displayName}
          </h1>


          <div className="meta">

            {c.rating && (

              <span>

                ★{" "}

                <b>
                  {c.rating.toFixed(1)}
                </b>

                {" "}

                ({c.userRatingCount || 0})

              </span>

            )}


            {calculatedOpenNow != null && (

              <span
                className={
                  calculatedOpenNow
                    ? "greentxt"
                    : "redtxt"
                }
              >

                {calculatedOpenNow
                  ? "Open now"
                  : "Closed now"}

              </span>

            )}

          </div>


          <p>
            {c.formattedAddress}
          </p>

        </div>


        <div className="detail-action-row">

          {c.googleMapsUri && (

            <a
              className="btn outline action-button"
              href={
                c.googleMapsUri
              }
              target="_blank"
              rel="noreferrer"
            >
              Directions
            </a>

          )}


          {c.websiteUri && (

            <a
              className="btn outline action-button"
              href={
                c.websiteUri
              }
              target="_blank"
              rel="noreferrer"
            >
              Website
            </a>

          )}

          {c.nationalPhoneNumber && (
            <a
              className="btn outline action-button"
              href={`tel:${c.nationalPhoneNumber}`}
            >
              Call cafe
            </a>
          )}

        </div>

      </div>


      {/* ========================================================
          PHOTOS
      ======================================================== */}

      {pics.length > 0 && (

        <section
          className="photo-carousel"
          aria-label={`${c.displayName} photos`}
        >


          <div
            className={`photo-stage ${
              visiblePhotos.length === 1
                ? "single-photo"
                : ""
            }`}
          >


            {visiblePhotos.map(
              (
                pic,
                index
              ) => (

                <div
                  className="photo-frame"
                  key={`${pic.name}-${index}`}
                >


                  <img
                    src={photo(
                      pic.name,

                      index === 0
                        ? 1500
                        : 1000,

                      1000
                    )}

                    alt={`${c.displayName} photo ${
                      (
                        (
                          photoIndex +
                          index
                        ) %
                        pics.length
                      ) +
                      1
                    }`}
                  />


                  {pic
                    .authorAttributions
                    ?.[0]
                    ?.displayName && (

                    <div className="photo-credit detail-photo-credit">


                      {pic
                        .authorAttributions[0]
                        .uri ? (

                        <a
                          href={
                            pic
                              .authorAttributions[0]
                              .uri
                          }
                          target="_blank"
                          rel="noreferrer"
                        >

                          Photo:{" "}

                          {
                            pic
                              .authorAttributions[0]
                              .displayName
                          }

                        </a>

                      ) : (

                        <span>

                          Photo:{" "}

                          {
                            pic
                              .authorAttributions[0]
                              .displayName
                          }

                        </span>

                      )}


                    </div>

                  )}

                </div>

              )
            )}

          </div>


          {pics.length > 1 && (

            <>

              <button
                className="carousel-arrow carousel-arrow-left"
                type="button"
                onClick={
                  previousPhotos
                }
                aria-label="Previous photos"
              >
                <i className="bi bi-chevron-left" />
              </button>


              <button
                className="carousel-arrow carousel-arrow-right"
                type="button"
                onClick={
                  nextPhotos
                }
                aria-label="Next photos"
              >
                <i className="bi bi-chevron-right" />
              </button>


              <div className="photo-count">

                {photoIndex + 1}

                {" / "}

                {pics.length}

              </div>

            </>

          )}

        </section>

      )}


      {/* ========================================================
          MAIN
      ======================================================== */}

      <div className="row g-4 mt-3">


        <div className="col-lg-8">


          {/* ====================================================
              ABOUT
          ==================================================== */}

          <section className="info">


            <h2>
              About this cafe
            </h2>


            <div className="grid">


              {[
                [
                  "bi-clock",

                  "Hours",

                  c.weekdayDescriptions
                    ?.length ? (

                    <div className="hours-list">


                      {c.weekdayDescriptions.map(
                        (
                          day,
                          index
                        ) => {


                          const [
                            dayName,
                            ...timeParts
                          ] =
                            day.split(":");


                          const shortDays = {
                            Monday: "MON",
                            Tuesday: "TUE",
                            Wednesday: "WED",
                            Thursday: "THU",
                            Friday: "FRI",
                            Saturday: "SAT",
                            Sunday: "SUN"
                          };


                          const cleanDayName =
                            dayName.trim();


                          const rowDayIndex =
                            DAY_NAMES.indexOf(
                              cleanDayName
                            );


                          const isHighlighted =
                            rowDayIndex ===
                            highlightedDayIndex;


                          let highlightClass =
                            "";


                          if (isHighlighted) {

                            if (
                              calculatedOpenNow === true
                            ) {
                              highlightClass =
                                "hours-today-open";
                            }

                            else if (
                              calculatedOpenNow === false
                            ) {
                              highlightClass =
                                "hours-today-closed";
                            }

                            else {
                              highlightClass =
                                "hours-today";
                            }

                          }


                          return (

                            <div
                              className={`hours-row ${highlightClass}`}
                              key={index}
                            >


                              <span className="hours-day">

                                {
                                  shortDays[
                                    cleanDayName
                                  ] ||
                                  cleanDayName
                                }

                                {" : "}

                              </span>


                              <span className="hours-time">

                                {
                                  timeParts
                                    .join(":")
                                    .trim()
                                }

                              </span>


                            </div>

                          );

                        }
                      )}


                    </div>

                  ) : (
                    "Not listed"
                  )
                ],


                [
                  "bi-telephone",

                  "Phone",

                  c.nationalPhoneNumber ||
                    "Not listed"
                ],


                [
                  "bi-tree",

                  "Outdoor seating",

                  c.outdoorSeating == null

                    ? "Not listed"

                    : c.outdoorSeating

                      ? "Available"

                      : "Not available"
                ],


                [
                  "bi-person",

                  "Restroom",

                  c.restroom == null

                    ? "Not listed"

                    : c.restroom

                      ? "Available"

                      : "Not available"
                ]

              ].map(
                (item) => (

                  <div
                    className="item"
                    key={
                      item[1]
                    }
                  >


                    <i
                      className={`bi ${item[0]}`}
                    />


                    <div>

                      <b>
                        {item[1]}
                      </b>


                      <div>
                        {item[2]}
                      </div>

                    </div>

                  </div>

                )
              )}


              {/* =================================================
                  PARKING
              ================================================= */}

              <div className="item">


                <i className="bi bi-p-circle" />


                <div>

                  <b>
                    Parking
                  </b>


                  {/* Google structured parking */}

                  {parkingLabels.length > 0 ? (

                    <div className="parking-tags">

                      {parkingLabels.map(
                        (parking) => (

                          <span
                            className="parking-tag"
                            key={
                              parking
                            }
                          >
                            {parking}
                          </span>

                        )
                      )}

                    </div>

                  ) :


                  /* Review-based fallback */

                  parkingReviewFallback.length > 0 ? (

                    <div className="parking-tags">

                      {parkingReviewFallback.map(
                        (
                          parking,
                          index
                        ) => (

                          <span
                            className={`parking-tag ${
                              parking.type ===
                              "warning"
                                ? "parking-tag-warning"
                                : "parking-review-tag"
                            }`}
                            key={`parking-review-${index}`}
                          >
                            {parking.text}
                          </span>

                        )
                      )}

                    </div>

                  ) : (

                    <div>
                      Not listed
                    </div>

                  )}


                </div>

              </div>


            </div>

          </section>


          {/* ====================================================
              MOBILE PLAN YOUR VISIT
          ==================================================== */}

          <div className="d-lg-none">

            <VisitDetails
              cafe={c}
              mobile={true}
            />

          </div>


          {/* ====================================================
              MENU
          ==================================================== */}

          <section className="info mt-4">


            <h2>
              Menu & food
            </h2>


            {foodDetails.length > 0 ? (

              <>

                <p className="friendly-copy">

                  Here’s what’s currently listed for this cafe.

                </p>


                <div
                  className="food-tags"
                  aria-label="Cafe food and drink categories"
                >

                  {foodDetails.map(
                    (item) => (

                      <span
                        className="food-category"
                        key={
                          item
                        }
                      >
                        {item}
                      </span>

                    )
                  )}

                </div>

              </>

            ) : (

              <p className="friendly-copy mb-0">

                This cafe hasn’t shared detailed menu or food information here yet. Take a look at the photos, visit the cafe website, or give them a quick call before you go.

              </p>

            )}


            <div className="menu-action-row">

              {c.websiteUri && (

                <a
                  className="btn outline action-button"
                  href={
                    c.websiteUri
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  Check menu
                </a>

              )}

            </div>

          </section>


          {/* ====================================================
              WORK & STUDY
          ==================================================== */}

          {workStudyHighlights.length > 0 && (

            <section className="info mt-4">


              <div className="eyebrow">
                WORK & STUDY
              </div>


              <h2>
                Good to know
              </h2>


              <p className="friendly-copy">

                Helpful details for working, studying, or staying a little longer.

              </p>


              <div className="visitor-highlights">


                {workStudyHighlights.map(
                  (
                    item,
                    index
                  ) => (

                    <div
                      className="visitor-highlight"
                      key={`work-${index}`}
                    >


                      <div
                        className={`highlight-icon ${
                          item.type ===
                          "warning"

                            ? "highlight-warning"

                            : "highlight-positive"
                        }`}
                      >


                        <i
                          className={
                            item.type ===
                            "warning"

                              ? "bi bi-exclamation-triangle-fill"

                              : "bi bi-check-circle-fill"
                          }
                        />


                      </div>


                      <span>
                        {item.text}
                      </span>


                    </div>

                  )
                )}


              </div>


              <div className="work-study-note">

                Based on available Google place information and visitor reviews.

              </div>


            </section>

          )}


          {/* ====================================================
              WHAT VISITORS SAY
          ==================================================== */}

          {visitorHighlights.length > 0 && (

            <section className="info mt-4">


              <div className="eyebrow">
                CAFE SNAPSHOT
              </div>


              <h2>
                What visitors say
              </h2>


              <div className="visitor-highlights">


                {visitorHighlights.map(
                  (
                    item,
                    index
                  ) => (

                    <div
                      className="visitor-highlight"
                      key={
                        index
                      }
                    >


                      <div
                        className={`highlight-icon ${
                          item.type ===
                          "warning"

                            ? "highlight-warning"

                            : "highlight-positive"
                        }`}
                      >


                        <i
                          className={
                            item.type ===
                            "warning"

                              ? "bi bi-exclamation-triangle-fill"

                              : "bi bi-check-circle-fill"
                          }
                        />


                      </div>


                      <span>
                        {item.text}
                      </span>


                    </div>

                  )
                )}


              </div>


              {summaryDisclosure && (

                <div className="summary-disclosure">

                  {summaryDisclosure}

                </div>

              )}


              {c.reviewSummary?.reviewsUri && (

                <a
                  href={
                    c.reviewSummary
                      .reviewsUri
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="review-link"
                >

                  See all reviews on Google

                  <i className="bi bi-arrow-up-right ms-1" />

                </a>

              )}


            </section>

          )}


          {/* ====================================================
              RECENT REVIEWS
          ==================================================== */}

          {c.reviews?.length > 0 && (

            <section className="info mt-4">


              <div className="reviews-heading">


                <div>

                  <div className="eyebrow">
                    GOOGLE REVIEWS
                  </div>


                  <h2>
                    Recent reviews
                  </h2>

                </div>


                {c.rating && (

                  <span className="review-count">

                    {c.rating.toFixed(1)}

                    {" ★"}

                  </span>

                )}


              </div>


              <div className="reviews-list">


                {c.reviews.map(
                  (
                    review,
                    index
                  ) => (

                    <article
                      className="review-card"
                      key={`review-${index}`}
                    >


                      <div className="review-author-row">


                        <ReviewerAvatar
                          review={
                            review
                          }
                        />


                        <div>


                          {review.author?.uri ? (

                            <a
                              className="review-author"
                              href={
                                review
                                  .author
                                  .uri
                              }
                              target="_blank"
                              rel="noreferrer"
                            >

                              {
                                review
                                  .author
                                  .displayName ||
                                "Google user"
                              }

                            </a>

                          ) : (

                            <strong className="review-author">

                              {
                                review
                                  .author
                                  ?.displayName ||
                                "Google user"
                              }

                            </strong>

                          )}


                          <div className="review-meta">


                            {review.rating != null && (

                              <span className="review-stars">

                                {"★".repeat(
                                  Math.round(
                                    review.rating
                                  )
                                )}

                              </span>

                            )}


                            {review
                              .relativePublishTimeDescription && (

                              <span>

                                {
                                  review
                                    .relativePublishTimeDescription
                                }

                              </span>

                            )}


                          </div>


                        </div>


                      </div>


                      {review.text && (

                        <p className="review-text">

                          {review.text}

                        </p>

                      )}


                      {review.googleMapsUri && (

                        <a
                          className="review-google-link"
                          href={
                            review
                              .googleMapsUri
                          }
                          target="_blank"
                          rel="noreferrer"
                        >

                          View on Google Maps

                        </a>

                      )}


                    </article>

                  )
                )}


              </div>


            </section>

          )}


        </div>


        {/* ======================================================
            DESKTOP PLAN YOUR VISIT
        ====================================================== */}

        <aside className="col-lg-4 d-none d-lg-block">

          <VisitDetails
            cafe={c}
          />

        </aside>


      </div>


    </div>
  );
}