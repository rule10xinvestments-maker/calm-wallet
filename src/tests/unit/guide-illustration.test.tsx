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

  it("renders Assistant Quick Add as a natural-language workflow without the old three-box AI step", () => {
    render(<GuideIllustration kind="quickAdd" locale="en" />);

    const quickAdd = screen.getByTestId("guide-illustration-quickAdd");
    expect(quickAdd).toHaveAttribute("aria-hidden", "true");
    expect(within(quickAdd).getByTestId("guide-quickadd-flow")).toBeInTheDocument();
    expect(within(quickAdd).getByTestId("guide-quickadd-message")).toHaveTextContent("Coffee 12");
    expect(within(quickAdd).getByTestId("guide-quickadd-interpretation")).toHaveTextContent("Spend");
    expect(within(quickAdd).getByTestId("guide-quickadd-interpretation")).toHaveTextContent("12");
    expect(within(quickAdd).getByTestId("guide-quickadd-interpretation")).toHaveTextContent("Dining");
    expect(within(quickAdd).getByTestId("guide-quickadd-saved-card")).toHaveTextContent("Coffee");
    expect(within(quickAdd).getByTestId("guide-quickadd-saved-card")).toHaveTextContent("-RON 12.00");
    expect(within(quickAdd).queryByText("AI understands")).not.toBeInTheDocument();
    expect(quickAdd.querySelector(".grid-cols-\\[1fr_auto_1fr_auto_1fr\\]")).toBeNull();

    const reviewDetail = within(quickAdd).getByTestId("guide-quickadd-review-detail");
    expect(reviewDetail).toHaveTextContent("Carrefour 150");
    expect(reviewDetail).toHaveTextContent("Needs review");
    expect(within(quickAdd).getByText("Write naturally. Calm Wallet turns the important details into a tracked entry.")).toBeInTheDocument();
  });

  it("renders Assistant Quick Add labels from localization keys", () => {
    render(<GuideIllustration kind="quickAdd" locale="es" />);

    const quickAdd = screen.getByTestId("guide-illustration-quickAdd");
    expect(within(quickAdd).getByTestId("guide-quickadd-message")).toHaveTextContent("Café 12");
    expect(within(quickAdd).getByTestId("guide-quickadd-interpretation")).toHaveTextContent("Gasto");
    expect(within(quickAdd).getByTestId("guide-quickadd-interpretation")).toHaveTextContent("Comidas");
    expect(within(quickAdd).getByTestId("guide-quickadd-review-detail")).toHaveTextContent("Revisar");
    expect(within(quickAdd).getByText("Escribe con naturalidad. Calm Wallet convierte los detalles importantes en un registro.")).toBeInTheDocument();
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

  it("renders Needs Review as one verification journey", () => {
    render(<GuideIllustration kind="needsReview" locale="en" />);

    const needsReview = screen.getByTestId("guide-illustration-needsReview");
    const journey = within(needsReview).getByTestId("guide-needs-review-journey");
    expect(journey).toHaveTextContent("Entry saved");
    expect(journey).toHaveTextContent("AI suggestion");
    expect(journey).toHaveTextContent("Needs review");
    expect(journey).toHaveTextContent("Edit category");
    expect(journey).toHaveTextContent("Insights update");
    expect(within(needsReview).getByText("Verification turns uncertainty into clearer Insights.")).toBeInTheDocument();
    expect(needsReview.querySelector(".grid-cols-\\[1fr_auto_1fr\\]")).toBeNull();
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
