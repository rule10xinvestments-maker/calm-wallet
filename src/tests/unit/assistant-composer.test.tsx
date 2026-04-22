import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AssistantComposer } from "@/components/assistant/assistant-composer";

describe("assistant composer", () => {
  it("shows only the minimal create fields by default", () => {
    render(
      <AssistantComposer
        action={async () => ({
          status: "idle",
          message: null,
          reviewState: null,
          latestTransaction: null,
          recentItems: [],
        })}
        initialState={{
          status: "idle",
          message: null,
          reviewState: null,
          latestTransaction: null,
          recentItems: [],
        }}
      />,
    );

    expect(screen.getByLabelText("Action")).toHaveValue("create_transaction");
    expect(screen.getByLabelText("Amount")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Required transaction id")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("From")).not.toBeInTheDocument();
  });

  it("switches to minimal Sprint 2 fields for each action", () => {
    render(
      <AssistantComposer
        action={async () => ({
          status: "idle",
          message: null,
          reviewState: null,
          latestTransaction: null,
          recentItems: [],
        })}
        initialState={{
          status: "idle",
          message: null,
          reviewState: null,
          latestTransaction: null,
          recentItems: [],
        }}
      />,
    );

    fireEvent.change(screen.getByLabelText("Action"), { target: { value: "update_transaction" } });
    expect(screen.getByRole("button", { name: "Update item" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Required transaction id")).toBeInTheDocument();
    expect(screen.getByLabelText("Occurred date")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Action"), { target: { value: "delete_transaction" } });
    expect(screen.getByRole("button", { name: "Delete item" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Required transaction id")).toBeInTheDocument();
    expect(screen.queryByLabelText("Occurred date")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Action"), { target: { value: "recategorize_transaction" } });
    expect(screen.getByRole("button", { name: "Update category" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Leave blank to uncategorize")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Action"), { target: { value: "summarize_spending" } });
    expect(screen.getByRole("button", { name: "Run summary" })).toBeInTheDocument();
    expect(screen.getByLabelText("From")).toBeInTheDocument();
    expect(screen.getByLabelText("To")).toBeInTheDocument();
  });

  it("prepares the expected form fields for a summarize_spending submission", () => {
    const { container } = render(
      <AssistantComposer
        action={async () => ({
          status: "idle",
          message: null,
          reviewState: null,
          latestTransaction: null,
          recentItems: [],
        })}
        initialState={{
          status: "idle",
          message: null,
          reviewState: null,
          latestTransaction: null,
          recentItems: [],
        }}
      />,
    );

    fireEvent.change(screen.getByLabelText("Action"), { target: { value: "summarize_spending" } });
    fireEvent.change(screen.getByLabelText("Intent"), { target: { value: "expense" } });
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-04-01" } });
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-04-30" } });

    const form = container.querySelector("form");
    expect(form).not.toBeNull();

    const formData = new FormData(form!);

    expect(formData.get("toolName")).toBe("summarize_spending");
    expect(formData.get("transactionType")).toBe("expense");
    expect(formData.get("occurredFrom")).toBe("2026-04-01");
    expect(formData.get("occurredTo")).toBe("2026-04-30");
    expect(screen.getByRole("button", { name: "Show recent" })).toBeInTheDocument();
  });
});
