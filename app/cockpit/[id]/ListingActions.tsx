"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useAppDialog } from "../../../components/AppDialogProvider";

type ListingActionsProps = {
  listingId: string;
  archived: boolean;
  unlockStatus: string;
  singleObjectPriceCents: number;
};

export default function ListingActions({
  listingId,
  archived,
  unlockStatus,
  singleObjectPriceCents,
}: ListingActionsProps) {
  const t = useTranslations("ListingActions");
  const locale = useLocale();
  const { confirmAction } = useAppDialog();
  const [busyAction, setBusyAction] = useState<
    "archive" | "delete" | "checkout" | null
  >(null);
  const [error, setError] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const intlLocale =
    locale === "it"
      ? "it-CH"
      : locale === "fr"
        ? "fr-CH"
        : locale === "en"
          ? "en-CH"
          : "de-CH";

  const requiresPayment =
    unlockStatus === "locked" || unlockStatus === "pending";

  const formattedSingleObjectPrice = new Intl.NumberFormat(
    intlLocale,
    {
      style: "currency",
      currency: "CHF",
    }
  ).format(singleObjectPriceCents / 100);

  const deleteKeyword = t("delete.keyword")
    .trim()
    .toLocaleLowerCase(intlLocale);

  const deleteConfirmed =
    deleteConfirmation.trim().toLocaleLowerCase(intlLocale) ===
    deleteKeyword;

  async function handleArchive() {
    if (busyAction) return;

    const confirmed = await confirmAction({
      title: archived
        ? t("archive.reactivateTitle")
        : t("archive.archiveTitle"),
      message: archived
        ? t("archive.reactivateMessage")
        : t("archive.archiveMessage"),
      confirmLabel: archived
        ? t("archive.reactivateConfirm")
        : t("archive.archiveConfirm"),
      cancelLabel: t("common.cancel"),
      tone: "warning",
    });

    if (!confirmed) {
      return;
    }

    try {
      setBusyAction("archive");
      setError("");

      const response = await fetch(
        `/api/listings/${encodeURIComponent(listingId)}`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            archived: !archived,
          }),
        }
      );

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || t("errors.status"));
      }

      window.location.reload();
    } catch (archiveError) {
      setError(
        archiveError instanceof Error
          ? archiveError.message
          : t("errors.status")
      );
      setBusyAction(null);
    }
  }

  function openDeleteDialog() {
    setError("");

    if (!archived) {
      setError(t("delete.archiveFirstError"));
      return;
    }

    setDeleteConfirmation("");
    setShowDeleteDialog(true);
  }

  function closeDeleteDialog() {
    if (busyAction) return;

    setDeleteConfirmation("");
    setShowDeleteDialog(false);
  }

  async function handleDelete() {
    if (busyAction || !deleteConfirmed) {
      return;
    }

    try {
      setBusyAction("delete");
      setError("");

      const response = await fetch(
        `/api/listings/${encodeURIComponent(listingId)}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || t("errors.delete"));
      }

      window.location.href = "/cockpit";
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : t("errors.delete")
      );
      setBusyAction(null);
    }
  }

  async function handleCheckout() {
    if (busyAction) return;

    try {
      setBusyAction("checkout");
      setError("");

      const response = await fetch(
        "/api/payments/single-object/checkout",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ listingId }),
        }
      );

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      const data = (await response.json().catch(() => null)) as
        | {
            success?: boolean;
            checkoutUrl?: string;
            alreadyUnlocked?: boolean;
            error?: string;
          }
        | null;

      if (data?.alreadyUnlocked) {
        window.location.reload();
        return;
      }

      if (
        !response.ok ||
        !data?.success ||
        typeof data.checkoutUrl !== "string"
      ) {
        throw new Error(data?.error || t("errors.checkout"));
      }

      window.location.href = data.checkoutUrl;
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : t("errors.checkout")
      );
      setBusyAction(null);
    }
  }

  return (
    <>
      <div
        style={{
          display: "grid",
          gap: "9px",
          marginTop: "9px",
        }}
      >
        {requiresPayment && (
          <div
            style={{
              padding: "17px",
              border: "1px solid rgba(251, 191, 36, 0.46)",
              borderRadius: "14px",
              background:
                "linear-gradient(145deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.94))",
              boxShadow: "0 16px 36px rgba(2, 6, 23, 0.32)",
            }}
          >
            <span
              style={{
                display: "block",
                marginBottom: "6px",
                color: "#fbbf24",
                fontSize: "10px",
                fontWeight: 900,
                letterSpacing: "0.14em",
              }}
            >
              {t("payment.sectionLabel")}
            </span>

            <strong
              style={{
                display: "block",
                color: "#ffffff",
                fontSize: "18px",
              }}
            >
              {unlockStatus === "pending"
                ? t("payment.pendingTitle")
                : t("payment.unlockTitle")}
            </strong>

            <p
              style={{
                margin: "8px 0 14px",
                color: "rgba(226, 232, 240, 0.76)",
                fontSize: "12px",
                lineHeight: 1.55,
              }}
            >
              {t("payment.description")}
            </p>

            <button
              type="button"
              onClick={handleCheckout}
              disabled={busyAction !== null}
              style={{
                width: "100%",
                minHeight: "48px",
                padding: "0 14px",
                border: "1px solid rgba(251, 191, 36, 0.62)",
                borderRadius: "11px",
                background:
                  "linear-gradient(135deg, #fcd34d, #f59e0b, #d97706)",
                color: "#111827",
                fontWeight: 900,
                cursor: busyAction !== null ? "wait" : "pointer",
                opacity: busyAction !== null ? 0.68 : 1,
              }}
            >
              {busyAction === "checkout"
                ? t("payment.openingStripe")
                : unlockStatus === "pending"
                  ? t("payment.continue", {
                      price: formattedSingleObjectPrice,
                    })
                  : t("payment.unlock", {
                      price: formattedSingleObjectPrice,
                    })}
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={handleArchive}
          disabled={busyAction !== null}
          style={{
            width: "100%",
            minHeight: "44px",
            border: "1px solid rgba(251, 191, 36, 0.48)",
            borderRadius: "11px",
            background:
              "linear-gradient(135deg, #fcd34d, #f59e0b, #d97706)",
            color: "#111827",
            fontWeight: 900,
            cursor: busyAction ? "wait" : "pointer",
            opacity: busyAction ? 0.68 : 1,
            boxShadow: "0 12px 25px rgba(245, 158, 11, 0.22)",
          }}
        >
          {busyAction === "archive"
            ? t("archive.changing")
            : archived
              ? t("archive.reactivateButton")
              : t("archive.archiveButton")}
        </button>

        <button
          type="button"
          onClick={openDeleteDialog}
          disabled={busyAction !== null}
          style={{
            width: "100%",
            minHeight: "44px",
            border: "1px solid rgba(248, 113, 113, 0.38)",
            borderRadius: "11px",
            background: archived
              ? "rgba(239, 68, 68, 0.14)"
              : "rgba(148, 163, 184, 0.08)",
            color: archived ? "#fca5a5" : "#94a3b8",
            fontWeight: 900,
            cursor: busyAction
              ? "wait"
              : archived
                ? "pointer"
                : "not-allowed",
            opacity: busyAction ? 0.68 : 1,
          }}
        >
          {busyAction === "delete"
            ? t("delete.deleting")
            : archived
              ? t("delete.deleteButton")
              : t("delete.archiveFirstButton")}
        </button>

        {error && (
          <div
            style={{
              padding: "11px 12px",
              border: "1px solid rgba(248, 113, 113, 0.34)",
              borderRadius: "10px",
              background: "rgba(239, 68, 68, 0.12)",
              color: "#fecaca",
              fontSize: "12px",
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}
      </div>

      {showDeleteDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            background: "rgba(2, 6, 23, 0.82)",
            backdropFilter: "blur(8px)",
          }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDeleteDialog();
            }
          }}
        >
          <div
            style={{
              width: "min(470px, 100%)",
              padding: "26px",
              border: "1px solid rgba(248, 113, 113, 0.34)",
              borderRadius: "22px",
              background: "linear-gradient(145deg, #111827, #1e293b)",
              boxShadow: "0 28px 80px rgba(0, 0, 0, 0.5)",
            }}
          >
            <span
              style={{
                display: "block",
                marginBottom: "9px",
                color: "#fca5a5",
                fontSize: "11px",
                fontWeight: 900,
                letterSpacing: "0.14em",
              }}
            >
              {t("delete.permanentLabel")}
            </span>

            <h3
              id="delete-dialog-title"
              style={{
                margin: 0,
                color: "#ffffff",
                fontSize: "25px",
              }}
            >
              {t("delete.dialogTitle")}
            </h3>

            <p
              style={{
                margin: "13px 0 18px",
                color: "rgba(226, 232, 240, 0.72)",
                lineHeight: 1.6,
              }}
            >
              {t("delete.dialogDescription")}
            </p>

            <label
              style={{
                display: "grid",
                gap: "8px",
              }}
            >
              <span
                style={{
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 800,
                }}
              >
                {t("delete.confirmPrompt", {
                  keyword: t("delete.keyword"),
                })}
              </span>

              <input
                value={deleteConfirmation}
                onChange={(event) =>
                  setDeleteConfirmation(event.target.value)
                }
                autoFocus
                placeholder={t("delete.keyword")}
                style={{
                  width: "100%",
                  minHeight: "48px",
                  padding: "0 14px",
                  border: "1px solid rgba(248, 113, 113, 0.38)",
                  borderRadius: "12px",
                  outline: "none",
                  background: "rgba(255, 255, 255, 0.06)",
                  color: "#ffffff",
                  font: "inherit",
                }}
              />
            </label>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "22px",
              }}
            >
              <button
                type="button"
                onClick={closeDeleteDialog}
                disabled={busyAction !== null}
                style={{
                  minHeight: "44px",
                  padding: "0 16px",
                  border: "1px solid rgba(255, 255, 255, 0.13)",
                  borderRadius: "11px",
                  background: "rgba(255, 255, 255, 0.06)",
                  color: "#ffffff",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {t("common.cancel")}
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={busyAction !== null || !deleteConfirmed}
                style={{
                  minHeight: "44px",
                  padding: "0 16px",
                  border: "1px solid rgba(248, 113, 113, 0.46)",
                  borderRadius: "11px",
                  background: deleteConfirmed
                    ? "linear-gradient(135deg, #ef4444, #b91c1c)"
                    : "rgba(148, 163, 184, 0.12)",
                  color: deleteConfirmed ? "#ffffff" : "#94a3b8",
                  fontWeight: 900,
                  cursor: deleteConfirmed ? "pointer" : "not-allowed",
                }}
              >
                {busyAction === "delete"
                  ? t("delete.deletingShort")
                  : t("delete.finalDelete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
