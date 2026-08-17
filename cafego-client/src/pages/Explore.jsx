import {
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import {
  useSearchParams
} from "react-router-dom";

import Search from "../components/Search";
import CafeCard from "../components/CafeCard";
import { api } from "../services/api";


// ============================================================
// SETTINGS
// ============================================================

const RESULTS_PER_PAGE = 20;


// ============================================================
// STORED LOCATION
// ============================================================

function readStoredLocation() {
  try {
    const value =
      sessionStorage.getItem(
        "cafego_user_location"
      );

    if (!value) {
      return null;
    }

    const parsed =
      JSON.parse(value);

    if (
      Number.isFinite(
        parsed.latitude
      ) &&
      Number.isFinite(
        parsed.longitude
      )
    ) {
      return parsed;
    }
  } catch {
    // Ignore invalid session data.
  }

  return null;
}


// ============================================================
// DISTANCE
// ============================================================

function milesBetween(a, b) {
  const toRad =
    (value) =>
      (value * Math.PI) /
      180;

  const earthRadiusMiles =
    3958.7613;

  const dLat =
    toRad(
      b.latitude -
      a.latitude
    );

  const dLng =
    toRad(
      b.longitude -
      a.longitude
    );

  const lat1 =
    toRad(
      a.latitude
    );

  const lat2 =
    toRad(
      b.latitude
    );

  const h =
    Math.sin(
      dLat / 2
    ) ** 2 +

    Math.cos(lat1) *
    Math.cos(lat2) *
    Math.sin(
      dLng / 2
    ) ** 2;

  return (
    2 *
    earthRadiusMiles *
    Math.asin(
      Math.sqrt(h)
    )
  );
}


// ============================================================
// DIRECTION
// ============================================================

function directionFrom(a, b) {
  const toRad =
    (value) =>
      (value * Math.PI) /
      180;

  const toDeg =
    (value) =>
      (value * 180) /
      Math.PI;

  const lat1 =
    toRad(
      a.latitude
    );

  const lat2 =
    toRad(
      b.latitude
    );

  const dLng =
    toRad(
      b.longitude -
      a.longitude
    );

  const y =
    Math.sin(dLng) *
    Math.cos(lat2);

  const x =
    Math.cos(lat1) *
      Math.sin(lat2) -

    Math.sin(lat1) *
      Math.cos(lat2) *
      Math.cos(dLng);

  const bearing =
    (
      toDeg(
        Math.atan2(
          y,
          x
        )
      ) +
      360
    ) %
    360;

  const directions = [
    "N",
    "NE",
    "E",
    "SE",
    "S",
    "SW",
    "W",
    "NW"
  ];

  return directions[
    Math.round(
      bearing / 45
    ) %
    8
  ];
}


// ============================================================
// EXPLORE
// ============================================================

export default function Explore() {
  const [params] =
    useSearchParams();

  const q =
    params.get("q") ||
    "";

  const lat =
    params.get("lat");

  const lng =
    params.get("lng");

  const nearFromUrl =
    params.get("near") ===
    "1";


  // ============================================================
  // LOCATION
  // ============================================================

  const initialLocation =
    lat && lng
      ? {
          latitude:
            Number(lat),

          longitude:
            Number(lng)
        }

      : readStoredLocation();


  const [
    userLocation,
    setUserLocation
  ] =
    useState(
      initialLocation
    );


  const [
    nearbyMode,
    setNearbyMode
  ] =
    useState(
      nearFromUrl
    );


  const [
    showLocationModal,
    setShowLocationModal
  ] =
    useState(false);


  const [
    pendingLocationAction,
    setPendingLocationAction
  ] =
    useState(null);


  const [
    locationMessage,
    setLocationMessage
  ] =
    useState("");


  // ============================================================
  // GOOGLE RESULTS / PAGINATION
  // ============================================================

  /*
    pages:

    {
      1: [...20 cafes],
      2: [...20 cafes],
      3: [...]
    }
  */

  const [
    pages,
    setPages
  ] =
    useState({});


  /*
    tokens:

    {
      1: "",
      2: "google-token-for-page-2",
      3: "google-token-for-page-3"
    }
  */

  const [
    tokens,
    setTokens
  ] =
    useState({
      1: ""
    });


  /*
    Google page currently being viewed
    when filters are OFF.
  */

  const [
    googlePage,
    setGooglePage
  ] =
    useState(1);


  /*
    CafeGo filtered pagination page.
  */

  const [
    filteredPage,
    setFilteredPage
  ] =
    useState(1);


  const [
    knownLastPage,
    setKnownLastPage
  ] =
    useState(null);


  /*
    true = we know there are no more
    Google result pages.
  */

  const [
    allGooglePagesLoaded,
    setAllGooglePagesLoaded
  ] =
    useState(false);


  const [
    busy,
    setBusy
  ] =
    useState(false);


  const [
    filterBusy,
    setFilterBusy
  ] =
    useState(false);


  const [
    err,
    setErr
  ] =
    useState("");


  // ============================================================
  // FILTERS / SORT
  // ============================================================

  const [
    sort,
    setSort
  ] =
    useState(
      nearFromUrl
        ? "closest"
        : "recommended"
    );


  const [
    openOnly,
    setOpenOnly
  ] =
    useState(false);


  const [
    outdoorOnly,
    setOutdoorOnly
  ] =
    useState(false);


  const [
    minRating,
    setMinRating
  ] =
    useState(0);


  const resultsTopRef =
    useRef(null);


  /*
    Prevent duplicate "load all pages"
    operations when several filters change
    quickly.
  */

  const collectingPagesRef =
    useRef(false);


  /*
    Every new search gets a generation ID.

    If an older async request finishes after
    a newer search has started, its results
    are ignored.
  */

  const searchGenerationRef =
    useRef(0);


  const hasSearch =
    Boolean(
      q ||
      userLocation
    );


  // ============================================================
  // ACTIVE FILTER?
  // ============================================================

  const hasActiveFilters =
    openOnly ||
    outdoorOnly ||
    minRating > 0;


  // ============================================================
  // RESET GOOGLE RESULTS
  // ============================================================

  function resetPages() {
    setPages({});

    setTokens({
      1: ""
    });

    setGooglePage(1);

    setFilteredPage(1);

    setKnownLastPage(null);

    setAllGooglePagesLoaded(false);

    setErr("");
  }


  // ============================================================
  // API REQUEST HELPER
  // ============================================================

  async function fetchGooglePage(
    token = "",
    modeOverride = null,
    locationOverride = null
  ) {
    const useNearby =
      modeOverride != null
        ? modeOverride
        : nearbyMode;


    const location =
      locationOverride ||
      userLocation;


    if (
      useNearby &&
      location
    ) {
      return api.nearby(
        location.latitude,
        location.longitude,
        token
      );
    }


    return api.search(
      q,
      token
    );
  }


  // ============================================================
  // INITIAL / URL SEARCH
  // ============================================================

  useEffect(() => {
    const generation =
      ++searchGenerationRef.current;


    async function runSearch() {
      resetPages();


      let useNearby =
        false;


      let location =
        readStoredLocation();


      if (
        lat &&
        lng
      ) {
        location = {
          latitude:
            Number(lat),

          longitude:
            Number(lng)
        };


        sessionStorage.setItem(
          "cafego_user_location",

          JSON.stringify(
            location
          )
        );


        setUserLocation(
          location
        );


        setNearbyMode(
          true
        );


        setSort(
          "closest"
        );


        useNearby =
          true;
      }

      else {
        setNearbyMode(
          false
        );


        useNearby =
          false;


        if (location) {
          setUserLocation(
            location
          );
        }
      }


      if (
        !q &&
        !useNearby
      ) {
        return;
      }


      setBusy(true);
      setErr("");


      try {
        const response =
          useNearby

            ? await api.nearby(
                location.latitude,
                location.longitude,
                ""
              )

            : await api.search(
                q,
                ""
              );


        if (
          generation !==
          searchGenerationRef.current
        ) {
          return;
        }


        const places =
          response?.places ||
          [];


        const nextPageToken =
          response?.nextPageToken ||
          null;


        setPages({
          1: places
        });


        if (nextPageToken) {
          setTokens({
            1: "",
            2: nextPageToken
          });


          setKnownLastPage(
            null
          );


          setAllGooglePagesLoaded(
            false
          );
        }

        else {
          setTokens({
            1: ""
          });


          setKnownLastPage(
            1
          );


          setAllGooglePagesLoaded(
            true
          );
        }


        setGooglePage(
          1
        );


        setFilteredPage(
          1
        );
      }

      catch (error) {
        if (
          generation ===
          searchGenerationRef.current
        ) {
          setErr(
            error.message
          );
        }
      }

      finally {
        if (
          generation ===
          searchGenerationRef.current
        ) {
          setBusy(
            false
          );
        }
      }
    }


    runSearch();


    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    q,
    lat,
    lng
  ]);


  // ============================================================
  // LOAD A SINGLE GOOGLE PAGE
  //
  // Used when filters are OFF and user
  // manually clicks page 2, page 3, etc.
  // ============================================================

  async function loadGooglePage(
    pageNumber
  ) {
    if (
      pageNumber < 1
    ) {
      return;
    }


    if (
      knownLastPage != null &&
      pageNumber >
        knownLastPage
    ) {
      return;
    }


    // Already loaded.
    if (
      pages[
        pageNumber
      ]
    ) {
      setGooglePage(
        pageNumber
      );


      scrollToResults();


      return;
    }


    const token =
      tokens[
        pageNumber
      ];


    if (
      !token
    ) {
      return;
    }


    const generation =
      searchGenerationRef.current;


    setBusy(
      true
    );


    setErr(
      ""
    );


    try {
      const response =
        await fetchGooglePage(
          token
        );


      if (
        generation !==
        searchGenerationRef.current
      ) {
        return;
      }


      const places =
        response?.places ||
        [];


      const nextPageToken =
        response?.nextPageToken ||
        null;


      setPages(
        (old) => ({
          ...old,

          [pageNumber]:
            places
        })
      );


      if (nextPageToken) {
        setTokens(
          (old) => ({
            ...old,

            [pageNumber + 1]:
              nextPageToken
          })
        );


        setKnownLastPage(
          null
        );


        setAllGooglePagesLoaded(
          false
        );
      }

      else {
        setKnownLastPage(
          pageNumber
        );


        setAllGooglePagesLoaded(
          true
        );
      }


      setGooglePage(
        pageNumber
      );


      scrollToResults();
    }

    catch (error) {
      setErr(
        error.message
      );
    }

    finally {
      setBusy(
        false
      );
    }
  }


  // ============================================================
  // AUTOMATICALLY LOAD ALL REMAINING GOOGLE PAGES
  //
  // Used only when a filter is active.
  //
  // After this finishes:
  //
  // pages = {
  //   1: [...],
  //   2: [...],
  //   3: [...]
  // }
  //
  // Then CafeGo filters the combined array.
  // ============================================================

  async function loadAllGooglePages() {
    if (
      allGooglePagesLoaded ||
      collectingPagesRef.current
    ) {
      return;
    }


    if (
      !pages[1]
    ) {
      return;
    }


    collectingPagesRef.current =
      true;


    setFilterBusy(
      true
    );


    setErr(
      ""
    );


    const generation =
      searchGenerationRef.current;


    try {
      let localPages = {
        ...pages
      };


      let localTokens = {
        ...tokens
      };


      let loadedPageNumbers =
        Object.keys(
          localPages
        )
          .map(Number)
          .sort(
            (a, b) =>
              a - b
          );


      let lastLoadedPage =
        loadedPageNumbers.length
          ? loadedPageNumbers[
              loadedPageNumbers.length -
              1
            ]
          : 1;


      let nextPageNumber =
        lastLoadedPage + 1;


      let nextToken =
        localTokens[
          nextPageNumber
        ];


      /*
        Example:

        page 1 loaded
        token[2] exists

        → fetch page 2
        → receive token[3]
        → fetch page 3
        → no next token
        → done
      */

      while (nextToken) {
        const response =
          await fetchGooglePage(
            nextToken
          );


        if (
          generation !==
          searchGenerationRef.current
        ) {
          return;
        }


        const places =
          response?.places ||
          [];


        const newNextToken =
          response?.nextPageToken ||
          null;


        localPages = {
          ...localPages,

          [nextPageNumber]:
            places
        };


        if (newNextToken) {
          localTokens = {
            ...localTokens,

            [nextPageNumber + 1]:
              newNextToken
          };
        }


        lastLoadedPage =
          nextPageNumber;


        nextPageNumber +=
          1;


        nextToken =
          newNextToken;
      }


      if (
        generation !==
        searchGenerationRef.current
      ) {
        return;
      }


      setPages(
        localPages
      );


      setTokens(
        localTokens
      );


      setKnownLastPage(
        lastLoadedPage
      );


      setAllGooglePagesLoaded(
        true
      );
    }

    catch (error) {
      setErr(
        error.message
      );
    }

    finally {
      collectingPagesRef.current =
        false;


      if (
        generation ===
        searchGenerationRef.current
      ) {
        setFilterBusy(
          false
        );
      }
    }
  }


  // ============================================================
  // WHEN FILTERS TURN ON
  //
  // Automatically collect remaining
  // Google result pages.
  // ============================================================

  useEffect(() => {
    setFilteredPage(
      1
    );


    if (
      !hasActiveFilters
    ) {
      return;
    }


    if (
      !pages[1]
    ) {
      return;
    }


    if (
      allGooglePagesLoaded
    ) {
      return;
    }


    loadAllGooglePages();


    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    openOnly,
    outdoorOnly,
    minRating,
    pages[1],
    allGooglePagesLoaded
  ]);


  // ============================================================
  // LOCATION REQUEST
  // ============================================================

  function requestLocation(
    action
  ) {
    if (userLocation) {
      if (
        action ===
        "closest"
      ) {
        activateNearbySearch();
      }

      return;
    }


    setPendingLocationAction(
      action
    );


    setShowLocationModal(
      true
    );
  }


  // ============================================================
  // NOT NOW
  // ============================================================

  function declineLocation() {
    sessionStorage.removeItem(
      "cafego_user_location"
    );


    setUserLocation(
      null
    );


    setShowLocationModal(
      false
    );


    if (
      pendingLocationAction ===
      "closest"
    ) {
      setSort(
        "recommended"
      );
    }


    setPendingLocationAction(
      null
    );


    setLocationMessage(
      ""
    );
  }


  // ============================================================
  // LOCATION CONFIRMED
  // ============================================================

  function confirmLocation() {
    setShowLocationModal(
      false
    );


    if (
      !navigator.geolocation
    ) {
      setLocationMessage(
        "Your browser does not support location access."
      );


      setPendingLocationAction(
        null
      );


      return;
    }


    setLocationMessage(
      "Finding your location..."
    );


    navigator.geolocation.getCurrentPosition(

      // SUCCESS

      (position) => {
        const value = {
          latitude:
            position.coords.latitude,

          longitude:
            position.coords.longitude
        };


        sessionStorage.setItem(
          "cafego_user_location",

          JSON.stringify(
            value
          )
        );


        setUserLocation(
          value
        );


        setLocationMessage(
          ""
        );


        if (
          pendingLocationAction ===
          "closest"
        ) {
          setPendingLocationAction(
            null
          );


          activateNearbySearch(
            value
          );


          return;
        }


        setPendingLocationAction(
          null
        );
      },


      // ERROR

      () => {
        sessionStorage.removeItem(
          "cafego_user_location"
        );


        setUserLocation(
          null
        );


        if (
          pendingLocationAction ===
          "closest"
        ) {
          setSort(
            "recommended"
          );
        }


        setPendingLocationAction(
          null
        );


        setLocationMessage(
          "Allow location access to show distance and direction from you."
        );
      },


      {
        enableHighAccuracy:
          false,

        timeout:
          10000
      }
    );
  }


  // ============================================================
  // ACTIVATE TRUE NEARBY SEARCH
  // ============================================================

  async function activateNearbySearch(
    locationOverride = null
  ) {
    const location =
      locationOverride ||
      userLocation;


    if (!location) {
      requestLocation(
        "closest"
      );

      return;
    }


    const generation =
      ++searchGenerationRef.current;


    setNearbyMode(
      true
    );


    setSort(
      "closest"
    );


    setLocationMessage(
      ""
    );


    resetPages();


    setBusy(
      true
    );


    try {
      const response =
        await api.nearby(
          location.latitude,
          location.longitude,
          ""
        );


      if (
        generation !==
        searchGenerationRef.current
      ) {
        return;
      }


      const places =
        response?.places ||
        [];


      const nextPageToken =
        response?.nextPageToken ||
        null;


      setPages({
        1: places
      });


      if (nextPageToken) {
        setTokens({
          1: "",
          2: nextPageToken
        });


        setKnownLastPage(
          null
        );


        setAllGooglePagesLoaded(
          false
        );
      }

      else {
        setTokens({
          1: ""
        });


        setKnownLastPage(
          1
        );


        setAllGooglePagesLoaded(
          true
        );
      }


      setGooglePage(
        1
      );


      setFilteredPage(
        1
      );
    }

    catch (error) {
      if (
        generation ===
        searchGenerationRef.current
      ) {
        setErr(
          error.message
        );
      }
    }

    finally {
      if (
        generation ===
        searchGenerationRef.current
      ) {
        setBusy(
          false
        );
      }
    }
  }


  // ============================================================
  // RETURN TO NORMAL CITY SEARCH
  // ============================================================

  async function activateNormalSearch(
    nextSort = "recommended"
  ) {
    const generation =
      ++searchGenerationRef.current;


    setNearbyMode(
      false
    );


    setSort(
      nextSort
    );


    resetPages();


    setBusy(
      true
    );


    try {
      const response =
        await api.search(
          q,
          ""
        );


      if (
        generation !==
        searchGenerationRef.current
      ) {
        return;
      }


      const places =
        response?.places ||
        [];


      const nextPageToken =
        response?.nextPageToken ||
        null;


      setPages({
        1: places
      });


      if (nextPageToken) {
        setTokens({
          1: "",
          2: nextPageToken
        });


        setKnownLastPage(
          null
        );


        setAllGooglePagesLoaded(
          false
        );
      }

      else {
        setTokens({
          1: ""
        });


        setKnownLastPage(
          1
        );


        setAllGooglePagesLoaded(
          true
        );
      }


      setGooglePage(
        1
      );


      setFilteredPage(
        1
      );
    }

    catch (error) {
      if (
        generation ===
        searchGenerationRef.current
      ) {
        setErr(
          error.message
        );
      }
    }

    finally {
      if (
        generation ===
        searchGenerationRef.current
      ) {
        setBusy(
          false
        );
      }
    }
  }


  // ============================================================
  // DISTANCE BUTTON
  // ============================================================

  function enableDistance() {
    if (userLocation) {
      sessionStorage.removeItem(
        "cafego_user_location"
      );


      setUserLocation(
        null
      );


      setLocationMessage(
        ""
      );


      if (nearbyMode) {
        activateNormalSearch(
          "recommended"
        );
      }


      return;
    }


    requestLocation(
      "distance"
    );
  }


  // ============================================================
  // SORT CHANGE
  // ============================================================

  function changeSort(
    value
  ) {
    // Closest requires actual nearby search.
    if (
      value ===
      "closest"
    ) {
      if (
        userLocation
      ) {
        activateNearbySearch();
      }

      else {
        requestLocation(
          "closest"
        );
      }


      return;
    }


    /*
      If currently in nearby search mode,
      switching away from Closest returns
      to the original city search.
    */

    if (nearbyMode) {
      activateNormalSearch(
        value
      );


      return;
    }


    setSort(
      value
    );


    setFilteredPage(
      1
    );


    setLocationMessage(
      ""
    );
  }


  // ============================================================
  // ALL GOOGLE RESULTS
  // ============================================================

  const allGoogleResults =
    useMemo(() => {
      return Object.keys(
        pages
      )
        .map(Number)

        .sort(
          (a, b) =>
            a - b
        )

        .flatMap(
          (pageNumber) =>
            pages[
              pageNumber
            ] ||
            []
        );

    }, [
      pages
    ]);


  // ============================================================
  // ADD DISTANCE / DIRECTION
  // ============================================================

  function decorateCafe(
    cafe
  ) {
    let distanceMiles =
      null;


    let direction =
      null;


    if (
      userLocation &&
      cafe.latitude != null &&
      cafe.longitude != null
    ) {
      const cafeLocation = {
        latitude:
          cafe.latitude,

        longitude:
          cafe.longitude
      };


      distanceMiles =
        milesBetween(
          userLocation,
          cafeLocation
        );


      direction =
        directionFrom(
          userLocation,
          cafeLocation
        );
    }


    return {
      ...cafe,

      distanceMiles,

      direction
    };
  }


  // ============================================================
  // SORT HELPER
  // ============================================================

  function sortCafeResults(
    cafes
  ) {
    const result =
      [...cafes];


    if (
      sort ===
      "rating"
    ) {
      result.sort(
        (a, b) =>
          (
            b.rating ||
            0
          ) -
          (
            a.rating ||
            0
          )
      );
    }


    else if (
      sort ===
      "reviews"
    ) {
      result.sort(
        (a, b) =>
          (
            b.userRatingCount ||
            0
          ) -
          (
            a.userRatingCount ||
            0
          )
      );
    }


    else if (
      sort ===
        "closest" &&
      userLocation
    ) {
      result.sort(
        (a, b) => {
          if (
            a.distanceMiles ==
            null
          ) {
            return 1;
          }


          if (
            b.distanceMiles ==
            null
          ) {
            return -1;
          }


          return (
            a.distanceMiles -
            b.distanceMiles
          );
        }
      );
    }


    return result;
  }


  // ============================================================
  // NORMAL GOOGLE PAGE RESULTS
  //
  // Used when NO filter is active.
  // ============================================================

  const normalPageItems =
    useMemo(() => {
      const pageItems =
        pages[
          googlePage
        ] ||
        [];


      const decorated =
        pageItems.map(
          decorateCafe
        );


      return sortCafeResults(
        decorated
      );


      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
      pages,
      googlePage,
      sort,
      userLocation
    ]);


  // ============================================================
  // FILTER ALL GOOGLE RESULTS
  //
  // Used when any filter is active.
  // ============================================================

  const allFilteredResults =
    useMemo(() => {
      let result =
        allGoogleResults.filter(
          (cafe) => {
            if (
              openOnly &&
              cafe.openNow !==
                true
            ) {
              return false;
            }


            if (
              outdoorOnly &&
              cafe.outdoorSeating !==
                true
            ) {
              return false;
            }


            if (
              minRating > 0 &&
              (
                cafe.rating ||
                0
              ) <
                minRating
            ) {
              return false;
            }


            return true;
          }
        );


      result =
        result.map(
          decorateCafe
        );


      return sortCafeResults(
        result
      );


      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
      allGoogleResults,
      openOnly,
      outdoorOnly,
      minRating,
      sort,
      userLocation
    ]);


  // ============================================================
  // FILTERED CAFEGO PAGINATION
  // ============================================================

  const filteredTotalPages =
    Math.ceil(
      allFilteredResults.length /
      RESULTS_PER_PAGE
    );


  const filteredPageItems =
    useMemo(() => {
      const start =
        (
          filteredPage -
          1
        ) *
        RESULTS_PER_PAGE;


      return allFilteredResults.slice(
        start,
        start +
          RESULTS_PER_PAGE
      );

    }, [
      allFilteredResults,
      filteredPage
    ]);


  /*
    Safety:

    If filtered result count shrinks and
    current filtered page no longer exists,
    return to the last valid page.
  */

  useEffect(() => {
    if (
      !hasActiveFilters
    ) {
      return;
    }


    if (
      filteredTotalPages ===
      0
    ) {
      if (
        filteredPage !==
        1
      ) {
        setFilteredPage(
          1
        );
      }

      return;
    }


    if (
      filteredPage >
      filteredTotalPages
    ) {
      setFilteredPage(
        filteredTotalPages
      );
    }

  }, [
    hasActiveFilters,
    filteredPage,
    filteredTotalPages
  ]);


  // ============================================================
  // DISPLAY DATA
  // ============================================================

  const displayItems =
    hasActiveFilters
      ? filteredPageItems
      : normalPageItems;


  const displayPage =
    hasActiveFilters
      ? filteredPage
      : googlePage;


  // ============================================================
  // GOOGLE PAGE NUMBERS
  //
  // Only used with filters OFF.
  // ============================================================

  const googlePageNumbers =
    useMemo(() => {
      const highestKnownPage =
        Math.max(
          1,

          ...Object.keys(
            tokens
          ).map(Number),

          ...Object.keys(
            pages
          ).map(Number)
        );


      const last =
        knownLastPage != null
          ? knownLastPage
          : highestKnownPage;


      return Array.from(
        {
          length:
            last
        },

        (_, index) =>
          index + 1
      );

    }, [
      tokens,
      pages,
      knownLastPage
    ]);


  // ============================================================
  // FILTERED PAGE NUMBERS
  // ============================================================

  const filteredPageNumbers =
    useMemo(() => {
      return Array.from(
        {
          length:
            filteredTotalPages
        },

        (_, index) =>
          index + 1
      );

    }, [
      filteredTotalPages
    ]);


  // ============================================================
  // SHOULD NORMAL GOOGLE PAGINATION SHOW?
  // ============================================================

  const hasGooglePagination =
    googlePage > 1 ||

    (
      knownLastPage != null &&
      knownLastPage > 1
    ) ||

    Boolean(
      tokens[2]
    ) ||

    Boolean(
      pages[2]
    );


  // ============================================================
  // SHOULD FILTER PAGINATION SHOW?
  //
  // This is the important fix:
  //
  // If filtered results only fill 2 pages,
  // only pages 1 and 2 exist.
  //
  // Page 3 cannot appear.
  // ============================================================

  const hasFilteredPagination =
    filteredTotalPages > 1;


  // ============================================================
  // PAGE CLICK
  // ============================================================

  function goToFilteredPage(
    pageNumber
  ) {
    if (
      pageNumber < 1 ||
      pageNumber >
        filteredTotalPages
    ) {
      return;
    }


    setFilteredPage(
      pageNumber
    );


    scrollToResults();
  }


  function scrollToResults() {
    window.requestAnimationFrame(
      () => {
        resultsTopRef
          .current
          ?.scrollIntoView({
            behavior:
              "smooth",

            block:
              "start"
          });
      }
    );
  }


  // ============================================================
  // TITLE
  // ============================================================

  const title =
    nearbyMode
      ? "Cafes closest to you"

      : q
        ? `Cafes near ${q}`

        : "Find cafes";


  // ============================================================
  // RESULTS READY?
  // ============================================================

  const initialResultsLoaded =
    Boolean(
      pages[1]
    );


  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="container explore">


      <div className="eyebrow">
        EXPLORE
      </div>


      <h1>
        {title}
      </h1>


      <Search
        initial={q}
      />


      {/* ========================================================
          FILTER BAR
      ======================================================== */}

      {hasSearch && (

        <div
          className="filterbar mt-4"
          ref={resultsTopRef}
        >


          <div className="filter-group">


            {/* OPEN NOW */}

            <button
              type="button"

              className={`filterchip ${
                openOnly
                  ? "active"
                  : ""
              }`}

              onClick={() =>
                setOpenOnly(
                  (value) =>
                    !value
                )
              }
            >

              <i className="bi bi-clock" />

              Open now

            </button>


            {/* OUTDOOR */}

            <button
              type="button"

              className={`filterchip ${
                outdoorOnly
                  ? "active"
                  : ""
              }`}

              onClick={() =>
                setOutdoorOnly(
                  (value) =>
                    !value
                )
              }
            >

              <i className="bi bi-tree" />

              Outdoor seating

            </button>


            {/* RATING */}

            <select
              className="filterselect"

              value={
                minRating
              }

              onChange={
                (event) =>
                  setMinRating(
                    Number(
                      event
                        .target
                        .value
                    )
                  )
              }

              aria-label="Minimum rating"
            >

              <option value="0">
                Any rating
              </option>

              <option value="4">
                Rating 4.0+
              </option>

              <option value="4.5">
                Rating 4.5+
              </option>

            </select>


            {/* DISTANCE */}

            <button
              type="button"

              className={`filterchip location-chip ${
                userLocation
                  ? "location-active"
                  : ""
              }`}

              onClick={
                enableDistance
              }
            >

              <i
                className={
                  userLocation
                    ? "bi bi-geo-alt-fill"
                    : "bi bi-geo-alt"
                }
              />


              {userLocation
                ? "Distance on"
                : "Show distance from me"}

            </button>


          </div>


          {/* ====================================================
              SORT
          ==================================================== */}

          <div className="sort-wrap">


            <span>
              Sort by
            </span>


            <select
              className="filterselect"

              value={
                sort
              }

              onChange={
                (event) =>
                  changeSort(
                    event
                      .target
                      .value
                  )
              }

              aria-label="Sort cafes"
            >

              <option value="recommended">
                Recommended
              </option>

              <option value="rating">
                Rating: high to low
              </option>

              <option value="reviews">
                Most reviewed
              </option>

              <option value="closest">
                Closest to me
              </option>

            </select>


          </div>


        </div>

      )}


      {/* ========================================================
          LOCATION MESSAGE
      ======================================================== */}

      {locationMessage && (

        <div className="filter-note">
          {locationMessage}
        </div>

      )}


      {/* ========================================================
          INITIAL LOADING
      ======================================================== */}

      {busy && (

        <div className="state">

          <div className="spinner-border" />

          <p>
            Finding cafes...
          </p>

        </div>

      )}


      {/* ========================================================
          FILTER LOADING
      ======================================================== */}

      {!busy &&
        filterBusy && (

        <div className="state compact-state">

          <div className="spinner-border" />

          <h2>
            Applying filters...
          </h2>

          <p>
            Checking more cafe results for matches.
          </p>

        </div>

      )}


      {/* ========================================================
          ERROR
      ======================================================== */}

      {err && (

        <div className="alert alert-danger mt-4">
          {err}
        </div>

      )}


      {/* ========================================================
          RESULTS
      ======================================================== */}

      {!busy &&
        !filterBusy &&
        !err &&
        initialResultsLoaded && (

        <>


          {/* ====================================================
              RESULTS SUMMARY
          ==================================================== */}

          <div className="results-heading-row">


            <div className="results-summary">

              {hasActiveFilters ? (
                <>

                  Page{" "}

                  <strong>
                    {displayPage}
                  </strong>

                  {" · "}

                  <strong>
                    {allFilteredResults.length}
                  </strong>

                  {" "}

                  cafe
                  {allFilteredResults.length ===
                  1
                    ? ""
                    : "s"}{" "}

                  match

                </>
              ) : (
                <>

                  Page{" "}

                  <strong>
                    {displayPage}
                  </strong>

                  {" · "}

                  <strong>
                    {displayItems.length}
                  </strong>

                  {" "}

                  cafe
                  {displayItems.length ===
                  1
                    ? ""
                    : "s"}{" "}

                  shown

                </>
              )}

            </div>


            <span
              className="gmp-attribution"
              translate="no"
            >
              Google Maps
            </span>


          </div>


          {/* ====================================================
              CARDS
          ==================================================== */}

          {displayItems.length >
          0 ? (

            <div className="row g-4 mt-1">


              {displayItems.map(
                (cafe) => (

                  <div
                    className="col-md-6 col-xl-4"

                    key={
                      cafe.id
                    }
                  >

                    <CafeCard
                      c={cafe}

                      distanceMiles={
                        cafe.distanceMiles
                      }

                      direction={
                        cafe.direction
                      }
                    />

                  </div>

                )
              )}


            </div>

          ) : (

            <div className="state compact-state">

              <i className="bi bi-funnel" />


              <h2>
                No cafes match these filters.
              </h2>


              <p>
                Try changing or removing a filter.
              </p>

            </div>

          )}


          {/* ====================================================
              FILTERED PAGINATION
          ==================================================== */}

          {hasActiveFilters &&
            hasFilteredPagination && (

            <nav
              className="cafego-pagination"
              aria-label="Filtered cafe result pages"
            >


              <button
                className="page-control page-arrow"

                disabled={
                  filteredPage ===
                  1
                }

                onClick={() =>
                  goToFilteredPage(
                    filteredPage -
                    1
                  )
                }

                aria-label="Previous page"
              >

                <i className="bi bi-chevron-left" />

              </button>


              {filteredPageNumbers.map(
                (pageNumber) => (

                  <button
                    key={
                      pageNumber
                    }

                    className={`page-control ${
                      filteredPage ===
                      pageNumber
                        ? "active"
                        : ""
                    }`}

                    onClick={() =>
                      goToFilteredPage(
                        pageNumber
                      )
                    }
                  >

                    {pageNumber}

                  </button>

                )
              )}


              <button
                className="page-control page-arrow"

                disabled={
                  filteredPage ===
                  filteredTotalPages
                }

                onClick={() =>
                  goToFilteredPage(
                    filteredPage +
                    1
                  )
                }

                aria-label="Next page"
              >

                <i className="bi bi-chevron-right" />

              </button>


            </nav>

          )}


          {/* ====================================================
              NORMAL GOOGLE PAGINATION
          ==================================================== */}

          {!hasActiveFilters &&
            hasGooglePagination && (

            <nav
              className="cafego-pagination"
              aria-label="Cafe search result pages"
            >


              <button
                className="page-control page-arrow"

                disabled={
                  googlePage ===
                  1
                }

                onClick={() =>
                  loadGooglePage(
                    googlePage -
                    1
                  )
                }

                aria-label="Previous page"
              >

                <i className="bi bi-chevron-left" />

              </button>


              {googlePageNumbers.map(
                (pageNumber) => (

                  <button
                    key={
                      pageNumber
                    }

                    className={`page-control ${
                      googlePage ===
                      pageNumber
                        ? "active"
                        : ""
                    }`}

                    onClick={() =>
                      loadGooglePage(
                        pageNumber
                      )
                    }
                  >

                    {pageNumber}

                  </button>

                )
              )}


              <button
                className="page-control page-arrow"

                disabled={
                  knownLastPage ===
                    googlePage ||

                  (
                    !pages[
                      googlePage +
                      1
                    ] &&

                    !tokens[
                      googlePage +
                      1
                    ]
                  )
                }

                onClick={() =>
                  loadGooglePage(
                    googlePage +
                    1
                  )
                }

                aria-label="Next page"
              >

                <i className="bi bi-chevron-right" />

              </button>


            </nav>

          )}


        </>

      )}


      {/* ========================================================
          LOCATION MODAL
      ======================================================== */}

      {showLocationModal && (

        <div
          className="location-modal-backdrop"

          onClick={
            declineLocation
          }
        >

          <div
            className="location-modal"

            role="dialog"
            aria-modal="true"

            onClick={
              (event) =>
                event.stopPropagation()
            }
          >


            <div className="location-modal-icon">

              <i className="bi bi-geo-alt-fill" />

            </div>


            <h2>
              Use your location?
            </h2>


            <p>
              CafeGo uses your location to find nearby cafes and calculate distance and direction.
            </p>


            <button
              type="button"
              className="btn dark w-100"

              onClick={
                confirmLocation
              }
            >

              Use my location

            </button>


            <button
              type="button"
              className="location-not-now"

              onClick={
                declineLocation
              }
            >

              Not now

            </button>


          </div>

        </div>

      )}


    </div>
  );
}