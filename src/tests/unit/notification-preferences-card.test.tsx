import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { NotificationPreferencesCard } from "@/components/notifications/notification-preferences-card";
import { initialNotificationPreferencesActionState } from "@/lib/actions/notifications-state";

const preferences = {
  userId: "user-1",
  dailyReminderEnabled: true,
  monthlyReviewEnabled: false,
  recurringNotificationsEnabled: false,
  limitAlertsEnabled: false,
  overspendingEnabled: true,
  unusualSpendingEnabled: true,
  savingsOpportunitiesEnabled: true,
  createdAt: "2026-05-03T00:00:00.000Z",
  updatedAt: "2026-05-03T00:00:00.000Z",
};

const action = vi.fn(async () => initialNotificationPreferencesActionState);
const registerPushSubscriptionAction = vi.fn(async () => initialNotificationPreferencesActionState);
const originalNotificationDescriptor = Object.getOwnPropertyDescriptor(window, "Notification");

function renderCard(locale = "ro") {
  return render(
    <LocaleProvider savedLocale={locale}>
      <NotificationPreferencesCard
        action={action}
        preferences={preferences}
        registerPushSubscriptionAction={registerPushSubscriptionAction}
      />
    </LocaleProvider>,
  );
}

function setNotificationPermission(permission: NotificationPermission) {
  Object.defineProperty(window, "Notification", {
    configurable: true,
    value: {
      permission,
      requestPermission: vi.fn(async () => permission),
    },
  });
}

function clearNotificationSupport() {
  Object.defineProperty(window, "Notification", {
    configurable: true,
    value: undefined,
  });
  Reflect.deleteProperty(window, "Notification");
}

describe("notification preferences card localization", () => {
  afterEach(() => {
    vi.clearAllMocks();

    if (originalNotificationDescriptor) {
      Object.defineProperty(window, "Notification", originalNotificationDescriptor);
    } else {
      clearNotificationSupport();
    }

    window.localStorage.clear();
  });

  it("renders Romanian permission-denied notification copy", () => {
    setNotificationPermission("denied");

    renderCard("ro");
    fireEvent.click(screen.getByRole("button", { name: /Notificări/ }));

    expect(screen.getByText("Setări notificări")).toBeInTheDocument();
    expect(screen.getByText("Permite aplicației Calm Wallet să trimită mementouri utile.")).toBeInTheDocument();
    expect(screen.getByText("Este necesară permisiunea")).toBeInTheDocument();
    expect(screen.getByText("Deschide setările browserului pentru a permite notificările.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Deschide setările telefonului" })).toBeDisabled();
  });

  it("renders Romanian unsupported-device notification copy", () => {
    clearNotificationSupport();

    renderCard("ro");
    fireEvent.click(screen.getByRole("button", { name: /Notificări/ }));

    expect(screen.getByText("Notificările nu sunt disponibile pe acest dispozitiv.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Activează notificările" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Permite notificările pe acest dispozitiv" })).not.toBeInTheDocument();
  });

  it("renders a distinct device permission action when permission is missing", () => {
    setNotificationPermission("default");

    renderCard("ro");
    fireEvent.click(screen.getByRole("button", { name: /Notificări/ }));

    expect(screen.getByText("Permite acestui dispozitiv să afișeze notificările Calm Wallet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Permite notificările pe acest dispozitiv" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Activează notificările" })).not.toBeInTheDocument();
  });

  it("renders French and Spanish notification keys", () => {
    setNotificationPermission("default");

    const frenchView = renderCard("fr");
    fireEvent.click(screen.getByRole("button", { name: /Notifications/ }));
    expect(screen.getByText("Autorisez Calm Wallet à envoyer des rappels utiles.")).toBeInTheDocument();
    expect(screen.getByText("Paramètres des notifications")).toBeInTheDocument();
    frenchView.unmount();

    const spanishView = renderCard("es");
    fireEvent.click(screen.getByRole("button", { name: /Notificaciones/ }));
    expect(screen.getByText("Permite que Calm Wallet envíe recordatorios útiles.")).toBeInTheDocument();
    expect(screen.getByText("Ajustes de notificaciones")).toBeInTheDocument();
    spanishView.unmount();
  });
});
