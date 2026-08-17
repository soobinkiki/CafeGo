const ROOT = "http://localhost:5091";


async function get(path, signal) {
  const response =
    await fetch(
      ROOT + path,
      {
        signal
      }
    );


  if (!response.ok) {
    let message =
      "Request failed";


    try {
      const body =
        await response.json();

      message =
        body.detail ||
        body.message ||
        message;
    }

    catch {
      // Keep default message.
    }


    throw new Error(
      message
    );
  }


  return response.json();
}


export const api = {

  // ============================================================
  // SEARCH
  // ============================================================

  search: (
    query,
    pageToken = ""
  ) =>
    get(
      `/api/cafes/search?query=${
        encodeURIComponent(query)
      }` +

      (
        pageToken
          ? `&pageToken=${
              encodeURIComponent(
                pageToken
              )
            }`
          : ""
      )
    ),


  // ============================================================
  // AUTOCOMPLETE
  // ============================================================

  autocomplete: (
    input,
    signal
  ) =>
    get(
      `/api/cafes/autocomplete?input=${
        encodeURIComponent(input)
      }`,
      signal
    ),


  // ============================================================
  // NEARBY
  // ============================================================

  nearby: (
    lat,
    lng,
    pageToken = ""
  ) =>
    get(
      `/api/cafes/nearby?lat=${
        encodeURIComponent(lat)
      }&lng=${
        encodeURIComponent(lng)
      }` +

      (
        pageToken
          ? `&pageToken=${
              encodeURIComponent(
                pageToken
              )
            }`
          : ""
      )
    ),


  // ============================================================
  // DETAIL
  // ============================================================

  detail: (id) =>
    get(
      `/api/cafes/${
        encodeURIComponent(id)
      }`
    )
};


export const photo = (
  name,
  width = 1200,
  height = 800
) =>
  name
    ? `${ROOT}/api/cafes/photo?name=${
        encodeURIComponent(name)
      }&maxWidth=${
        width
      }&maxHeight=${
        height
      }`
    : "";