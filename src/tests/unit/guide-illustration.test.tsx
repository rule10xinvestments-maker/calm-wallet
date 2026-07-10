import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GuideIllustration, type GuideIllustrationKind } from "@/components/support/guide-illustration";

describe("GuideIllustration", () => {
  it("renders nothing when illustrations are disabled", () => {
    const { container } = render(<GuideIllustration enabled={false} kind="quickAdd" locale="en" />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders localized decorative guide visuals when enabled", () => {
    render(<GuideIllustration kind="limits" locale="es" />);

    expect(screen.getByTestId("guide-illustration-limits")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("Una meta, no una restricción.")).toBeInTheDocument();
  });

  it("renders Activity as a transaction card with Restore separated from normal actions", () => {
    render(<GuideIllustration kind="activity" locale="ro" />);

    const activity = screen.getByTestId("guide-illustration-activity");
    expect(activity).toHaveAttribute("aria-hidden", "true");
    const transactionCard = within(activity).getByTestId("guide-activity-transaction-card");
    expect(transactionCard).toBeInTheDocument();
    expect(within(transactionCard).getByText("Cafea")).toBeInTheDocument();
    expect(within(transactionCard).getByText("12 RON")).toBeInTheDocument();
    expect(within(transactionCard).getByText("Categorie")).toBeInTheDocument();
    expect(within(activity).getByText("Gestionezi intrările salvate într-un singur loc.")).toBeInTheDocument();

    const normalActions = within(activity).getByTestId("guide-activity-actions");
    expect(within(normalActions).getByText("Editează")).toBeInTheDocument();
    expect(within(normalActions).getByText("Notă")).toBeInTheDocument();
    expect(within(normalActions).getByText("Șterge")).toBeInTheDocument();
    expect(within(normalActions).queryByText("Restaurează")).not.toBeInTheDocument();
    expect(within(activity).getByTestId("guide-activity-restore-callout")).toHaveTextContent("Restaurează");
  });

  it("renders Recurring as repeated future entries without bank-transfer cues", () => {
    const { container } = render(<GuideIllustration kind="recurring" locale="en" />);

    const recurring = screen.getByTestId("guide-illustration-recurring");
    expect(within(recurring).getByTestId("guide-recurring-timeline")).toBeInTheDocument();
    expect(within(recurring).getAllByTestId("guide-recurring-entry")).toHaveLength(3);
    expect(within(recurring).getAllByText("Salary")).toHaveLength(4);
    expect(within(recurring).getByText("Monthly")).toBeInTheDocument();
    expect(within(recurring).getByText("Future tracked entries for predictable money movement.")).toBeInTheDocument();
    expect(within(recurring).queryByText(/bank/i)).not.toBeInTheDocument();
    expect(within(recurring).queryByText(/card/i)).not.toBeInTheDocument();
    expect(container.querySelectorAll("img, canvas, picture, video")).toHaveLength(0);
  });

  it("renders Tracked Balance as a clear notebook-versus-bank comparison", () => {
    render(<GuideIllustration kind="trackedBalance" locale="fr" />);

    const trackedBalance = screen.getByTestId("guide-illustration-trackedBalance");
    expect(within(trackedBalance).getByTestId("guide-tracked-notebook")).toHaveTextContent("Entrées suivies");
    expect(within(trackedBalance).getByTestId("guide-tracked-not-equal")).toHaveTextContent("≠");
    expect(within(trackedBalance).getByTestId("guide-tracked-bank")).toHaveTextContent("Banque");
    expect(
      within(trackedBalance).getByText("Le solde suivi est calculé à partir de vos entrées enregistrées. Ce n'est pas votre solde bancaire."),
    ).toBeInTheDocument();
  });

  it("keeps the other guide illustration variants rendering with their existing captions", () => {
    const unchangedVariants: Array<[GuideIllustrationKind, string]> = [
      ["quickAdd", "Natural notes become tracked entries."],
      ["needsReview", "Uncertainty is shown clearly, and corrections update your reports."],
      ["mix", "See where your money goes."],
      ["bars", "Compare different parts of the selected period."],
      ["trend", "See how your habits change over time."],
      ["limits", "A goal, not a restriction."],
    ];

    unchangedVariants.forEach(([kind, caption]) => {
      const { unmount } = render(<GuideIllustration kind={kind} locale="en" />);
      expect(screen.getByTestId(`guide-illustration-${kind}`)).toHaveAttribute("aria-hidden", "true");
      expect(screen.getByText(caption)).toBeInTheDocument();
      unmount();
    });
  });

  it("does not introduce native or external image assets", () => {
    const { container } = render(
      <>
        <GuideIllustration kind="activity" locale="en" />
        <GuideIllustration kind="recurring" locale="en" />
        <GuideIllustration kind="trackedBalance" locale="en" />
      </>,
    );

    expect(container.querySelectorAll("img, canvas, picture, video")).toHaveLength(0);
  });
});
