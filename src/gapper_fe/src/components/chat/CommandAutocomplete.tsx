import { COMMAND_REGISTRY } from "@/lib/commands/registry";

interface CommandAutocompleteProps {
  options: CommandAutocompleteOption[];
  selectedIndex: number;
  onPick: (value: string) => void;
}

export type CommandAutocompleteOption = {
  id: string;
  label: string;
  hint: string;
  value: string;
};

function normalizeTicker(input: string): string {
  return input.replace(/[^A-Za-z]/g, "").toUpperCase();
}

export function getCommandAutocompleteOptions(
  query: string,
  watchlistTickers: string[],
  recentTickers: string[]
): CommandAutocompleteOption[] {
  const trimmed = query.trim();
  const options: CommandAutocompleteOption[] = [];

  if (trimmed.startsWith("/")) {
    const lookup = trimmed.slice(1).toLowerCase();
    options.push(
      ...COMMAND_REGISTRY.filter((item) => item.name.includes(lookup)).map((item) => ({
        id: `cmd-${item.name}`,
        label: `/${item.name}`,
        hint: item.description,
        value: `/${item.name} `
      }))
    );

    return options.slice(0, 8);
  }

  const token = normalizeTicker(trimmed.split(/\s+/).pop() ?? "");
  if (!token.length) {
    return [];
  }

  const pool = Array.from(new Set([...recentTickers, ...watchlistTickers]));
  options.push(
    ...pool
      .filter((ticker) => ticker.startsWith(token))
      .slice(0, 6)
      .map((ticker) => ({
        id: `ticker-${ticker}`,
        label: ticker,
        hint: "Watchlist ticker",
        value: `$${ticker}`
      }))
  );

  return options;
}

export function CommandAutocomplete({ options, selectedIndex, onPick }: CommandAutocompleteProps) {
  if (options.length === 0) {
    return null;
  }

  return (
    <div className="glass-panel border-border/60 p-1">
      <ul className="space-y-1">
        {options.map((option, index) => (
          <li key={option.id}>
            <button
              type="button"
              className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs ${
                index === selectedIndex ? "bg-panel-strong text-foreground" : "hover:bg-panel-soft/80"
              }`}
              onClick={() => onPick(option.value)}
            >
              <span className="font-semibold">{option.label}</span>
              <span className="text-muted">{option.hint}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
