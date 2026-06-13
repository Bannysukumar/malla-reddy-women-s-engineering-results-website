import { useCallback, useEffect, useState } from "react";
import { addSearchHistory, clearSearchHistory, getSearchHistory } from "@/shared/lib/searchHistory";

export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    setHistory(getSearchHistory());
  }, []);

  const push = useCallback((ticket: string) => {
    setHistory(addSearchHistory(ticket));
  }, []);

  const clear = useCallback(() => {
    clearSearchHistory();
    setHistory([]);
  }, []);

  return { history, push, clear };
}
