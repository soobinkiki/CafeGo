import {
  useEffect,
  useRef,
  useState
} from "react";

import {
  useNavigate
} from "react-router-dom";

import {
  api
} from "../services/api";


// ============================================================
// SAVED LOCATION
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
  }

  catch {
    // Ignore bad session data.
  }


  return null;
}


// ============================================================
// SEARCH COMPONENT
// ============================================================

export default function Search({
  initial = ""
}) {
  const [
    q,
    setQ
  ] =
    useState(initial);


  const [
    busy,
    setBusy
  ] =
    useState(false);


  const [
    showLocationModal,
    setShowLocationModal
  ] =
    useState(false);


  // ============================================================
  // AUTOCOMPLETE STATE
  // ============================================================

  const [
    suggestions,
    setSuggestions
  ] =
    useState([]);


  const [
    suggestionsOpen,
    setSuggestionsOpen
  ] =
    useState(false);


  const [
    autocompleteBusy,
    setAutocompleteBusy
  ] =
    useState(false);


  const [
    activeSuggestion,
    setActiveSuggestion
  ] =
    useState(-1);


  const [
    suggestionWasSelected,
    setSuggestionWasSelected
  ] =
    useState(Boolean(initial));


  const searchRef =
    useRef(null);


  const navigate =
    useNavigate();


  // ============================================================
  // UPDATE VALUE IF PAGE CHANGES
  // ============================================================

  useEffect(() => {
    setQ(initial);

    // initial 값은 이전 검색에서 넘어온 값이므로
    // autocomplete를 자동으로 다시 열지 않는다.
    setSuggestionWasSelected(
      Boolean(initial)
    );

    setSuggestions([]);
    setSuggestionsOpen(false);
    setActiveSuggestion(-1);

  }, [initial]);

  // ============================================================
  // AUTOCOMPLETE
  //
  // Wait until 3 characters.
  // Delay request by 350ms.
  // ============================================================

  useEffect(() => {

    const input =
      q.trim();


    if (
      input.length < 3 ||
      suggestionWasSelected
    ) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      setAutocompleteBusy(false);

      return;
    }


    const controller =
      new AbortController();


    const timer =
      window.setTimeout(
        async () => {

          try {
            setAutocompleteBusy(
              true
            );


            const response =
              await api.autocomplete(
                input,
                controller.signal
              );


            const nextSuggestions =
              response?.suggestions ||
              [];


            setSuggestions(
              nextSuggestions
            );


            setSuggestionsOpen(
              nextSuggestions.length >
              0
            );


            setActiveSuggestion(
              -1
            );
          }

          catch (error) {

            if (
              error.name !==
              "AbortError"
            ) {
              console.error(
                "Autocomplete failed:",
                error
              );
            }

          }

          finally {
            if (
              !controller
                .signal
                .aborted
            ) {
              setAutocompleteBusy(
                false
              );
            }
          }

        },

        350
      );


    return () => {
      window.clearTimeout(
        timer
      );

      controller.abort();
    };

  }, [
    q,
    suggestionWasSelected
  ]);


  // ============================================================
  // CLOSE DROPDOWN WHEN CLICKING OUTSIDE
  // ============================================================

  useEffect(() => {

    function handleOutsideClick(
      event
    ) {
      if (
        searchRef.current &&
        !searchRef.current.contains(
          event.target
        )
      ) {
        setSuggestionsOpen(
          false
        );

        setActiveSuggestion(
          -1
        );
      }
    }


    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );


    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };

  }, []);


  // ============================================================
  // NORMAL SEARCH
  // ============================================================

  function submit(event) {
    event.preventDefault();


    const clean =
      q.trim();


    if (!clean) {
      return;
    }


    setSuggestionsOpen(
      false
    );


    navigate(
      `/explore?q=${
        encodeURIComponent(
          clean
        )
      }`
    );
  }


  // ============================================================
  // INPUT CHANGE
  // ============================================================

  function handleInputChange(event) {
    setQ(
      event.target.value
    );

    // 사용자가 직접 다시 입력하기 시작하면
    // autocomplete를 다시 활성화
    setSuggestionWasSelected(
      false
    );

    setActiveSuggestion(
      -1
    );
  }


  // ============================================================
  // SELECT AUTOCOMPLETE RESULT
  // ============================================================

  function selectSuggestion(
    suggestion
  ) {
    const value =
      suggestion.fullText ||
      [
        suggestion.mainText,
        suggestion.secondaryText
      ]
        .filter(Boolean)
        .join(", ");


    if (!value) {
      return;
    }


    setQ(
      value
    );


    setSuggestionWasSelected(
      true
    );


    setSuggestionsOpen(
      false
    );


    setSuggestions([]);


    setActiveSuggestion(
      -1
    );
  }


  // ============================================================
  // KEYBOARD NAVIGATION
  // ============================================================

  function handleKeyDown(
    event
  ) {
    if (
      !suggestionsOpen ||
      suggestions.length === 0
    ) {
      return;
    }


    if (
      event.key ===
      "ArrowDown"
    ) {
      event.preventDefault();


      setActiveSuggestion(
        (current) => {

          if (
            current >=
            suggestions.length -
            1
          ) {
            return 0;
          }


          return current + 1;
        }
      );
    }


    else if (
      event.key ===
      "ArrowUp"
    ) {
      event.preventDefault();


      setActiveSuggestion(
        (current) => {

          if (
            current <= 0
          ) {
            return (
              suggestions.length -
              1
            );
          }


          return current - 1;
        }
      );
    }


    else if (
      event.key ===
        "Enter" &&
      activeSuggestion >= 0
    ) {
      event.preventDefault();


      selectSuggestion(
        suggestions[
          activeSuggestion
        ]
      );
    }


    else if (
      event.key ===
      "Escape"
    ) {
      setSuggestionsOpen(
        false
      );


      setActiveSuggestion(
        -1
      );
    }
  }


  // ============================================================
  // USE CURRENT LOCATION
  // ============================================================

  function askForLocation() {
    const storedLocation =
      readStoredLocation();


    if (storedLocation) {
      navigate(
        `/explore?lat=${
          storedLocation.latitude
        }&lng=${
          storedLocation.longitude
        }&near=1`
      );

      return;
    }


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


    setShowLocationModal(
      false
    );


    setBusy(
      false
    );
  }


  // ============================================================
  // CONFIRM LOCATION
  // ============================================================

  function confirmLocation() {
    setShowLocationModal(
      false
    );


    if (
      !navigator.geolocation
    ) {
      alert(
        "Location access is not supported by this browser."
      );

      return;
    }


    setBusy(
      true
    );


    navigator.geolocation.getCurrentPosition(

      // SUCCESS

      (position) => {

        const userLocation = {

          latitude:
            position
              .coords
              .latitude,

          longitude:
            position
              .coords
              .longitude

        };


        sessionStorage.setItem(
          "cafego_user_location",

          JSON.stringify(
            userLocation
          )
        );


        setBusy(
          false
        );


        navigate(
          `/explore?lat=${
            userLocation.latitude
          }&lng=${
            userLocation.longitude
          }&near=1`
        );
      },


      // ERROR

      () => {

        sessionStorage.removeItem(
          "cafego_user_location"
        );


        setBusy(
          false
        );


        alert(
          "Could not access your location. Please allow location access in your browser and try again."
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
  // UI
  // ============================================================

  return (
    <div>

      <div
        className="search-autocomplete"
        ref={searchRef}
      >

        <form
          className="search"
          onSubmit={submit}
        >

          <i className="bi bi-search" />


          <input
            value={q}

            onChange={
              handleInputChange
            }

            onKeyDown={
              handleKeyDown
            }

            onFocus={() => {

              if (
                suggestions.length >
                0
              ) {
                setSuggestionsOpen(
                  true
                );
              }

            }}

            placeholder="City, neighborhood, or ZIP code"

            autoComplete="off"

            role="combobox"

            aria-expanded={
              suggestionsOpen
            }

            aria-autocomplete="list"

            aria-controls="location-suggestion-list"
          />


          <button
            className="btn dark"
            type="submit"
          >
            Search cafes
          </button>

        </form>


        {/* ======================================================
            AUTOCOMPLETE DROPDOWN
        ====================================================== */}

        {(
          suggestionsOpen ||
          autocompleteBusy
        ) && (

          <div
            className="autocomplete-menu"
            id="location-suggestion-list"
            role="listbox"
          >

            {autocompleteBusy &&
              suggestions.length ===
                0 && (

              <div className="autocomplete-loading">

                <span className="autocomplete-spinner" />

                Searching places...

              </div>

            )}


            {suggestions.map(
              (
                suggestion,
                index
              ) => (

                <button
                  type="button"

                  role="option"

                  aria-selected={
                    activeSuggestion ===
                    index
                  }

                  className={`autocomplete-item ${
                    activeSuggestion ===
                    index

                      ? "active"

                      : ""
                  }`}

                  key={
                    suggestion.placeId ||
                    `${suggestion.fullText}-${index}`
                  }

                  onMouseEnter={() =>
                    setActiveSuggestion(
                      index
                    )
                  }

                  onMouseDown={(
                    event
                  ) => {
                    /*
                      Prevent input blur before
                      the selection is processed.
                    */
                    event.preventDefault();
                  }}

                  onClick={() =>
                    selectSuggestion(
                      suggestion
                    )
                  }
                >

                  <span className="autocomplete-pin">

                    <i className="bi bi-geo-alt" />

                  </span>


                  <span className="autocomplete-copy">

                    <strong>

                      {suggestion.mainText ||
                        suggestion.fullText}

                    </strong>


                    {suggestion.secondaryText && (

                      <small>

                        {suggestion.secondaryText}

                      </small>

                    )}

                  </span>

                </button>

              )
            )}


            {/* Google requires attribution when
                autocomplete predictions are shown
                without a Google map. */}

            <div className="autocomplete-attribution">

              Google

            </div>

          </div>

        )}

      </div>


      {/* ========================================================
          CURRENT LOCATION
      ======================================================== */}

      <button
        className="near"
        type="button"
        onClick={
          askForLocation
        }
        disabled={
          busy
        }
      >

        <i className="bi bi-crosshair" />

        {" "}

        {busy
          ? "Finding you..."
          : "Use my current location"}

      </button>


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

            aria-labelledby="location-modal-title"

            onClick={
              (event) =>
                event.stopPropagation()
            }
          >

            <div className="location-modal-icon">

              <i className="bi bi-geo-alt-fill" />

            </div>


            <h2 id="location-modal-title">

              Find cafes near you

            </h2>


            <p>

              CafeGo can use your current location to show nearby cafes, distance, direction, and closest results.

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