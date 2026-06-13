import { motion } from "framer-motion";
import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { useSearchHistory } from "@/shared/hooks/useSearchHistory";

interface HallTicketSearchProps {
  onSearch: (ticket: string) => void;
  loading?: boolean;
  placeholder?: string;
  defaultValue?: string;
  showHistory?: boolean;
}

export function HallTicketSearch({
  onSearch,
  loading,
  placeholder = "Enter hall ticket (e.g. 23RH1A0511)",
  defaultValue = "",
  showHistory = true,
}: HallTicketSearchProps) {
  const [value, setValue] = useState(defaultValue);
  const [focused, setFocused] = useState(false);
  const { history, push, clear } = useSearchHistory();

  const suggestions = useMemo(() => {
    if (!value.trim()) return history;
    const q = value.toUpperCase();
    return history.filter((h) => h.includes(q));
  }, [history, value]);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const ticket = value.trim().toUpperCase();
    if (!ticket) return;
    push(ticket);
    onSearch(ticket);
    setFocused(false);
  }

  return (
    <div className="relative w-full">
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value.toUpperCase())}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder={placeholder}
            className="pl-12"
            aria-label="Hall ticket search"
            autoComplete="off"
            list="hall-ticket-suggestions"
          />
          {showHistory && (
            <datalist id="hall-ticket-suggestions">
              {history.map((h) => (
                <option key={h} value={h} />
              ))}
            </datalist>
          )}
        </div>
        <Button type="submit" loading={loading} className="sm:min-w-[140px]">
          Search
        </Button>
      </form>

      {showHistory && focused && suggestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute z-20 mt-2 w-full overflow-hidden rounded-card border border-foreground/10 bg-surface-card shadow-glass"
        >
          <div className="flex items-center justify-between border-b border-foreground/10 px-4 py-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">Recent searches</span>
            <button type="button" onClick={clear} className="text-xs text-primary-light hover:underline">
              Clear
            </button>
          </div>
          {suggestions.map((ticket) => (
            <button
              key={ticket}
              type="button"
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-foreground/5"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setValue(ticket);
                push(ticket);
                onSearch(ticket);
                setFocused(false);
              }}
            >
              {ticket}
              <X className="h-3.5 w-3.5 text-muted opacity-0 group-hover:opacity-100" />
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}
