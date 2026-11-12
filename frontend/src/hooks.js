import { useEffect, useState } from "react";
import { api } from "./api";

/** Load JSON from the API. Reloads when `version` changes (bumped after every save). */
export function useLoad(path, version = 0) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setError(null);
    api
      .get(path)
      .then((result) => alive && setData(result))
      .catch((err) => alive && setError(err));
    return () => {
      alive = false;
    };
  }, [path, version]);

  return { data, error, loading: !data && !error };
}
