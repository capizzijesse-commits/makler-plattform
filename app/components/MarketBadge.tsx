type MarketBadgeProps = {
  market: string;
};

const MARKET_LABELS: Record<string, string> = {
  CH: "Schweiz",
  DE: "Deutschland",
  AT: "Österreich",
};

export default function MarketBadge({
  market,
}: MarketBadgeProps) {
  const normalized =
    market.trim().toUpperCase();

  const label =
    MARKET_LABELS[normalized] ||
    normalized;

  return (
    <span
      className="iaMarketBadge"
      aria-label={label}
      title={label}
    >
      {normalized === "CH" ? (
        <span
          className="iaFlag iaFlagCH"
          aria-hidden="true"
        />
      ) : normalized === "DE" ? (
        <span
          className="iaFlag iaFlagDE"
          aria-hidden="true"
        />
      ) : normalized === "AT" ? (
        <span
          className="iaFlag iaFlagAT"
          aria-hidden="true"
        />
      ) : (
        <strong>
          {normalized}
        </strong>
      )}

      <style jsx>{`
        .iaMarketBadge {
          display: inline-flex;
          min-width: 20px;
          min-height: 20px;
          align-items: center;
          justify-content: center;
        }

        .iaFlag {
          position: relative;
          display: block;
          width: 20px;
          height: 16px;
          overflow: hidden;
          border:
            1px solid rgba(15,23,42,.12);
          border-radius: 4px;
          box-shadow:
            0 2px 7px
            rgba(15,23,42,.12);
        }

        .iaFlagCH {
          width: 18px;
          height: 18px;
          background: #d71920;
        }

        .iaFlagCH::before,
        .iaFlagCH::after {
          position: absolute;
          top: 50%;
          left: 50%;
          border-radius: 1px;
          background: #ffffff;
          content: "";
          transform:
            translate(-50%, -50%);
        }

        .iaFlagCH::before {
          width: 10px;
          height: 3px;
        }

        .iaFlagCH::after {
          width: 3px;
          height: 10px;
        }

        .iaFlagDE {
          background:
            linear-gradient(
              180deg,
              #111111 0%,
              #111111 33.33%,
              #dd0000 33.33%,
              #dd0000 66.66%,
              #ffce00 66.66%,
              #ffce00 100%
            );
        }

        .iaFlagAT {
          background:
            linear-gradient(
              180deg,
              #ed2939 0%,
              #ed2939 33.33%,
              #ffffff 33.33%,
              #ffffff 66.66%,
              #ed2939 66.66%,
              #ed2939 100%
            );
        }

        strong {
          color: #10213a;
          font-size: 11px;
          font-weight: 900;
        }
      `}</style>
    </span>
  );
}